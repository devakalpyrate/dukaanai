import unittest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.main import app
from backend.authentication.auth import create_access_token
from backend.security.exceptions import (
    http_exception_handler,
    generic_exception_handler,
    sanitize_public_error_message,
    create_error_response,
)
from backend.security.logger import (
    redact_sensitive_string,
    redact_sensitive_dict,
    StructuredLogFormatter,
)

class TestErrorHandlingSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app, raise_server_exceptions=False)
        cls.test_email = f"audit_owner_{uuid.uuid4().hex[:6]}@dukaan.ai"
        res = cls.client.post("/api/auth/register", json={
            "name": "Audit Owner",
            "email": cls.test_email,
            "password": "StrongSecurity123!",
            "shop_name": "Audit Security Dukaan"
        })
        assert res.status_code == 201, res.text
        cls.auth_data = res.json()
        cls.token = cls.auth_data["access_token"]
        cls.shop_id = cls.auth_data["shop_id"]
        cls.user_id = cls.auth_data["user_id"]

    @classmethod
    def tearDownClass(cls):
        from backend.database.supabase_client import get_supabase
        sb = get_supabase()
        try:
            sb.table("notifications").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("settings").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("shops").delete().eq("id", cls.shop_id).execute()
            sb.table("users").delete().eq("id", cls.user_id).execute()
        except Exception:
            pass

    def test_01_mysql_error_104_sanitization(self):
        mock_req = MagicMock(spec=Request)
        mock_req.url.path = "/api/customers"
        mock_req.method = "GET"
        mock_req.state.correlation_id = "test-corr-database-conn-failed"

        mysql_exc = Exception("pymysql.err.OperationalError: (104, 'Connection to MySQL 127.0.0.1:3306 failed: host unreachable')")
        
        import asyncio
        resp = asyncio.run(generic_exception_handler(mock_req, mysql_exc))
        import json
        body = json.loads(resp.body.decode())

        self.assertEqual(resp.status_code, 500)
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "DATABASE_ERROR")
        self.assertEqual(body["error"]["message"], "Service temporarily unavailable. Please try again later.")
        
        raw_text = resp.body.decode()
        self.assertNotIn("mysql", raw_text.lower())
        self.assertNotIn("104", raw_text)
        self.assertNotIn("3306", raw_text)
        self.assertNotIn("OperationalError", raw_text)
        self.assertNotIn("127.0.0.1", raw_text)

    def test_02_database_constraint_violation_sanitization(self):
        mock_req = MagicMock(spec=Request)
        mock_req.url.path = "/api/products"
        mock_req.method = "POST"
        mock_req.state.correlation_id = "test-corr-constraint"

        constraint_exc = Exception("duplicate key value violates unique constraint 'users_email_key' (23505)")
        
        import asyncio
        resp = asyncio.run(generic_exception_handler(mock_req, constraint_exc))
        import json
        body = json.loads(resp.body.decode())

        self.assertEqual(resp.status_code, 409)
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "CONFLICT")
        self.assertEqual(body["error"]["message"], "Record already exists. Please verify and try again.")
        
        raw_text = resp.body.decode()
        self.assertNotIn("users_email_key", raw_text)
        self.assertNotIn("23505", raw_text)
        self.assertNotIn("violates unique constraint", raw_text)

    def test_03_raw_sql_error_never_exposed(self):
        mock_req = MagicMock(spec=Request)
        mock_req.url.path = "/api/transactions"
        mock_req.method = "GET"
        mock_req.state.correlation_id = "test-corr-sql"

        sql_exc = Exception("SELECT id, password_hash, token FROM users WHERE id=42; syntax error at or near 'password_hash'")
        
        import asyncio
        resp = asyncio.run(generic_exception_handler(mock_req, sql_exc))
        import json
        body = json.loads(resp.body.decode())

        self.assertEqual(resp.status_code, 500)
        self.assertEqual(body["error"]["message"], "Service temporarily unavailable. Please try again later.")
        raw_text = resp.body.decode()
        self.assertNotIn("SELECT", raw_text)
        self.assertNotIn("password_hash", raw_text)
        self.assertNotIn("syntax error", raw_text)

    def test_04_invalid_credentials_sanitized(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": self.test_email,
            "password": "WrongPassword999!"
        })
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["code"], "UNAUTHORIZED")
        self.assertEqual(data["error"]["message"], "Unable to log in. Check your credentials and try again.")
        self.assertNotIn("Traceback", res.text)
        self.assertNotIn("database", res.text.lower())

    def test_05_expired_jwt_sanitized(self):
        expired_token = create_access_token(
            {"sub": self.user_id, "shop_id": self.shop_id, "email": self.test_email},
            expires_in=-3600
        )
        res = self.client.get("/api/customers", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["code"], "UNAUTHORIZED")
        self.assertNotIn("Traceback", res.text)
        self.assertNotIn("Signature has expired", res.text)

    def test_06_unauthorized_and_cross_shop_access(self):
        foreign_shop_token = create_access_token(
            {"sub": 999999, "shop_id": 888888, "email": "foreign_owner@dukaan.ai"}
        )
        res = self.client.get("/api/customers", headers={"Authorization": f"Bearer {foreign_shop_token}"})
        self.assertEqual(res.status_code, 403)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["code"], "FORBIDDEN")
        self.assertNotIn("888888", res.text)
        self.assertNotIn("999999", res.text)
        self.assertNotIn("SELECT", res.text)

    def test_07_groq_bodhan_api_failure_and_timeout(self):
        with patch("app.main.get_grpc_client") as mock_grpc:
            mock_client = MagicMock()
            mock_client.understand_intent.side_effect = Exception("Groq API connection timeout after 25s with api_key=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")
            mock_grpc.return_value = mock_client

            headers = {"Authorization": f"Bearer {self.token}"}
            res = self.client.post(
                "/api/ai/understand-intent",
                headers=headers,
                json={"text": "Ramesh ko 500 rupaye udhar diya", "shop_id": self.shop_id}
            )
            self.assertEqual(res.status_code, 503)
            data = res.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error"]["code"], "SERVICE_UNAVAILABLE")
            self.assertEqual(data["error"]["message"], "Service temporarily unavailable. Please try again later.")
            
            raw = res.text
            self.assertNotIn("gsk_", raw)
            self.assertNotIn("Groq", raw)
            self.assertNotIn("timeout", raw.lower())
            self.assertNotIn("api_key", raw)

    def test_08_stt_tts_failures_sanitized(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        
        with patch("app.main.transcribe_audio") as mock_trans:
            mock_trans.side_effect = Exception("HuggingFace STT authentication failed for token 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: 401 Client Error")
            
            fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
            res = self.client.post(
                "/api/voice/transcribe",
                headers=headers,
                files={"file": ("voice.wav", fake_wav, "audio/wav")}
            )
            self.assertEqual(res.status_code, 500)
            data = res.json()
            self.assertFalse(data["success"])
            self.assertEqual(data["error"]["code"], "VOICE_PROCESSING_ERROR")
            self.assertEqual(data["error"]["message"], "Unable to process your voice request. Please try again.")
            
            raw = res.text
            self.assertNotIn("hf_", raw)
            self.assertNotIn("HuggingFace", raw)
            self.assertNotIn("token", raw.lower())

        with patch("app.models.tts.synthesize_speech") as mock_tts:
            mock_tts.side_effect = Exception("IndicF5 TTS model inference failure on GPU device cuda:0")
            res_tts = self.client.post(
                "/api/voice/speak",
                headers=headers,
                json={"text": "Ramesh ji ka 500 rupaye jama ho gaya"}
            )
            self.assertEqual(res_tts.status_code, 500)
            data_tts = res_tts.json()
            self.assertEqual(data_tts["error"]["message"], "Unable to process your voice request. Please try again.")
            self.assertNotIn("cuda:0", res_tts.text)
            self.assertNotIn("IndicF5", res_tts.text)

    def test_09_invalid_and_oversized_audio_upload(self):
        headers = {"Authorization": f"Bearer {self.token}"}

        malicious_file = {"file": ("exploit.exe", b"\x4d\x5a\x90\x00", "application/x-msdownload")}
        res_exe = self.client.post("/api/voice/transcribe", headers=headers, files=malicious_file)
        self.assertEqual(res_exe.status_code, 400)
        self.assertFalse(res_exe.json()["success"])
        self.assertNotIn("Traceback", res_exe.text)

        corrupt_audio = {"file": ("empty.wav", b"", "audio/wav")}
        res_empty = self.client.post("/api/voice/transcribe", headers=headers, files=corrupt_audio)
        self.assertEqual(res_empty.status_code, 400)
        self.assertIn("Uploaded audio file is empty", res_empty.json()["error"]["message"])

    def test_10_unexpected_python_exception_sanitized(self):
        mock_req = MagicMock(spec=Request)
        mock_req.url.path = "/api/action/execute"
        mock_req.method = "POST"
        mock_req.state.correlation_id = "test-corr-unexpected"

        unexpected_exc = ZeroDivisionError("division by zero at line 142 in /var/app/internal/billing_engine.py")
        
        import asyncio
        resp = asyncio.run(generic_exception_handler(mock_req, unexpected_exc))
        import json
        body = json.loads(resp.body.decode())

        self.assertEqual(resp.status_code, 500)
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "INTERNAL_SERVER_ERROR")
        self.assertEqual(body["error"]["message"], "Service temporarily unavailable. Please try again later.")
        
        raw_text = resp.body.decode()
        self.assertNotIn("ZeroDivisionError", raw_text)
        self.assertNotIn("division by zero", raw_text)
        self.assertNotIn("/var/app", raw_text)
        self.assertNotIn(".py", raw_text)

    def test_11_validation_failures_and_field_redaction(self):
        res = self.client.post("/api/auth/register", json={
            "name": "A",
            "email": "not-an-email",
            "password": "short",
            "shop_name": "S"
        })
        self.assertEqual(res.status_code, 422)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(data["error"]["message"], "Invalid request payload format.")
        self.assertIn("details", data["error"])
        self.assertTrue(len(data["error"]["details"]) > 0)
        self.assertNotIn("Traceback", res.text)
        self.assertNotIn("short", res.text)

    def test_12_logger_redaction_guarantees(self):
        raw_token_str = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEyM30.signature_hash_value"
        sanitized_str = redact_sensitive_string(raw_token_str)
        self.assertNotIn("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", sanitized_str)
        self.assertIn("Bearer [REDACTED]", sanitized_str)

        raw_api_key_str = "Connecting with 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 and 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"
        sanitized_api = redact_sensitive_string(raw_api_key_str)
        self.assertNotIn("60RUPiBWK35jV70tXeu4WGdyb3FYyG4ozvYiZRcH71WtbqAAcyyG", sanitized_api)
        self.assertNotIn("ftRemrozYsFrSxSNHVLpxQBWxunKnZAgab", sanitized_api)

        dict_with_secrets = {
            "password": "plain_secret_password",
            "api_key": "secret_key_123",
            "normal_data": "store_customer_name"
        }
        redacted_dict = redact_sensitive_dict(dict_with_secrets)
        self.assertEqual(redacted_dict["password"], "[REDACTED]")
        self.assertEqual(redacted_dict["api_key"], "[REDACTED]")
        self.assertEqual(redacted_dict["normal_data"], "store_customer_name")

    def test_13_debug_mode_disabled(self):
        self.assertFalse(app.debug)

if __name__ == "__main__":
    unittest.main()
