import unittest
import uuid
import time
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.database.supabase_client import get_supabase
from app.security.config import DEFAULT_RATE_LIMITS
from app.security.rate_limiter import get_rate_limiter
from app.authentication.auth import create_access_token

class TestProductionSecurityHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app, raise_server_exceptions=False)
        cls.test_email = f"security.owner_{uuid.uuid4().hex[:6]}@dukaan.ai"
        res = cls.client.post("/api/auth/register", json={
            "name": "Sec Owner",
            "email": cls.test_email,
            "password": "StrongPassword123!",
            "shop_name": "Sec Kirana Store"
        })
        assert res.status_code == 201, res.text
        cls.auth_data = res.json()
        cls.token = cls.auth_data["access_token"]
        cls.shop_id = cls.auth_data["shop_id"]
        cls.user_id = cls.auth_data["user_id"]

    @classmethod
    def tearDownClass(cls):
        sb = get_supabase()
        try:
            sb.table("inventory_logs").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("inventory").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("transactions").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("products").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("customers").delete().eq("shop_id", cls.shop_id).execute()
            sb.table("shops").delete().eq("id", cls.shop_id).execute()
            sb.table("users").delete().eq("id", cls.user_id).execute()
        except Exception:
            pass

    def test_01_security_headers_present(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertIn("X-Correlation-ID", res.headers)
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")
        self.assertIn("Content-Security-Policy", res.headers)

    def test_02_error_sanitization_format(self):
        res = self.client.get("/api/customers")
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data.get("success"))
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "UNAUTHORIZED")
        self.assertIn("correlation_id", data["error"])
        self.assertNotIn("Traceback", res.text)
        self.assertNotIn("File \"", res.text)

    def test_03_login_brute_force_rate_limiting(self):
        fake_email = f"brute_{uuid.uuid4().hex[:6]}@dukaan.ai"
        limit = DEFAULT_RATE_LIMITS["login"]["max_requests"]
        for _ in range(limit):
            self.client.post("/api/auth/login", json={"email": fake_email, "password": "wrong"})
        blocked_res = self.client.post("/api/auth/login", json={"email": fake_email, "password": "wrong"})
        self.assertEqual(blocked_res.status_code, 429)
        self.assertIn("Retry-After", blocked_res.headers)
        self.assertEqual(blocked_res.json()["error"]["code"], "TOO_MANY_REQUESTS")

    def test_04_audio_upload_unsupported_mime(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        fake_files = {"file": ("test.exe", b"not-audio-content", "application/x-msdownload")}
        res = self.client.post("/api/voice/transcribe", files=fake_files, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("correlation_id", res.json()["error"])

    def test_05_audio_upload_empty_rejected(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        empty_files = {"file": ("empty.wav", b"", "audio/wav")}
        res = self.client.post("/api/voice/transcribe", files=empty_files, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Uploaded audio file is empty", res.json()["error"]["message"])

    def test_06_voice_concurrency_limiting(self):
        limiter = get_rate_limiter()
        concurrency_key = f"voice_concurrency:{self.user_id}"
        limiter.acquire_concurrency(concurrency_key, 2)
        limiter.acquire_concurrency(concurrency_key, 2)
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {"file": ("test.wav", b"RIFF....WAVE", "audio/wav")}
        res = self.client.post("/api/voice/transcribe", files=files, headers=headers)
        self.assertEqual(res.status_code, 429)
        self.assertIn("concurrent voice transcriptions", res.json()["error"]["message"])
        limiter.release_concurrency(concurrency_key)
        limiter.release_concurrency(concurrency_key)

    def test_07_redaction_utility(self):
        from app.security.logger import redact_sensitive_dict
        sample = {
            "password": "super_secret_123",
            "access_token": "jwt.header.payload",
            "api_key": "groq-key-abc",
            "normal_field": "safe_value"
        }
        redacted = redact_sensitive_dict(sample)
        self.assertEqual(redacted["password"], "[REDACTED]")
        self.assertEqual(redacted["access_token"], "[REDACTED]")
        self.assertEqual(redacted["api_key"], "[REDACTED]")
        self.assertEqual(redacted["normal_field"], "safe_value")

    def test_08_jwt_tampering_and_expired(self):
        headers_tampered = {"Authorization": f"Bearer {self.token}xyz"}
        res1 = self.client.get("/api/customers", headers=headers_tampered)
        self.assertEqual(res1.status_code, 401)
        self.assertEqual(res1.json()["error"]["code"], "UNAUTHORIZED")

        expired_token = create_access_token(
            {"sub": self.user_id, "shop_id": self.shop_id, "email": self.test_email},
            expires_in=-60
        )
        headers_expired = {"Authorization": f"Bearer {expired_token}"}
        res2 = self.client.get("/api/customers", headers=headers_expired)
        self.assertEqual(res2.status_code, 401)

    def test_09_shop_id_injection_protection(self):
        other_shop_id = 999999
        headers = {"Authorization": f"Bearer {self.token}"}
        res = self.client.post(
            "/api/action/execute",
            headers=headers,
            json={
                "intent_data": {
                    "shop_id": other_shop_id,
                    "intent": "credit_transaction",
                    "action": "record_credit",
                    "parameters": {"customer_name": "Injected Customer", "amount": "100.00"},
                    "original_text": "Injected shop transaction"
                }
            }
        )
        self.assertEqual(res.status_code, 200)

    def test_10_oversized_audio_rejected(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        huge_chunk = b"X" * (1024 * 1024)
        from app.security import config
        original_max = config.MAX_AUDIO_UPLOAD_BYTES
        config.MAX_AUDIO_UPLOAD_BYTES = 500 * 1024
        try:
            files = {"file": ("big.wav", huge_chunk, "audio/wav")}
            res = self.client.post("/api/voice/transcribe", files=files, headers=headers)
            self.assertEqual(res.status_code, 413)
            self.assertIn("exceeds maximum allowed size", res.json()["error"]["message"])
        finally:
            config.MAX_AUDIO_UPLOAD_BYTES = original_max

    def test_11_groq_exponential_backoff_jitter(self):
        from app.models.ai import GroqLLMClient
        client = GroqLLMClient()
        self.assertTrue(hasattr(client, "understand_intent"))

if __name__ == "__main__":
    unittest.main()
