import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Conversational Quran Q&A. The client does the heavy retrieval work
// (embedding the query, scoring all 6,236 verses, returning the top
// candidates) and posts the question + candidates here. We wrap them
// in a system prompt and call Groq's free LLM API.
//
// Setup:
//   1. Sign up free at https://console.groq.com (no payment needed)
//   2. Generate an API key
//   3. Add GROQ_API_KEY to Vercel env vars (and .env.local for dev)
//
// Free tier: 30 req/min, 14,400 req/day — plenty for personal use.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are a knowledgeable, warm, conversational Quran assistant. The user will ask a question, share a feeling, look up a phrase, or ask about a religious topic.

CRITICAL RULES:
1. Respond in the SAME LANGUAGE as the user's question. If they write in Arabic, respond entirely in Arabic. If in English, respond entirely in English.
2. You will be given a list of CANDIDATE VERSES retrieved by semantic + keyword search. Use ONLY these verses. Do NOT cite verses outside this list. Do NOT invent verse numbers.
3. Cite verses with the exact format [S:V] (e.g., [5:90], [2:255]). The frontend extracts these to show the verse cards beneath your answer.
4. Pick the 1–4 MOST relevant verses. Do not list every candidate.
5. Quote at least one cited verse fully (Arabic or English depending on language).

WRITING STYLE BY QUERY TYPE:
- A question of religious ruling ("حكم شرب الخمر", "ruling on alcohol"): give the ruling, cite the strongest verse(s).
- A feeling ("أشعر بالحزن", "I feel anxious"): respond with empathy first, then offer 1–2 verses that comfort/guide, with brief context.
- A factual question ("من هو عدو موسى", "who built the Ka'ba"): give the answer in one short sentence, cite the verse(s) where it appears.
- A verse fragment the user pasted: identify which verse it is, give the verse_key clearly, and add brief surrounding context.

Keep responses concise (2–6 sentences plus citations). Be warm, never preachy. If the candidates do not contain a good answer, say so honestly — do NOT fabricate.`

interface AskBody {
  question?: string
  candidates?: Array<{ vk: string; ar: string; tr: string }>
}

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: NextRequest) {
  let body: AskBody
  try {
    body = (await req.json()) as AskBody
  } catch {
    return badRequest('invalid JSON body')
  }
  const question = (body.question ?? '').trim()
  const candidates = body.candidates ?? []
  if (question.length < 2) return badRequest('question is required (≥ 2 chars)')
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return badRequest('no candidates provided — retrieval must run first')
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GROQ_API_KEY is not configured on the server. Add it to your Vercel environment variables — get a free key at https://console.groq.com',
      },
      { status: 503 },
    )
  }

  // Cap context size to keep within model limits (Llama 3.3 has 128k
  // ctx but each candidate is ~150-200 tokens, so 30 candidates ≈ 6k
  // tokens — comfortable).
  const trimmed = candidates.slice(0, 30)
  const candidateBlock = trimmed
    .map(
      (c, i) =>
        `${i + 1}. [${c.vk}] ${c.ar}\n   English: ${c.tr}`,
    )
    .join('\n\n')

  const userMessage =
    `Question: ${question}\n\n` +
    `Candidate verses (use ONLY these):\n\n${candidateBlock}\n\n` +
    `Now respond following the rules. Cite verses with [S:V] notation.`

  let groqResp: Response
  try {
    groqResp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Groq network error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    )
  }

  if (!groqResp.ok) {
    const txt = await groqResp.text()
    return NextResponse.json(
      { error: `Groq API: HTTP ${groqResp.status} ${txt.slice(0, 300)}` },
      { status: 502 },
    )
  }

  const data = await groqResp.json()
  const answer: string = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!answer) {
    return NextResponse.json(
      { error: 'Empty response from LLM' },
      { status: 502 },
    )
  }

  // Extract [S:V] citations and dedupe in order of first appearance.
  // Tolerate optional spaces and Arabic-Indic colons.
  const citationRe = /\[(\d{1,3})\s*[:：]\s*(\d{1,3})\]/g
  const cited = new Set<string>()
  const orderedVks: string[] = []
  for (const m of answer.matchAll(citationRe)) {
    const vk = `${m[1]}:${m[2]}`
    if (!cited.has(vk)) {
      cited.add(vk)
      orderedVks.push(vk)
    }
  }
  // Map back to candidate verse data.
  const byKey = new Map(trimmed.map((c) => [c.vk, c]))
  const cited_verses = orderedVks
    .map((vk) => byKey.get(vk))
    .filter((v): v is NonNullable<typeof v> => v !== undefined)
    .map((c) => ({ verse_key: c.vk, text: c.ar, translation: c.tr }))

  return NextResponse.json({
    answer,
    cited_verses,
    model: MODEL,
  })
}
