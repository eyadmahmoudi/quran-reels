# Concept / semantic search setup

The "By concept / feeling" tab in the search dialog finds verses by
**meaning**, not by exact text. A user can type:

- A topic in Arabic — `الصبر`, `التوكل على الله`, `بر الوالدين`
- A topic in English — `patience`, `forgiveness`, `gratitude`
- A current feeling — `I'm feeling lost`, `أنا حزين`, `anxiety about the future`

…and gets the verses that semantically match.

## How it works

1. **Pre-computed verse embeddings** (one-time, ~$0.02): every verse of
   the Quran is embedded using OpenAI's `text-embedding-3-small` model
   at 512 dimensions. Each verse is embedded as
   `Translation: {english} | Arabic: {uthmani}` so a single multilingual
   vector handles both Arabic and English queries.

2. **At query time**: the user's query is embedded with the same model,
   then we compute cosine similarity against all 6,236 verse vectors
   server-side. Top 25 are returned with similarity scores.

The math is simple enough (3M float-multiplies per query) that no
vector DB is needed — a plain Vercel function does the whole search
sub-millisecond after the embeddings file is loaded.

## Setup (3 steps)

### 1. Add your OpenAI API key

Locally — append to `.env.local`:

```
OPENAI_API_KEY=sk-...
```

On Vercel — go to your project → Settings → Environment Variables and
add `OPENAI_API_KEY`. Available on a free OpenAI account; pay-as-you-go
billing is required but the cost is negligible (cents per *thousands*
of queries).

### 2. Generate the embeddings (one-time, ~3 min)

```bash
OPENAI_API_KEY=sk-... node scripts/generate-embeddings.mjs
```

This will:

- Fetch all 6,236 verses with English (Saheeh International) translations
  from quran.com
- Embed them in batches of 100 with OpenAI
- Write `public/embeddings/verses.bin` (~12 MB) and
  `public/embeddings/verses-meta.json` (~1.5 MB)

Cost: about 2 cents on OpenAI's billing.

### 3. Commit and deploy

```bash
git add public/embeddings/verses.bin public/embeddings/verses-meta.json
git commit -m "data: ship verse embeddings for concept search"
git push
```

Vercel will redeploy. The "By concept / feeling" tab is now live.

## When to re-generate

Only when you change something that affects the embeddings:

- The embedding text template (e.g. include tafsir, use a different
  translation)
- The model or dimension count
- The translation source

Otherwise the bin lives in the repo permanently.

## Verifying it works

After the deploy lands:

1. Open the search bar on the site
2. Click the "By concept / feeling" tab
3. Type `patience` (or `الصبر`) — you should see verses like 2:155,
   3:200, 16:127, 39:10, etc. with relevance percentages

If you see "concept search unavailable: OPENAI_API_KEY missing", the
env var didn't make it into the running deployment — check Vercel
settings and redeploy.

If you see "embeddings files not found", the bin / meta JSON didn't
get committed (or are being filtered by a `.gitignore` rule). Check
`git ls-files public/embeddings/`.

## Why server-side, not client-side?

Two reasons:

1. The embeddings binary is ~12 MB. Shipping that to every page load
   would tank your Lighthouse score for users who never use concept
   search. Server-side keeps it in one place.

2. Embedding the *query* requires an OpenAI API key. Putting the key in
   client code would expose it to anyone who opens DevTools.

The whole pipeline (load + embed + score + sort) runs in ~50 ms on a
warm Vercel function — fast enough to feel instant.
