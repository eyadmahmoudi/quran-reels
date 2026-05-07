import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const ANSWER_SYSTEM_PROMPT = `You are a knowledgeable, warm, conversational Qur'an assistant.

CRITICAL RULES:
1. Respond in the SAME LANGUAGE as the user's question. 
2. USE ONLY THE CANDIDATE VERSES for themes, rulings, stories, and context.
3. FACTUAL OVERRIDE: For basic numerical or structural facts, answer directly using your internal knowledge.
4. STRICT BILINGUAL VOCABULARY BAN: You are strictly forbidden from mentioning your retrieval system. 
   - NEVER use these English words: "candidate", "candidates", "provided verses".
   - NEVER use these Arabic words: "النصوص الموجودة", "الآيات الموجودة", "هذه الآيات", "الآيات المرشحة". 
   Act as if you are answering naturally from memory.
5. NO METAPHORS OR WORDPLAY: Do not use verses about literal smoke/fire (e.g., Day of Judgment) to answer questions about modern concepts like smoking (التدخين).
6. THE SAFETY REFUSAL: If the exact ruling or theme is not present in the verses, DO NOT invent one. You must reply EXACTLY with this phrase (choose English or Arabic based on the user):
   - English: "I'm sorry, I cannot find the specific verses to accurately answer that right now."
   - Arabic: "عذراً، لا أستطيع العثور على الآيات الدقيقة للإجابة على ذلك حالياً."
   Stop generating after this sentence. Do not elaborate.
7. Cite verses exactly as [S:V]. Quote the strongest verse fully.

QUERY TYPE GUIDANCE:
- Religious ruling: Give the ruling in one sentence, then quote the strongest verse.
- Fact/Trivia: Answer directly from knowledge without citing a verse if one isn't needed.
- Empathy: Brief comfort, then 1-2 verses.`

const EXPANSION_SYSTEM_PROMPT = `You are a Qur'an search-query expansion assistant.

Given a user question (in Arabic or English), generate 6–10 short Arabic search terms that would find the relevant verses by substring match against the Uthmani text of the Qur'an. Think of the actual Arabic words the verses USE.

CRITICAL RULES:
1. For questions about rulings/haram/halal, MUST include exact Uthmani root words of prohibition: "حرم", "اجتنبوه", "رجس", "إثم".
2. YOU MUST INCLUDE MORPHOLOGICAL VARIANTS OF THE MAIN NOUN/VERB IN THE USER'S QUERY. If they ask about "الصابرين", you must include "صبروا", "يصبرون", "صبر". Do not just rely on generic reward/punishment words.

Return STRICT JSON: { "terms": ["...", "...", ...] }

Examples:
Input: "حكم شرب الخمر"
Output: { "terms": ["الخمر", "الميسر", "اجتنبوه", "رجس من عمل الشيطان", "إثم كبير", "حرم", "intoxicants"] }

Input: "ما هو جزاء الصابرين"
Output: { "terms": ["الصابرين", "صبروا", "يصبرون", "أجرهم بغير حساب", "بما صبروا", "patient", "patience"] }

Input: "من هو عدو موسى"
Output: { "terms": ["فرعون", "آل فرعون", "هامان", "موسى وفرعون", "Pharaoh"] }`
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

  const terms = await expandQuery(question, apiKey)
  const baseUrl = getBaseUrl(req)
  const lexicalLists = baseUrl
    ? await Promise.all(terms.map((t) => lexicalFor(t, baseUrl)))
    : []

  const seen = new Set<string>()
  const merged: Array<{ vk: string; ar: string; tr: string }> = []
  
  for (const c of clientCandidates) {
    if (!c?.vk || seen.has(c.vk)) continue
    seen.add(c.vk)
    merged.push(c)
  }
  
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

  const candidateBlock = merged
    .map(
      (c, i) =>
        `${i + 1}. [${c.vk}] ${c.ar}` +
        (c.tr ? `\n   English: ${c.tr}` : ''),
    )
    .join('\n\n')

  const userMessage =
    `Question: ${question}\n\n` +
    `Candidate verses:\n\n${candidateBlock}\n\n` +
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