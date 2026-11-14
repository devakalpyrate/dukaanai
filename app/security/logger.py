import json
import logging
import re
from typing import Any, Dict

SENSITIVE_KEY_PATTERNS = [
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"authorization", re.IGNORECASE),
    re.compile(r"api_key", re.IGNORECASE),
]

def redact_sensitive_dict(data: Any) -> Any:
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(p.search(str(k)) for p in SENSITIVE_KEY_PATTERNS):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, (dict, list)):
                sanitized[k] = redact_sensitive_dict(v)
            else:
                sanitized[k] = v
        return sanitized
    elif isinstance(data, list):
        return [redact_sensitive_dict(item) for item in data]
    return data

class StructuredLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "correlation_id") and getattr(record, "correlation_id"):
            log_obj["correlation_id"] = getattr(record, "correlation_id")
        if hasattr(record, "user_id") and getattr(record, "user_id"):
            log_obj["user_id"] = getattr(record, "user_id")
        if hasattr(record, "shop_id") and getattr(record, "shop_id"):
            log_obj["shop_id"] = getattr(record, "shop_id")
        if hasattr(record, "endpoint") and getattr(record, "endpoint"):
            log_obj["endpoint"] = getattr(record, "endpoint")
        if hasattr(record, "status_code") and getattr(record, "status_code"):
            log_obj["status_code"] = getattr(record, "status_code")
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj, ensure_ascii=False)
