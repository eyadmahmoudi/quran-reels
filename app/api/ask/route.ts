import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Conversational Quran Q&A.
//
// Pipeline:
//   1. CLIENT pre-retrieves ~30 candidate verses with hybrid lexical
//      + semantic search and posts them along with the question.
//   2. SERVER asks Groq to expand the user's question into a small
//      set of specific Quran-style Arabic + English search terms.
//      (The user's literal phrasing — e.g. "حكم شرب الخمر" — rarely
//      appears in the Quran. Specific topical keywords like "الخمر",
//      "اجتنبوا", "ميسر" do.)
//   3. SERVER lexical-searches each expanded term against the same
//      keyword endpoint the user-facing Exact-text tab uses.
//   4. SERVER merges client candidates + new lexical hits, deduped
//      and capped at ~60 verses for context.
//   5. SERVER sends the merged candidates + the original question
//      to Groq again for the final answer.
//
// Two LLM calls per question; both fit comfortably in Groq's free
// 30 req/min tier.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const ANSWER_SYSTEM_PROMPT = `You are a knowledgeable, warm, conversational Qur'an assistant.

CRITICAL RULES:
1. Respond in the SAME LANGUAGE as the user's question. If they write in Arabic, respond entirely in Arabic. If in English, entirely in English.
2. You will be given CANDIDATE VERSES retrieved from the Qur'an. For questions about themes, rulings, stories, or specific verse content, use ONLY these verses. 
3. EXCEPTION TO RULE 2: If the user asks a basic structural or historical fact about the Qur'an (e.g., "What is the longest Surah?", "How many Ayahs are in Al-Mulk?", "Which Surah lacks Bismillah?"), you MAY use your internal factual knowledge to answer directly, even if the answer isn't in the candidate verses. 
4. Cite verses with the exact format [S:V] (e.g. [5:90], [2:255]). The frontend extracts these. Do NOT invent verse numbers.
5. Do NOT hedge with "the candidates don't contain..." or "we cannot conclude...". The user does not care about your retrieval limitations. Provide the answer naturally.
6. Pick the 1–4 MOST relevant verses, not all of them. Quote the strongest one fully.

QUERY TYPE GUIDANCE:
- Religious ruling ("حكم شرب الخمر", "ruling on alcohol"): give the ruling in one sentence, then quote the strongest verse.
- Knowledge question ("من هو عدو موسى", "who built the Ka'ba"): one-line answer, then the verse.
- Factual Trivia ("What is the longest Surah"): Answer directly based on factual knowledge.
- Feeling ("أشعر بالحزن", "I feel anxious"): brief empathy, then 1–2 comforting verses.
- Verse fragment lookup: identify the verse_key, give 1–2 sentence context.

If — after honestly reviewing the candidates AND your factual knowledge — the answer is genuinely not available, say so in one short sentence and stop. Don't pad.

Be warm. Be brief. Quote at least one verse fully if applicable.`

const EXPANSION_SYSTEM_PROMPT = `You are a Qur'an search-query expansion assistant.

Given a user question (in Arabic or English), generate 6–10 short Arabic search terms that would find the relevant verses by substring match against the Uthmani text of the Qur'an. Think of the actual Arabic words the verses USE — not the words the user used. Include morphological variants where helpful (e.g. الخمر, خمرا, تخمر, اجتنبوا الخمر).

Also include 2–3 English keywords for translation-side matching.

Return STRICT JSON: { "terms": ["...", "...", ...] }
No prose, no markdown fences, just the JSON object.

Examples:

Input: "حكم شرب الخمر"
Output: { "terms": ["الخمر", "خمر", "اجتنبوا الخمر", "ميسر", "إثم كبير", "رجس من عمل الشيطان", "wine", "intoxicant"] }

Input: "من هو عدو موسى"
Output: { "terms": ["فرعون", "آل فرعون", "هامان", "موسى وفرعون", "اذهب إلى فرعون", "Pharaoh"] }

Input: "أشعر بالحزن"
Output: { "terms": ["لا تحزن", "ولا تحزنوا", "لا خوف عليهم ولا هم يحزنون", "إن الله معنا", "فإن مع العسر يسرا", "patience", "comfort"] }

Input: "what does the Quran say about gratitude"
Output: { "terms": ["اشكروا", "شكر", "الشاكرين", "نعمة", "نعمتي", "لئن شكرتم", "gratitude", "thankful"] }`

interface AskBody {
  question?: string
  candidates?: Array<{ vk: string; ar: string; tr: string }>
}

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqOptions {
  apiKey: string
  messages: GroqMessage[]
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

async function groqChat(opts: GroqOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 800,
  }
  if (opts.jsonMode) body.response_format = { type: 'json_object' }
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    throw new Error(`Groq HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`)
  }
  const data = await r.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

async function expandQuery(question: string, apiKey: string): Promise<string[]> {
  try {
    const raw = await groqChat({
      apiKey,
      messages: [
        { role: 'system', content: EXPANSION_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
      maxTokens: 300,
      jsonMode: true,
    })
    const parsed = JSON.parse(raw) as { terms?: unknown }
    const terms = Array.isArray(parsed.terms)
      ? parsed.terms.filter(
          (t): t is string => typeof t === 'string' && t.trim().length > 0,
        )
      : []
    // Always include the original question as a fallback term so the
    // user's literal phrasing still has a shot at lexical hits.
    if (!terms.includes(question)) terms.unshift(question)
    return terms.slice(0, 12)
  } catch (e) {
    console.warn('[ask] query expansion failed, falling back to raw query:', e)
    return [question]
  }
}

interface LexicalHit {
  verse_key: string
  text: string
}

async function lexicalFor(
  term: string,
  baseUrl: string,
): Promise<LexicalHit[]> {
  try {
    const r = await fetch(
      `${baseUrl}/api/search?q=${encodeURIComponent(term)}`,
    )
    if (!r.ok) return []
    const j = (await r.json()) as { results?: LexicalHit[] }
    return j.results ?? []
  } catch {
    return []
  }
}

function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.VERCEL_URL
  if (envUrl) return `https://${envUrl}`
  const host = req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  return host ? `${proto}://${host}` : ''
}

// Strip <mark> tags that the search endpoint adds for highlighting.
function stripMark(s: string): string {
  return s.replace(/<\/?mark>/g, '')
}

export async function POST(req: NextRequest) {
  let body: AskBody
  try {
    body = (await req.json()) as AskBody
  } catch {
    return badRequest('invalid JSON body')
  }
  const question = (body.question ?? '').trim()
  const clientCandidates = body.candidates ?? []
  if (question.length < 2) return badRequest('question is required (≥ 2 chars)')

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

  // 1. Expand the query into specific search terms.
  const terms = await expandQuery(question, apiKey)

  // 2. Run all lexical searches in parallel.
  const baseUrl = getBaseUrl(req)
  const lexicalLists = baseUrl
    ? await Promise.all(terms.map((t) => lexicalFor(t, baseUrl)))
    : []

  // 3. Merge: client candidates first (they include semantic), then
  //    lexical hits in the order their expanded term was generated.
  //    Dedupe by verse_key, cap at 60.
  const seen = new Set<string>()
  const merged: Array<{ vk: string; ar: string; tr: string }> = []
  for (const c of clientCandidates) {
    if (!c?.vk || seen.has(c.vk)) continue
    seen.add(c.vk)
    merged.push(c)
  }
  // For lexical hits we don't have the translation here — we can fetch
  // verse-by-verse from quran.com but that's costly. Instead the LLM
  // can answer from Arabic alone for the new lexical hits; the client
  // already has full meta and will look up translations for cited
  // verses when rendering.
  for (const list of lexicalLists) {
    for (const h of list) {
      if (seen.has(h.verse_key)) continue
      seen.add(h.verse_key)
      merged.push({ vk: h.verse_key, ar: stripMark(h.text), tr: '' })
      if (merged.length >= 60) break
    }
    if (merged.length >= 60) break
  }

  if (merged.length === 0) {
    return NextResponse.json(
      {
        error:
          'No candidate verses retrieved. Try rephrasing the question more specifically.',
      },
      { status: 422 },
    )
  }

  // 4. Final answer call.
  const candidateBlock = merged
    .map(
      (c, i) =>
        `${i + 1}. [${c.vk}] ${c.ar}` +
        (c.tr ? `\n   English: ${c.tr}` : ''),
    )
    .join('\n\n')

  const userMessage =
    `Question: ${question}\n\n` +
    `Candidate verses (use ONLY these — these were retrieved by ` +
    `expanded keyword search and semantic search):\n\n${candidateBlock}\n\n` +
    `Now respond following the rules. Cite verses with [S:V] notation.`

  let answer: string
  try {
    answer = await groqChat({
      apiKey,
      messages: [
        { role: 'system', content: ANSWER_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      maxTokens: 900,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    )
  }

  if (!answer) {
    return NextResponse.json(
      { error: 'Empty response from LLM' },
      { status: 502 },
    )
  }

  // Extract [S:V] citations and dedupe in order of first appearance.
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
  const byKey = new Map(merged.map((c) => [c.vk, c]))
  const cited_verses = orderedVks
    .map((vk) => byKey.get(vk))
    .filter((v): v is NonNullable<typeof v> => v !== undefined)
    .map((c) => ({ verse_key: c.vk, text: c.ar, translation: c.tr }))

  return NextResponse.json({
    answer,
    cited_verses,
    expanded_terms: terms,
    candidate_count: merged.length,
    model: MODEL,
  })
}
