# Concept / semantic search

The "By concept / feeling" tab in the search dialog finds verses by
**meaning**, not exact text. A user can type:

- A topic in Arabic — `الصبر`, `التوكل على الله`, `بر الوالدين`
- A topic in English — `patience`, `forgiveness`, `gratitude`
- A current feeling — `I'm feeling lost`, `أنا حزين`, `anxiety about the future`

…and gets the verses that semantically match.

## Architecture (no server, no API, no API keys, no recurring cost)

The whole search runs **in the user's browser** using
[transformers.js](https://huggingface.co/docs/transformers.js):

1. **One-time setup** (you, once): `scripts/generate-embeddings.mjs`
   embeds every verse of the Quran with
   `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (a 384-dim
   multilingual sentence-similarity model). Each verse is embedded as
   `Translation: {english} | Arabic: {uthmani}` so a single multilingual
   vector handles both Arabic and English queries. Output:
       public/embeddings/verses.bin       (~9.5 MB)
       public/embeddings/verses-meta.json (verse text + translation)
   These ship as static assets — committed to the repo, served by
   Vercel's CDN.

2. **At query time** (every user, every search): the browser
   - lazy-loads the same model from Hugging Face Hub on the user's
     first-ever concept search (~100 MB quantized, cached in IndexedDB
     by transformers.js — so it's a one-time cost per browser),
   - lazy-loads `verses.bin` + `verses-meta.json` (~10 MB, cached by
     the browser's HTTP cache),
   - embeds the query (~50–200 ms),
   - computes cosine similarity against all 6,236 verse vectors
     (~5 ms),
   - returns the top 25.

After the first search, subsequent searches are sub-100 ms.

There is **no API key**, no `/api/concept-search` route, no Vercel
function, no per-query cost, no rate limit. Once the user has the model
cached, the feature works offline.

## Setup (one command, one time)

You only need to do this **once**, when you first add the feature:

```bash
node scripts/generate-embeddings.mjs
```

This will:

- Fetch all 6,236 verses with English (Saheeh International)
  translations from quran.com
- Download the embedding model from Hugging Face on first run
  (~100 MB, cached in `~/.cache/huggingface/`)
- Embed all verses in batches (CPU is fine; ~5–10 minutes total)
- Write `public/embeddings/verses.bin` and
  `public/embeddings/verses-meta.json`

Then commit the result and push:

```bash
git add public/embeddings/verses.bin public/embeddings/verses-meta.json
git commit -m "data: ship verse embeddings for concept search"
git push
```

Vercel redeploys, the tab is live.

## When to re-generate

Only when you change something that affects the embeddings:

- The embedding text template (e.g. include tafsir, switch translation)
- The model name or quantization
- You discover a better model

Otherwise the bin + json live in the repo permanently.

## Troubleshooting

**"verses.bin not found"** in browser console: you didn't commit the
generated files, or they're being filtered by `.gitignore`. Check
`git ls-files public/embeddings/`.

**First search hangs forever**: the model is downloading from Hugging
Face Hub (~100 MB). Watch the browser DevTools Network tab — you
should see requests to `huggingface.co/.../onnx/...` resolving over
10–30 seconds depending on bandwidth. After the download lands, the
model is cached in IndexedDB and future searches start instantly.

**Out-of-memory during script**: lower `BATCH_SIZE` in the script (the
default 16 is conservative; 4 also works for low-RAM machines).

**Bad-quality matches**: probably the multilingual model misses some
nuanced classical-Arabic concept. Quality scales with model size — see
the script for swappable model names. The current
`paraphrase-multilingual-MiniLM-L12-v2` is a good balance of size
(~100 MB) and quality (decent multilingual semantic similarity).

## Why this architecture vs. a server endpoint?

A server-side endpoint (Vercel function calling OpenAI) was the
obvious first choice. It would have meant:
- Recurring API cost (cents per million queries, not zero)
- An OpenAI account with billing attached
- A secret that has to live in env vars
- Cold-start latency on every search

Client-side instead means:
- $0 forever
- No accounts, no keys, no env vars
- Works offline after the first model download
- Latency is "model load time on first search, then sub-100 ms forever"

The trade-off is a one-time ~100 MB model download per browser. For an
optional power-user feature ("find verses that match a feeling") that's
acceptable — the user only pays the cost when they actually use it.
