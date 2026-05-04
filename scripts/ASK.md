# "Ask" tab — chat with the Qur'an

The third search tab is a conversational Q&A. The user types a
question, a feeling, or pastes a verse fragment; the system answers
in the same language with relevant verses cited inline.

Examples it handles:

- **Ruling questions** — "حكم شرب الخمر" → the verse(s) on that ruling
- **Feelings** — "أشعر بالحزن" → comfort verses with brief context
- **Knowledge questions** — "من هو عدو موسى" → Pharaoh, with the verse
- **Fragment lookup** — paste a piece of a verse → which verse it is
- **English versions** — "what does the Qur'an say about gratitude?"

## Architecture

```
[user types question]
        ↓
[client] retrieveCandidates(q)         — hybrid lexical + semantic
        ↓                                 (re-uses the concept-search
[top 30 candidate verses]                  embeddings already loaded)
        ↓
POST /api/ask  { question, candidates }
        ↓
[server] Groq API call                  — Llama 3.3 70B, free tier
        ↓
{ answer, cited_verses }
        ↓
[client] render answer with [S:V] pills
       + verse cards beneath
```

The LLM is constrained to cite ONLY verses from the candidate list
(it cannot fabricate verse numbers). The system prompt enforces:

1. Respond in the same language as the question
2. Use only the provided candidate verses
3. Cite with `[surah:verse]` notation
4. Pick the 1-4 most relevant verses, not all of them
5. Quote at least one cited verse in full
6. Match tone to query type (warm for feelings, brisk for rulings)

## Setup (one env var, ~2 minutes)

The Ask tab requires a free Groq API key — Groq is the fastest free
LLM service available, no payment needed.

1. Sign up at https://console.groq.com (free, no credit card)
2. Create an API key in the dashboard
3. Add `GROQ_API_KEY` to your environment:
   - **Vercel:** Project → Settings → Environment Variables
   - **Local dev:** add `GROQ_API_KEY=...` to `.env.local`
4. Redeploy

Free tier limits: **30 requests/minute, 14,400 requests/day** — way
more than a personal app needs.

## Why Groq specifically

- **Free** — no payment, no credit card, just a sign-up
- **Fast** — 100-500 tokens/sec, answers stream back in <2 seconds
- **Llama 3.3 70B** — great Arabic + English understanding, knows
  the Quran context well enough to answer "who built the Ka'ba"
  correctly given the right verses to choose from
- **OpenAI-compatible API** — trivial to swap if Groq ever changes
  pricing (just change the URL + model name)

## Quality limits

- The LLM only sees the 30 verses returned by retrieval. If the
  retriever fails to find the right verse for a question, the LLM
  can't recover. Improvement comes from a stronger embedding model
  (`multilingual-e5-base` upgrade is queued separately) and from
  smart query reformulation.

- For very narrow rulings (e.g. specific fiqh details), the answer
  will only be as good as the verse retrieval — the LLM is
  instructed not to rely on its own training data outside the
  candidate list, to avoid making up references.

- Per-request latency: ~1-3s typical (Groq is fast). The retrieval
  step is ~50ms once the embeddings are warm.

## Failure modes (graceful)

- **No GROQ_API_KEY** → tab shows red error: "GROQ_API_KEY is not
  configured on the server. Add it to your Vercel environment
  variables — get a free key at https://console.groq.com"
- **Groq rate limit hit** → 502 with the upstream message; retry
  in a minute
- **Empty retrieval** → "No candidate verses retrieved — try
  rephrasing the question."
