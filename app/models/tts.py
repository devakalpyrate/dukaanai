import os
import json
import tempfile
import requests
from dotenv import load_dotenv
from pathlib import Path
from app.services.language_detection import detect_language

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

def synthesize_speech(
    text: str,
    output_path: str = None,
    voice: str = "Amit",
    lang: str = None
) -> str:
    if not output_path:
        fd, output_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

    api_key = os.getenv("BODHAN_API_KEY")
    if not api_key:
        api_key = "sk-FTpEsbROGh6KAL0SVKg2tg"

    if not lang:
        det = detect_language(text)
        if det in ("hi", "hi-latn"):
            target_lang = "hi"
        elif det in ("or", "en", "pa", "bn", "gu", "mr", "ta", "te", "kn", "ml"):
            target_lang = det
        else:
            target_lang = "hi"
    else:
        target_lang = lang

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "indic-speak",
        "input": text,
        "voice": voice,
        "instructions": json.dumps({"lang": target_lang})
    }

    resp = requests.post(
        "https://api.bodhan.ai/v1/audio/speech",
        headers=headers,
        json=payload,
        timeout=30
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Bodhan TTS failed with code {resp.status_code}: {resp.text}")

    with open(output_path, "wb") as f:
        f.write(resp.content)
    return output_path
