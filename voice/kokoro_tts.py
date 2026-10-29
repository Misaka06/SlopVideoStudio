"""Batch text-to-speech with Kokoro (free, runs locally).

Usage: python voice/kokoro_tts.py job.json
job.json: {"voice": "am_michael", "lang": "en-us", "speed": 1.0,
           "items": [{"text": "...", "out": "path/to/scene-01.wav", "voice": "optional override"}, ...]}
Prints one JSON line per item: {"out": ..., "duration": seconds}
The model loads once, so a whole episode costs a single startup.
"""

import json
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

MODELS = Path(__file__).resolve().parent.parent / "models"


def main() -> None:
    job = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    kokoro = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
    for item in job["items"]:
        samples, rate = kokoro.create(
            item["text"],
            voice=item.get("voice") or job.get("voice", "am_michael"),
            speed=float(job.get("speed", 1.0)),
            lang=job.get("lang", "en-us"),
        )
        Path(item["out"]).parent.mkdir(parents=True, exist_ok=True)
        sf.write(item["out"], samples, rate)
        print(json.dumps({"out": item["out"], "duration": len(samples) / rate}), flush=True)


if __name__ == "__main__":
    main()
