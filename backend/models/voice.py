from dataclasses import dataclass
import logging
import os
from pathlib import Path
import time
from typing import Any

import requests
import wave
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
        "provider": "bodhan.ai",
        "is_loaded": True,
        "device": "cloud-api",
        "has_api_key": bool(api_key),
    }

def get_audio_duration(audio_path: str | Path) -> float | None:
    path = Path(audio_path)
    try:
        with wave.open(str(path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate > 0:
                return float(frames) / float(rate)
    except Exception:
        pass
    try:
        import soundfile as sf
        info = sf.info(str(path))
        return float(info.duration)
    except Exception:
        pass
    return None

WHISPER_HALLUCINATIONS = {
    "", ".", "..", "...", "?", "!", "-", "--",
    "null", "undefined", "silence", "[silence]", "[music]", "[applause]",
    "thank you", "thank you.", "thank you very much.", "thanks", "thanks.",
    "you", "you.", "bye", "goodbye", "subtitles by", "subtitles",
    "amara.org", "mbc", "ha", "haan", "haan ji", "haanji", "hmm", "um", "uh",
    "ok", "okay", "yes", "no", "so", "k", "yeah",
    "हाँ", "हाँ।", "हां", "हाँ जी", "हाँजी", "हो", "नमस्ते", "हेलो",
    "चलो", "ठीक है", "बाय", "शुक्रिया", "धन्यवाद", "धन्यवाद।", "जी", "जी हाँ", "जी हां",
    "சரி", "வணக்கம்", "நன்றி", "வணக்கம்.", "ஆமாம்", "ம்", "ஹும்",
    "ଆଜ୍ଞା", "ଧନ୍ୟବାଦ", "ନମସ୍କାର", "ହୁଁ"
}

def is_hallucinated_text(text: str) -> bool:
    if not text:
        return True
    cleaned = text.strip().lower()
    if cleaned in WHISPER_HALLUCINATIONS or len(cleaned) < 2:
        return True
    if not any(c.isalnum() for c in cleaned):
        return True
    return False

def transcribe_audio(audio_path: str | Path, language: str = "hi") -> TranscriptionResult:
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path.resolve()}")

    if path.stat().st_size < 100:
        return TranscriptionResult(
            text="",
            inference_time_sec=0.0,
            audio_duration_sec=0.0,
            real_time_factor=0.0,
            device="local-empty-filter",
        )

    bodhan_api_key = (
        os.getenv("BANDHON_AI_STT_API_KEY")
        or os.getenv("BANDHON_AI_STT_KEY")
        or os.getenv("BANDHON_AI_API_KEY")
        or os.getenv("BODHAN_API_KEY")
    )
    stt_url = (
        os.getenv("BANDHON_AI_STT_URL")
        or "https://api.bodhan.ai/v1/audio/transcriptions"
    )

    if not bodhan_api_key:
        error_msg = (
            "Bodhan AI STT API key is missing. "
            "Please ensure BANDHON_AI_STT_API_KEY or BODHAN_API_KEY is configured in your .env file."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    lang_code = (language or "auto").strip().lower()
    if lang_code in ("tamil", "ta", "tam"):
        target_lang = "ta"
    elif lang_code in ("odia", "or", "od"):
        target_lang = "or"
    elif lang_code in ("telugu", "te"):
        target_lang = "te"
    elif lang_code in ("bengali", "bn"):
        target_lang = "bn"
    elif lang_code in ("marathi", "mr"):
        target_lang = "mr"
    elif lang_code in ("gujarati", "gu"):
        target_lang = "gu"
    elif lang_code in ("english", "en"):
        target_lang = "en"
    elif lang_code in ("hindi", "hi"):
        target_lang = "hi"
    elif lang_code in ("auto", "all", ""):
        target_lang = "auto"
    else:
        target_lang = lang_code

    audio_duration = get_audio_duration(path)
    start_time = time.perf_counter()

    try:
        with open(path, "rb") as f:
            resp = requests.post(
                stt_url,
                headers={"Authorization": f"Bearer {bodhan_api_key}"},
                files={"file": f},
                data={"model": "indic-transcribe", "language": target_lang, "vad": True},
                timeout=30,
            )

        if resp.status_code == 200:
            resp_data = resp.json()
            text = (resp_data.get("text") or "").strip()
            if is_hallucinated_text(text):
                logger.info("Ignoring Bodhan STT hallucination text: '%s'", text)
                text = ""
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
                device="cloud-bodhan-stt",
            )
        else:
            logger.error("Bodhan STT returned error code %d: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Bodhan STT API error ({resp.status_code}): {resp.text}")

    except Exception as exc:
        logger.error("Transcription failed via Bodhan STT: %s", exc)
        raise RuntimeError(f"Transcription failed: {exc}") from exc
