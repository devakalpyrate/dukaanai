import logging
import os
import json
import re
import struct
import tempfile
import time
import wave
import requests
from dotenv import load_dotenv
from pathlib import Path
from backend.services.language_detection import detect_language

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

def sanitize_tts_text(text: str, lang: str = None) -> str:
    if not text:
        return ""
    
    det = lang or detect_language(text)
    if det in ("ta", "ta-latn") or any(0x0B80 <= ord(c) <= 0x0BFF for c in text):
        curr_word = "ரூபாய்"
    elif det in ("or", "or-latn") or any(0x0B00 <= ord(c) <= 0x0B7F for c in text):
        curr_word = "ଟଙ୍କା"
    else:
        curr_word = "रुपये"

    def clean_curr(match):
        val = match.group(1).replace(",", "")
        return f"{val} {curr_word}"

    cleaned = re.sub(r'(?:₹|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d+)?)', clean_curr, text, flags=re.IGNORECASE)
    cleaned = re.sub(r'[*_`#~]', '', cleaned)
    cleaned = cleaned.replace("::", " ").replace("->", " ")
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if len(cleaned) > 280:
        cut = cleaned[:280]
        last_punct = max(cut.rfind('.'), cut.rfind('।'), cut.rfind('?'), cut.rfind('!'))
        if last_punct > 150:
            cleaned = cut[:last_punct + 1]
        else:
            cleaned = cut
    return cleaned

def generate_fallback_silence_wav(output_path: str, duration_sec: float = 0.5) -> str:
    sample_rate = 24000
    num_samples = int(sample_rate * duration_sec)
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack(f"<{num_samples}h", *([0] * num_samples)))
    return output_path

def synthesize_speech(
    text: str,
    output_path: str = None,
    voice: str = "Amit",
    lang: str = None
) -> str:
    if not output_path:
        fd, output_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

    clean_text = sanitize_tts_text(text, lang=lang)
    if not clean_text:
        return generate_fallback_silence_wav(output_path)

    api_key = (
        os.getenv("BANDHON_AI_TTS_API_KEY")
        or os.getenv("BANDHON_AI_TTS_KEY")
        or os.getenv("BANDHON_AI_API_KEY")
        or os.getenv("BODHAN_API_KEY")
        or "sk-FTpEsbROGh6KAL0SVKg2tg"
    )

    tts_url = (
        os.getenv("BANDHON_AI_TTS_URL")
        or "https://api.bodhan.ai/v1/audio/speech"
    )

    if any(0x0B80 <= ord(c) <= 0x0BFF for c in clean_text):
        target_lang = "ta"
    elif any(0x0B00 <= ord(c) <= 0x0B7F for c in clean_text):
        target_lang = "or"
    elif any(0x0900 <= ord(c) <= 0x097F for c in clean_text):
        target_lang = "hi"
    elif lang and lang.strip().lower() not in ("auto", "none", ""):
        target_lang = lang.strip().lower()
        if target_lang in ("odia", "or-latn"):
            target_lang = "or"
        elif target_lang in ("tamil", "ta-latn"):
            target_lang = "ta"
        elif target_lang in ("hindi", "hi-latn"):
            target_lang = "hi"
    else:
        det = detect_language(clean_text)
        if det in ("hi", "hi-latn"):
            target_lang = "hi"
        elif det in ("or", "or-latn"):
            target_lang = "or"
        elif det in ("ta", "ta-latn"):
            target_lang = "ta"
        elif det in ("en", "pa", "bn", "gu", "mr", "te", "kn", "ml"):
            target_lang = det.split("-")[0]
        else:
            target_lang = "hi"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "indic-speak",
        "input": clean_text,
        "voice": voice,
        "instructions": json.dumps({"lang": target_lang})
    }

    max_retries = 2
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(
                tts_url,
                headers=headers,
                json=payload,
                timeout=18
            )
            if resp.status_code == 200 and len(resp.content) > 100:
                with open(output_path, "wb") as f:
                    f.write(resp.content)
                return output_path
            else:
                logger.warning("Bodhan TTS attempt %d returned %s: %s", attempt, resp.status_code, resp.text[:100] if resp.text else "")
        except Exception as err:
            logger.warning("Bodhan TTS attempt %d failed: %s", attempt, err)

        if attempt < max_retries:
            time.sleep(0.5)

    logger.error("Bodhan TTS failed all attempts for text: '%s'. Raising for fallback.", clean_text[:50])
    raise RuntimeError(f"Bodhan TTS failed for text: '{clean_text[:50]}'")
