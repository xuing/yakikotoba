"""Generate Japanese pronunciation audio with Gemini 3.8 Flash-Lite TTS (REST API).

Setup (once): put your key in <project>/.env   →   GEMINI_API_KEY=xxxx
  python tools/gen_tts.py                       # items without audio
  python tools/gen_tts.py --only words.jo --force
  python tools/gen_tts.py --voice Kore --model gemini-3.8-flash-tts

Text read aloud: item["tts"] if present, otherwise item["kana"].
Gemini 3.8 TTS reads the text literally, so speaking instructions go in
speech_metadata.style, never in the text itself.
"""
import argparse
import base64
import json
import os
import sys
import time
import wave
from io import BytesIO

import requests

from common import AUDIO, all_items, load_env

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
STYLE = ("Natural standard Japanese (Tokyo accent). Slow, clear and friendly, "
         "like a teacher pronouncing a vocabulary word for a learner.")


def synth(key, model, voice, text):
    body = {
        "contents": [{"parts": [{"text": text, "speech_metadata": {"style": STYLE}}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    r = requests.post(API.format(model=model), json=body, timeout=60,
                      headers={"x-goog-api-key": key, "Content-Type": "application/json"})
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:300]}")
    part = r.json()["candidates"][0]["content"]["parts"][0]
    blob = part.get("inlineData") or part.get("inline_data")
    return base64.b64decode(blob["data"]), (blob.get("mimeType") or blob.get("mime_type") or "")


def to_wav(data, mime):
    """3.8 TTS returns WAV by default; older models return raw 24 kHz PCM."""
    if data[:4] == b"RIFF" or "wav" in mime:
        return data
    buf = BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(data)
    return buf.getvalue()


def write_manifest():
    ids = sorted(p.stem for p in AUDIO.glob("*.wav"))
    (AUDIO / "manifest.json").write_text(json.dumps(ids, ensure_ascii=False, indent=0), encoding="utf-8")
    return len(ids)


def main():
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="item ids to generate")
    ap.add_argument("--force", action="store_true", help="overwrite existing audio")
    ap.add_argument("--model", default=os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts"))
    ap.add_argument("--voice", default=os.environ.get("GEMINI_TTS_VOICE", "Kore"))
    ap.add_argument("--manifest-only", action="store_true", help="just rebuild manifest.json")
    args = ap.parse_args()

    AUDIO.mkdir(parents=True, exist_ok=True)
    if args.manifest_only:
        print(f"manifest: {write_manifest()} files"); return

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("No GEMINI_API_KEY. Put it in .env (see .env.example).")

    todo = [(it, AUDIO / f"{it['id']}.wav") for _, _, it in all_items()
            if (not args.only or it["id"] in args.only)]
    todo = [(it, out) for it, out in todo if args.force or not out.exists()]

    print(f"{len(todo)} item(s) → {args.model} / voice {args.voice}")
    for item, out in todo:
        text = item.get("tts") or item.get("kana") or item["ja"]
        for attempt in range(3):
            try:
                out.write_bytes(to_wav(*synth(key, args.model, args.voice, text)))
                print(f"  ✓ {item['id']}  {text}")
                break
            except Exception as e:
                wait = 5 * (attempt + 1)
                print(f"  … {item['id']}: {e}  (retry in {wait}s)")
                time.sleep(wait)
        else:
            print(f"  ✗ {item['id']} skipped")
        time.sleep(0.5)

    print(f"manifest: {write_manifest()} files")


if __name__ == "__main__":
    main()
