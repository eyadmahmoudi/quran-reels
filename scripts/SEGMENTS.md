# Local segment data for non-QDC reciters

The QDC API publishes per-word timestamps for 13 of the 18 reciters in
`POPULAR_RECITERS`. The remaining 5 fall back to audio-pause-detection
heuristics, which work but aren't as precise as having real word
timings.

This directory contains a script that **generates QDC-compatible segment
data offline** for the non-QDC reciters using forced alignment. Run it
once per (reciter, surah), commit the resulting JSON files to the repo,
and the app will use them automatically.

## How it works

`generate-segments.py` uses [WhisperX](https://github.com/m-bain/whisperX)
in **forced-alignment mode** — given a known transcript and audio, it
finds the precise start/end time of each word using a wav2vec2 CTC model.
This is fundamentally different from STT/transcription; we provide the
canonical Uthmani text from quran.com as the alignment target, so the
model never has to *recognize* Quranic Arabic — only *locate* it.

For each verse it:
1. Downloads the verse's audio from everyayah.com
2. Fetches the canonical Uthmani text from quran.com
3. Runs forced alignment to extract per-word timestamps
4. Writes JSON to `public/segments/{reciter_folder}/{surah_id}.json`

The output JSON shape mirrors QDC's `verse_timings`, so the existing
QDC code path in `hooks/use-video-generator.ts` consumes it
automatically — no client-side code changes needed when new files are
added to `public/segments/`.

## Reciters this targets

These reciters are in `POPULAR_RECITERS` with `qdcRecitationId: null`
(i.e., not in QDC's catalog at all):

- `Muhammad_Ayyoub_128kbps`
- `Maher_AlMuaiqly_64kbps`
- `Nasser_Alqatami_128kbps`
- `Husary_Mujawwad_64kbps`

`Ghamadi_40kbps` (Saad Al-Ghamdi) is in QDC at id 13 with audio but no
segments; he can also be added to the script's `TARGET_RECITERS` list
if needed.

## Running it

### Option 1 — Local (Linux/Mac)

```bash
# Requires Python 3.10+ and ~3GB disk for the models
pip install whisperx requests

# A few short surahs first to test:
python scripts/generate-segments.py --reciter Muhammad_Ayyoub_128kbps --surah 112,113,114

# A specific verse range you care about:
python scripts/generate-segments.py --reciter Muhammad_Ayyoub_128kbps --surah 1,36,55,67

# Everything (slow — many hours):
python scripts/generate-segments.py --all
```

CPU works but is slow (~30s per verse). With CUDA GPU it's ~3s per verse.

### Option 2 — Google Colab (free GPU, no local setup)

1. Open https://colab.research.google.com/
2. New notebook → Runtime → Change runtime type → T4 GPU
3. Paste:
   ```python
   !git clone https://github.com/eyadmahmoudi/quran-reels.git
   %cd quran-reels
   !pip install whisperx requests
   !python scripts/generate-segments.py --all
   ```
4. After it completes, zip and download the output:
   ```python
   !zip -r segments.zip public/segments
   from google.colab import files
   files.download('segments.zip')
   ```
5. Unzip into your local `public/segments/`, commit, push.

## What gets shipped to production

The JSON files are static assets in `public/segments/`. They are served
directly by Vercel — no API call, no compute cost. Each file is a few
KB to a few hundred KB depending on surah length. Estimated total for
4 reciters × 114 surahs is ~30–80 MB.

If repo size becomes a concern, the JSON can also be hosted on a CDN
(e.g. R2/S3) and `fetchLocalSegments` in `lib/quran-api.ts` can be
pointed at the CDN URL instead of `/segments/...`.

## Verifying it worked

After committing new files under `public/segments/{reciter}/`, generate
a video for that reciter and look in the browser console for:

```
[audio-source] loaded N local pre-computed timings from /segments/.../X.json
```

The `buildDisplaySegments` log line will then show
`mode=connected/pause` per boundary instead of `proportional` /
heuristic warnings.
