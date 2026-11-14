from dataclasses import dataclass
import json
import logging
import os
from pathlib import Path
import time
from typing import Any

import requests
import soundfile as sf
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

@dataclass
class TranscriptionResult:
    text: str
    inference_time_sec: float
    audio_duration_sec: float | None = None
    real_time_factor: float | None = None
    device: str = "cloud-api"

def get_device() -> str:
    return "cloud-api"

def load_model(model_id: str = "") -> Any:
    return None

def get_model_info() -> dict[str, Any]:
    api_key = (
        os.getenv("BANDHON_AI_STT_API_KEY")
        or os.getenv("BANDHON_AI_STT_KEY")
        or os.getenv("BANDHON_AI_API_KEY")
        or os.getenv("BODHAN_API_KEY")
    )
    return {
        "model_id": "indic-transcribe",
        "provider": "bandhon.ai",
        "is_loaded": True,
        "device": "cloud-api",
        "has_api_key": bool(api_key),
    }

def transcribe_audio(audio_path: str | Path, language: str = "hi") -> TranscriptionResult:
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path.resolve()}")

    try:
        info = sf.info(str(path))
        audio_duration = float(info.duration)
    except Exception as exc:
        logger.warning("Could not read audio metadata for %s: %s", path, exc)
        audio_duration = None

    api_key = (
        os.getenv("BANDHON_AI_STT_API_KEY")
        or os.getenv("BANDHON_AI_STT_KEY")
        or os.getenv("BANDHON_AI_API_KEY")
        or os.getenv("BODHAN_API_KEY")
    )
    stt_url = (
        os.getenv("BANDHON_AI_STT_URL")
        or "https://api.bodhan.ai/v1/audio/transcriptions"
    )

    if not api_key:
        error_msg = (
            "Speech-to-Text API key is missing. "
            "Please set BANDHON_AI_STT_API_KEY in your .env file."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    start_time = time.perf_counter()

    try:
        with open(path, "rb") as f:
            resp = requests.post(
                stt_url,
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": f},
                data={"model": "indic-transcribe", "language": language or "hi", "vad": True},
                timeout=30,
            )

        if resp.status_code == 200:
            resp_data = resp.json()
            text = (resp_data.get("text") or "").strip()
            inf_time = round(time.perf_counter() - start_time, 3)
            rtf = (
                round(inf_time / audio_duration, 3)
                if audio_duration and audio_duration > 0
                else None
            )
            return TranscriptionResult(
                text=text,
                inference_time_sec=inf_time,
                audio_duration_sec=round(audio_duration, 2) if audio_duration else None,
                real_time_factor=rtf,
                device="cloud-bandhon-stt",
            )
        else:
            logger.error("Bandhon STT returned error code %d: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Bandhon STT API error ({resp.status_code}): {resp.text}")

    except Exception as exc:
        logger.error("Transcription failed via Bandhon STT: %s", exc)
        raise RuntimeError(f"Transcription failed: {exc}") from exc
