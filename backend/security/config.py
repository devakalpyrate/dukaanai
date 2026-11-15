import os
from typing import Any, Dict

DEFAULT_RATE_LIMITS: Dict[str, Dict[str, int]] = {
    "login": {"max_requests": 5, "window_sec": 900},
    "transcribe": {"max_requests": 10, "window_sec": 60},
    "intent": {"max_requests": 30, "window_sec": 60},
    "execute": {"max_requests": 20, "window_sec": 60},
    "lookup": {"max_requests": 60, "window_sec": 60},
    "global_ip": {"max_requests": 120, "window_sec": 60},
}

MAX_CONCURRENT_VOICE_PER_USER: int = int(os.getenv("MAX_CONCURRENT_VOICE_PER_USER", "2"))
MAX_AUDIO_UPLOAD_BYTES: int = int(os.getenv("MAX_AUDIO_UPLOAD_BYTES", str(25 * 1024 * 1024)))
MAX_AUDIO_DURATION_SEC: float = float(os.getenv("MAX_AUDIO_DURATION_SEC", "60.0"))

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac", ".webm", ".weba"}
ALLOWED_AUDIO_MIME_TYPES = {
    "audio/wav", "audio/x-wav", "audio/wave",
    "audio/mpeg", "audio/mp3",
    "audio/ogg", "application/ogg",
    "audio/flac", "audio/x-flac",
    "audio/m4a", "audio/x-m4a", "audio/mp4",
    "audio/aac", "audio/x-aac",
    "audio/webm",
}

GROQ_TIMEOUT_SEC: float = float(os.getenv("GROQ_TIMEOUT_SEC", "15.0"))
GROQ_MAX_RETRIES: int = int(os.getenv("GROQ_MAX_RETRIES", "2"))

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:5173,http://localhost:5173").split(",")
    if origin.strip()
]
