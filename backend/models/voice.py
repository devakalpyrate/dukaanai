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
    bodhan_key = (
        os.getenv("BANDHON_AI_STT_API_KEY")
        or os.getenv("BANDHON_AI_STT_KEY")
        or os.getenv("BANDHON_AI_API_KEY")
        or os.getenv("BODHAN_API_KEY")
    )
    sarvam_key = os.getenv("SARVAM_API_KEY", "")
    has_keys = bool(bodhan_key or sarvam_key)
    provider = "bodhan.ai + sarvam.ai" if (bodhan_key and sarvam_key) else ("bodhan.ai" if bodhan_key else "sarvam.ai")
    return {
        "model_id": "indic-transcribe / saarika:v2.5",
        "provider": provider,
        "is_loaded": True,
        "device": "cloud-api",
        "has_api_key": has_keys,
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
    try:
        sz = path.stat().st_size
        if sz > 0:
            return round(sz / 32000.0, 2)
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

def transcribe_audio(audio_path: str | Path, language: str = None) -> TranscriptionResult:
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
    sarvam_key = os.getenv("SARVAM_API_KEY", "")

    if not bodhan_api_key and not sarvam_key:
        error_msg = (
            "Voice STT API key is missing. "
            "Please ensure BANDHON_AI_STT_API_KEY or SARVAM_API_KEY is configured in your .env or Vercel environment."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    lang_code = (language or "auto").strip().lower()
    target_lang = None
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
        target_lang = None
    else:
        target_lang = lang_code

    audio_duration = get_audio_duration(path)
    start_time = time.perf_counter()

    if bodhan_api_key:
        try:
            data_payload: dict[str, Any] = {"model": "indic-transcribe", "vad": True}
            if target_lang and target_lang not in ("auto", "all", ""):
                data_payload["language"] = target_lang

            with open(path, "rb") as f:
                resp = requests.post(
                    stt_url,
                    headers={"Authorization": f"Bearer {bodhan_api_key}"},
                    files={"file": (path.name, f, "audio/wav")},
                    data=data_payload,
                    timeout=25,
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
                logger.warning(
                    "Bodhan STT returned error code %d (%s). Falling back to Sarvam AI STT...",
                    resp.status_code,
                    resp.text[:200],
                )
        except Exception as exc:
            logger.warning("Bodhan STT attempt failed (%s). Falling back to Sarvam AI STT...", exc)

    if sarvam_key:
        try:
            sarvam_lang_map = {
                "hi": "hi-IN",
                "ta": "ta-IN",
                "or": "or-IN",
                "te": "te-IN",
                "bn": "bn-IN",
                "mr": "mr-IN",
                "gu": "gu-IN",
                "en": "en-IN",
            }
            s_payload = {"model": "saarika:v2.5"}
            if target_lang and target_lang in sarvam_lang_map:
                s_payload["language_code"] = sarvam_lang_map[target_lang]

            with open(path, "rb") as f:
                sarvam_resp = requests.post(
                    "https://api.sarvam.ai/speech-to-text",
                    headers={"api-subscription-key": sarvam_key},
                    files={"file": (path.name, f, "audio/wav")},
                    data=s_payload,
                    timeout=25,
                )

            if sarvam_resp.status_code == 200:
                s_data = sarvam_resp.json()
                text = (s_data.get("transcript") or "").strip()
                if is_hallucinated_text(text):
                    logger.info("Ignoring Sarvam STT hallucination text: '%s'", text)
                    text = ""
                inf_time = round(time.perf_counter() - start_time, 3)
                rtf = (
                    round(inf_time / audio_duration, 3)
                    if audio_duration and audio_duration > 0
                    else None
                )
                logger.info("Successfully transcribed via Sarvam AI STT fallback: '%s'", text)
                return TranscriptionResult(
                    text=text,
                    inference_time_sec=inf_time,
                    audio_duration_sec=round(audio_duration, 2) if audio_duration else None,
                    real_time_factor=rtf,
                    device="cloud-sarvam-stt",
                )
            else:
                logger.error("Sarvam STT returned error code %d: %s", sarvam_resp.status_code, sarvam_resp.text)
                raise RuntimeError(f"Sarvam STT API error ({sarvam_resp.status_code}): {sarvam_resp.text}")
        except Exception as s_exc:
            logger.error("Sarvam STT fallback also failed: %s", s_exc)
            raise RuntimeError(f"All STT providers failed. Last error: {s_exc}") from s_exc

    raise RuntimeError("Transcription failed: No responsive STT provider available.")
