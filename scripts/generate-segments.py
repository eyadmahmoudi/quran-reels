#!/usr/bin/env python3
"""
Generate per-word timing segments for non-QDC reciters using forced
alignment (WhisperX). Output JSON files mirror the QDC verse_timings
format so the Quran Reels app can consume them transparently.

Usage:
    # Single reciter, single surah:
    python scripts/generate-segments.py --reciter Muhammad_Ayyoub_128kbps --surah 2

    # Single reciter, multiple surahs:
    python scripts/generate-segments.py --reciter Muhammad_Ayyoub_128kbps --surah 1,36,55,67,112

    # All target reciters, all 114 surahs (long-running, ~hours):
    python scripts/generate-segments.py --all

Output:
    public/segments/{reciter_folder}/{surah_id}.json

Each JSON file matches the QDC `verse_timings` shape:
    {
      "reciter_folder": "Muhammad_Ayyoub_128kbps",
      "surah_id": 2,
      "verse_timings": [
        {
          "verse_key": "2:255",
          "timestamp_from": 0,
          "timestamp_to": 67710,
          "segments": [[1, 0, 740], [2, 740, 1230], ...]
        },
        ...
      ]
    }

Forced alignment vs transcription:
    We do NOT ask Whisper to transcribe (it would butcher Quranic Arabic).
    Instead we provide the canonical Uthmani text from quran.com as the
    ground-truth transcript, and use WhisperX's `align()` function — which
    uses a wav2vec2 CTC model to find where each known word sits in the
    audio. Much more accurate for known text + known language than STT.

Setup (Linux/Mac with optional GPU):
    pip install whisperx requests
    # Or for the CPU-only path:
    pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
    pip install whisperx requests

Setup (Google Colab — easiest, free GPU):
    !pip install whisperx requests
    Then run this script. Download the resulting public/segments/ tree.

Reciters that need this (no QDC segments, kept in app):
    - Muhammad_Ayyoub_128kbps
    - Maher_AlMuaiqly_64kbps
    - Nasser_Alqatami_128kbps
    - Husary_Mujawwad_64kbps
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Iterable

import requests

# Lazy-imported (heavy) — only when actually generating segments
torch = None
whisperx = None

EVERYAYAH = "https://everyayah.com/data"
QURAN_API = "https://api.quran.com/api/v4"

# Reciters that don't have QDC segments and we want to ship local data for.
# Update this list to match POPULAR_RECITERS entries with qdcRecitationId: null.
TARGET_RECITERS = [
    "Muhammad_Ayyoub_128kbps",
    "Maher_AlMuaiqly_64kbps",
    "Nasser_Alqatami_128kbps",
    "Husary_Mujawwad_64kbps",
]

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ROOT = REPO_ROOT / "public" / "segments"


def fetch_verses(surah_id: int) -> list[dict]:
    """Pull canonical Uthmani text for a surah from quran.com."""
    r = requests.get(
        f"{QURAN_API}/verses/by_chapter/{surah_id}",
        params={"fields": "text_uthmani,verse_key", "per_page": 286},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["verses"]


def download_verse_audio(reciter_folder: str, verse_key: str, dest: Path) -> bool:
    """Download a verse's MP3 from everyayah.com to dest. Returns True on success."""
    surah, verse = verse_key.split(":")
    fname = f"{int(surah):03d}{int(verse):03d}.mp3"
    url = f"{EVERYAYAH}/{reciter_folder}/{fname}"
    try:
        r = requests.get(url, timeout=60)
        if r.status_code != 200:
            print(f"    ⚠ download {url} -> HTTP {r.status_code}", file=sys.stderr)
            return False
        dest.write_bytes(r.content)
        return True
    except requests.RequestException as e:
        print(f"    ⚠ download {url} failed: {e}", file=sys.stderr)
        return False


def lazy_import_whisperx():
    global torch, whisperx
    if whisperx is None:
        import torch as _torch
        import whisperx as _wx
        torch = _torch
        whisperx = _wx


def align_verse(
    audio_path: Path,
    canonical_text: str,
    align_model,
    align_metadata,
    device: str,
) -> tuple[list[list[int]], int]:
    """
    Run forced alignment on one verse's audio against its canonical text.
    Returns (segments, duration_ms) where segments is [[wordPos, startMs, endMs], ...].
    Word positions are 1-indexed and follow the same convention QDC uses
    (one entry per word, with wa9f marks attached to the preceding word).
    """
    lazy_import_whisperx()

    audio = whisperx.load_audio(str(audio_path))
    duration_s = len(audio) / 16000.0

    # Build a fake "Whisper transcript" with one segment containing the
    # canonical text. WhisperX's align() doesn't care that it didn't come
    # from Whisper — it just uses the text as the alignment target.
    fake_transcript = [{
        "start": 0.0,
        "end": duration_s,
        "text": canonical_text,
    }]

    result = whisperx.align(
        fake_transcript,
        align_model,
        align_metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    word_segs = result.get("word_segments", [])
    out: list[list[int]] = []
    for i, ws in enumerate(word_segs, start=1):
        start_ms = int(round(ws.get("start", 0.0) * 1000))
        end_ms = int(round(ws.get("end", 0.0) * 1000))
        out.append([i, start_ms, end_ms])
    return out, int(round(duration_s * 1000))


def process_reciter_surah(
    reciter_folder: str,
    surah_id: int,
    align_model,
    align_metadata,
    device: str,
    tmp_dir: Path,
) -> None:
    """Generate /public/segments/{reciter_folder}/{surah_id}.json."""
    out_path = OUTPUT_ROOT / reciter_folder / f"{surah_id}.json"
    if out_path.exists():
        print(f"  ✓ {reciter_folder}/{surah_id} already exists, skipping")
        return

    print(f"  → fetching verse text for surah {surah_id}")
    verses = fetch_verses(surah_id)

    verse_timings = []
    for v in verses:
        verse_key = v["verse_key"]
        text = v["text_uthmani"]
        verse_audio = tmp_dir / f"{reciter_folder}_{verse_key.replace(':', '_')}.mp3"

        if not download_verse_audio(reciter_folder, verse_key, verse_audio):
            print(f"    ⚠ skipping {verse_key} — audio download failed")
            continue

        try:
            segments, dur_ms = align_verse(
                verse_audio, text, align_model, align_metadata, device
            )
            verse_timings.append({
                "verse_key": verse_key,
                "timestamp_from": 0,
                "timestamp_to": dur_ms,
                "segments": segments,
            })
            print(f"    ✓ {verse_key}: {len(segments)} words aligned, {dur_ms}ms")
        except Exception as e:
            print(f"    ✗ {verse_key} alignment failed: {e}", file=sys.stderr)
        finally:
            verse_audio.unlink(missing_ok=True)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({
        "reciter_folder": reciter_folder,
        "surah_id": surah_id,
        "verse_timings": verse_timings,
    }, ensure_ascii=False, indent=2))
    print(f"  ✓ wrote {out_path} ({len(verse_timings)} verses)")


def parse_surahs(spec: str) -> list[int]:
    out = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if "-" in chunk:
            a, b = chunk.split("-")
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(chunk))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--reciter", help="Single everyayah folder name (e.g. Muhammad_Ayyoub_128kbps)")
    ap.add_argument("--surah", help="Surah id, comma-list (e.g. 1,36,55), or range (e.g. 78-114)")
    ap.add_argument("--all", action="store_true", help="Process all TARGET_RECITERS x all 114 surahs")
    ap.add_argument("--device", default=None, help="Override device (cuda|cpu); auto-detected by default")
    args = ap.parse_args()

    if not args.all and not (args.reciter and args.surah):
        ap.print_help()
        return 1

    lazy_import_whisperx()
    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    print("Loading WhisperX Arabic alignment model (one-time)…")
    align_model, align_metadata = whisperx.load_align_model(language_code="ar", device=device)

    tmp_dir = Path(__file__).parent / ".tmp_audio"
    tmp_dir.mkdir(exist_ok=True)

    targets: Iterable[tuple[str, int]]
    if args.all:
        targets = ((r, s) for r in TARGET_RECITERS for s in range(1, 115))
    else:
        targets = ((args.reciter, s) for s in parse_surahs(args.surah))

    for reciter, surah in targets:
        print(f"\n=== {reciter} surah {surah} ===")
        try:
            process_reciter_surah(
                reciter, surah, align_model, align_metadata, device, tmp_dir
            )
        except Exception as e:
            print(f"  ✗ FAILED: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
