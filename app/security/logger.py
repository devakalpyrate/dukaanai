import json
import logging
import re
from typing import Any, Dict

SENSITIVE_KEY_PATTERNS = [
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"pwd", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"authorization", re.IGNORECASE),
    re.compile(r"api_key", re.IGNORECASE),
    re.compile(r"apikey", re.IGNORECASE),
    re.compile(r"\bkey\b", re.IGNORECASE),
    re.compile(r"otp", re.IGNORECASE),
    re.compile(r"pin", re.IGNORECASE),
    re.compile(r"credential", re.IGNORECASE),
    re.compile(r"cookie", re.IGNORECASE),
]

JWT_REGEX = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")
BEARER_REGEX = re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]+", re.IGNORECASE)
API_KEY_REGEX = re.compile(r"(gsk_|hf_|sb_publishable_|sb_secret_)[A-Za-z0-9_\-]+", re.IGNORECASE)
EMBEDDED_PASSWD_REGEX = re.compile(r"(password|pwd|pin|otp|secret)=([^\s&]+)", re.IGNORECASE)

def redact_sensitive_string(text: str) -> str:
    if not isinstance(text, str):
        return text
    text = BEARER_REGEX.sub("Bearer [REDACTED]", text)
    text = JWT_REGEX.sub("[REDACTED_JWT]", text)
    text = API_KEY_REGEX.sub(r"\1[REDACTED]", text)
    text = EMBEDDED_PASSWD_REGEX.sub(r"\1=[REDACTED]", text)
    return text

def redact_sensitive_dict(data: Any) -> Any:
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(p.search(str(k)) for p in SENSITIVE_KEY_PATTERNS):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, (dict, list)):
                sanitized[k] = redact_sensitive_dict(v)
            elif isinstance(v, str):
                sanitized[k] = redact_sensitive_string(v)
            else:
                sanitized[k] = v
        return sanitized
    elif isinstance(data, list):
        return [redact_sensitive_dict(item) for item in data]
    elif isinstance(data, str):
        return redact_sensitive_string(data)
    return data

class StructuredLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        try:
            raw_msg = record.getMessage()
            safe_msg = redact_sensitive_string(raw_msg)
            log_obj: Dict[str, Any] = {
                "timestamp": self.formatTime(record, self.datefmt),
                "level": record.levelname,
                "logger": record.name,
                "message": safe_msg,
            }
            if hasattr(record, "correlation_id") and getattr(record, "correlation_id"):
                log_obj["correlation_id"] = getattr(record, "correlation_id")
            if hasattr(record, "user_id") and getattr(record, "user_id"):
                log_obj["user_id"] = getattr(record, "user_id")
            if hasattr(record, "shop_id") and getattr(record, "shop_id"):
                log_obj["shop_id"] = getattr(record, "shop_id")
            if hasattr(record, "endpoint") and getattr(record, "endpoint"):
                log_obj["endpoint"] = getattr(record, "endpoint")
            if hasattr(record, "method") and getattr(record, "method"):
                log_obj["method"] = getattr(record, "method")
            if hasattr(record, "status_code") and getattr(record, "status_code"):
                log_obj["status_code"] = getattr(record, "status_code")
            if record.exc_info:
                exc_type = record.exc_info[0].__name__ if record.exc_info[0] else "Exception"
                log_obj["exception_type"] = exc_type
                formatted_exc = self.formatException(record.exc_info)
                log_obj["exception"] = redact_sensitive_string(formatted_exc)
            return json.dumps(log_obj, ensure_ascii=False)
        except Exception:
            return f"[{record.levelname}] {record.name}: {record.getMessage()}"
