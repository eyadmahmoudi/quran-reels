// app/api/ask/route.ts
// Qur'an Q&A RAG endpoint — v4
//
// Pipeline: User question → Groq query expansion → DIRECT lexical search →
// merge with client semantic candidates → Groq answer generation.
//
// v4 FIX: The lexical search now runs IN-PROCESS instead of fetching
// /api/search over HTTP. On Vercel Serverless, self-fetching was silently
// failing (empty baseUrl or deadlocking), causing ZERO candidates for
// every query. Now we import and call the search index directly.
//
// All previous fixes also applied:
// - Surah names in candidate block for speaker awareness
// - Citation validation (strip hallucinated [S:V])
// - Factual Override as Rule #1 (highest priority)
// - Question type classifier injected into prompt
// - Reduced candidate cap (25) to save tokens

import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeBase,
  normalizeAlefFuzzy,
  normalizeConcat,
  buildIndexMap,
} from '@/lib/arabic-search'

export const runtime = 'nodejs'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

// ── Answer prompt (v4 — Factual Override as Rule #1) ──────────────────────

const ANSWER_SYSTEM_PROMPT = `You are a knowledgeable, warm, conversational Qur'an assistant.

═══════════════════════════════════════════
RULES (ORDERED BY PRIORITY — Rule 1 > Rule 7):
═══════════════════════════════════════════

RULE 1 — FACTUAL OVERRIDE (HIGHEST PRIORITY):
If the question asks for a FACT about the Qur'an's structure, history, or basic information — ANSWER DIRECTLY FROM YOUR KNOWLEDGE. Do NOT look at the candidate verses. Do NOT refuse. Examples of factual questions you MUST answer directly:
- "How many surahs are in the Quran?" → Answer: 114
- "What is the longest surah?" → Answer: Al-Baqarah
- "In which surah is Ayat al-Kursi?" → Answer: Al-Baqarah (2:255)
- "How many ayahs in Al-Baqarah?" → Answer: 286
- "What is the shortest surah?" → Answer: Al-Kawthar (3 ayahs)
- "Who revealed the Quran?" → Answer: Allah, to Prophet Muhammad through Jibreel
- "What is the first surah?" → Answer: Al-Fatihah
- "كم عدد سور القرآن" → Answer: ١١٤
- "ما هي أطول سورة" → Answer: البقرة
- "في أي سورة توجد آية الكرسي" → Answer: البقرة (٢:٢٥٥)
This rule ALWAYS wins over Rule 7 (safety refusal). NEVER refuse a factual question.

RULE 2 — LANGUAGE MATCH:
Respond in the SAME LANGUAGE as the user's question.

RULE 3 — USE CANDIDATE VERSES:
For questions about themes, rulings, stories, and context, USE ONLY THE CANDIDATE VERSES provided below. Quote the strongest verse fully. Cite as [S:V].

RULE 4 — VOCABULARY BAN:
You are strictly forbidden from mentioning your retrieval system.
- NEVER use: "candidate", "candidates", "provided verses", "retrieved", "context window"
- NEVER use: "النصوص الموجودة", "الآيات الموجودة", "هذه الآيات", "الآيات المرشحة", "النصوص المقدمة"
Act as if you are answering naturally from memory.

RULE 5 — NO METAPHORS OR WORDPLAY:
Do not use verses about literal smoke/fire (e.g., Day of Judgment) to answer questions about modern concepts like smoking (التدخين).

RULE 6 — SPEAKER AWARENESS:
Check the surah name before attributing a verse to a person. For example:
- Verses in "Ash-Shuara" (26) about "عدو" refer to ABRAHAM speaking about idols, NOT Moses about Pharaoh.
- Verses about Moses and Pharaoh are in Surahs 7 (Al-Araf), 10 (Yunus), 20 (Taha), 28 (Al-Qasas).
Do NOT misattribute verses to the wrong speaker.

RULE 7 — SAFETY REFUSAL (LOWEST PRIORITY):
This rule ONLY applies when ALL of these conditions are met:
1. The question is NOT a factual question (Rule 1 does not apply), AND
2. The question asks for a religious ruling or theme, AND
3. The candidate verses do NOT contain the answer.

If ALL three conditions are met, reply EXACTLY with:
- English: "I'm sorry, I cannot find the specific verses to accurately answer that right now."
- Arabic: "عذراً، لا أستطيع العثور على الآيات الدقيقة للإجابة على ذلك حالياً."
Stop generating after this sentence. Do not elaborate.

═══════════════════════════════════════════
QUERY TYPE GUIDANCE:
═══════════════════════════════════════════
- Fact/Trivia (كم عدد, ما هي أطول, في أي سورة): Rule 1 → answer directly from knowledge.
- Religious ruling (حكم, هل يجوز): Rule 3 → give the ruling, quote the strongest verse.
- Story/Prophet (قصة, من هو): Rule 3 + Rule 6 → identify surah, tell story, quote key verse.
- Empathy/Comfort: Brief comfort, then 1-2 verses from candidates.
- Modern topic not in Quran (سيارة, كريبتو, تدخين): Rule 7 → safety refusal, OR cite general principle verse if one exists in candidates (e.g. 2:195 for harm).`

const EXPANSION_SYSTEM_PROMPT = `You are a Qur'an search-query expansion assistant.

Given a user question (in Arabic or English), generate 6-10 short Arabic search terms that would find the relevant verses by substring match against the Uthmani text of the Qur'an. Think of the actual Arabic words the verses USE.

CRITICAL RULES:
1. For questions about rulings/haram/halal, MUST include exact Uthmani root words of prohibition: "حرم", "اجتنبوه", "رجس", "إثم".
2. YOU MUST INCLUDE MORPHOLOGICAL VARIANTS OF THE MAIN NOUN/VERB IN THE USER'S QUERY. If they ask about "الصابرين", you must include "صبروا", "يصبرون", "صبر", "الصابرين". Do not just rely on generic reward/punishment words.
3. Include the modern Arabic term AND the Quranic Arabic variant (e.g., both "الخمر" and "خمر").
4. For factual questions (كم عدد, ما هي أطول), still generate search terms in case they're needed for context, but keep it simple.

Return STRICT JSON: { "terms": ["...", "...", ...] }

Examples:
Input: "حكم شرب الخمر"
Output: { "terms": ["الخمر", "الميسر", "اجتنبوه", "رجس من عمل الشيطان", "إثم كبير", "حرم", "intoxicants"] }

Input: "ما هو جزاء الصابرين"
Output: { "terms": ["الصابرين", "صبروا", "يصبرون", "أجرهم بغير حساب", "بما صبروا", "صبر", "patient", "patience"] }

Input: "من هو عدو موسى"
Output: { "terms": ["فرعون", "آل فرعون", "هامان", "موسى وفرعون", "Pharaoh"] }

Input: "من هم المتقين"
Output: { "terms": ["المتقين", "يتقون", "الذين يتقون", "خشية", "God-fearing"] }

Input: "كم عدد سور القرآن"
Output: { "terms": ["القرآن", "سورة"] }

Input: "في أي سورة توجد آية الكرسي"
Output: { "terms": ["آية الكرسي", "الكرسي", "الله لا إله إلا هو"] }`

// ── Surah name lookup ──────────────────────────────────────────────────────

const SURAHS: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa',
  5: 'Al-Maidah', 6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal',
  9: 'At-Tawbah', 10: 'Yunus', 11: 'Hud', 12: 'Yusuf',
  13: 'Ar-Rad', 14: 'Ibrahim', 15: 'Al-Hijr', 16: 'An-Nahl',
  17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Taha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur',
  25: 'Al-Furqan', 26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas',
  29: 'Al-Ankabut', 30: 'Ar-Rum', 31: 'Luqman', 32: 'As-Sajdah',
  33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir', 36: 'Ya-Sin',
  37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan',
  45: 'Al-Jathiyah', 46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath',
  49: 'Al-Hujurat', 50: 'Qaf', 51: 'Adh-Dhariyat', 52: 'At-Tur',
  53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman', 56: 'Al-Waqiah',
  57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumua', 63: 'Al-Munafiqun', 64: 'At-Taghabun',
  65: 'At-Talaq', 66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam',
  69: 'Al-Haqqah', 70: 'Al-Maarij', 71: 'Nuh', 72: 'Al-Jinn',
  73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat',
  80: 'Abasa', 81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin',
  84: 'Al-Inshiqaq', 85: 'Al-Buruj', 86: 'At-Tariq', 87: 'Al-Ala',
  88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad', 91: 'Ash-Shams',
  92: 'Al-Layl', 93: 'Ad-Duhaa', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah',
  100: 'Al-Adiyat', 101: 'Al-Qariah', 102: 'At-Takathur',
  103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil', 106: 'Quraysh',
  107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun',
  110: 'An-Nasr', 111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq',
  114: 'An-Nas',
}

function surahName(vk: string): string {
  const surah = parseInt(vk.split(':')[0], 10)
  return SURAHS[surah] ?? ''
}

// ── Question type classifier ───────────────────────────────────────────────

type QuestionType = 'factual' | 'ruling' | 'story' | 'comfort' | 'general'

function classifyQuestion(q: string): QuestionType {
  const lower = q.trim()

  const factualPatterns = [
    /كم عدد/i, /ما هي أطول/i, /ما هي أقصر/i, /في أي سورة/i,
    /ما هي أول/i, /ما هي آخر/i, /كم آية/i,
    /how many/i, /what is the longest/i, /what is the shortest/i,
    /in which surah/i, /which surah/i, /how many surahs/i,
    /how many ayahs/i, /who revealed/i, /what is the first surah/i,
    /what is the last surah/i,
  ]

  const rulingPatterns = [
    /حكم/i, /هل يجوز/i, /حرام أم حلال/i, /ما هو حكم/i,
    /is it (haram|halal|permissible)/i, /ruling/i,
  ]

  const storyPatterns = [
    /قصة/i, /من هو/i, /من هي/i, /who is/i, /story of/i,
  ]

  for (const p of factualPatterns) {
    if (p.test(lower)) return 'factual'
  }
  for (const p of rulingPatterns) {
    if (p.test(lower)) return 'ruling'
  }
  for (const p of storyPatterns) {
    if (p.test(lower)) return 'story'
  }
  return 'general'
}

// ── In-process Quran index & search ────────────────────────────────────────
// THIS IS THE KEY FIX: Instead of fetching /api/search over HTTP (which
// fails on Vercel because getBaseUrl() returns empty, or self-fetching
// deadlocks), we build and search the index IN-PROCESS.

interface IndexedVerse {
  surahId: number
  verseId: number
  text: string
  base: string
  fuzzy: string
  concat: string
  baseMap: number[]
}

let indexPromise: Promise<IndexedVerse[]> | null = null

async function getIndex(): Promise<IndexedVerse[]> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const res = await fetch(
        'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json',
        { cache: 'force-cache' },
      )
      if (!res.ok) throw new Error('Failed to fetch Quran dataset')
      const data: Array<{ id: number; verses: Array<{ id: number; text: string }> }> =
        await res.json()

      const out: IndexedVerse[] = []
      for (const surah of data) {
        for (const verse of surah.verses) {
          const { base, map } = buildIndexMap(verse.text)
          out.push({
            surahId: surah.id,
            verseId: verse.id,
            text: verse.text,
            base,
            fuzzy: normalizeAlefFuzzy(verse.text),
            concat: normalizeConcat(verse.text),
            baseMap: map,
          })
        }
      }
      return out
    })().catch((err) => {
      indexPromise = null
      throw err
    })
  }
  return indexPromise
}

interface SearchHit {
  verse_key: string
  text: string
  strict: boolean
}

/**
 * Search the Quran index directly in-process.
 * This replaces the old HTTP fetch to /api/search that was silently
 * failing on Vercel Serverless.
 */
async function searchQuran(query: string, maxResults = 30): Promise<SearchHit[]> {
  if (!query || query.trim().length < 2) return []

  const raw = query.trim()
  const index = await getIndex()
  const qBase = normalizeBase(raw)
  const qFuzzy = normalizeAlefFuzzy(raw)
  const qConcat = normalizeConcat(raw)

  if (qBase.length < 2 && qFuzzy.length < 2 && qConcat.length < 2) return []

  const hits: SearchHit[] = []
  const seenKeys = new Set<string>()

  // Tier 1: Strict match (diacritics stripped, alef variants preserved)
  if (qBase.length >= 2) {
    for (const entry of index) {
      if (hits.length >= maxResults) break
      const idx = entry.base.indexOf(qBase)
      if (idx === -1) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.add(vk)
      hits.push({ verse_key: vk, text: entry.text, strict: true })
    }
  }

  // Tier 2: Fuzzy match (alef-unified, ta→ha, ya↔alif maqsurah)
  if (hits.length < 5 && qFuzzy.length >= 2) {
    for (const entry of index) {
      if (hits.length >= maxResults) break
      if (!entry.fuzzy.includes(qFuzzy)) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.add(vk)
      hits.push({ verse_key: vk, text: entry.text, strict: false })
    }
  }

  // Tier 3: Concat match (spaces removed, last resort)
  if (hits.length === 0 && qConcat.length >= 2) {
    for (const entry of index) {
      if (hits.length >= maxResults) break
      if (!entry.concat.includes(qConcat)) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.add(vk)
      hits.push({ verse_key: vk, text: entry.text, strict: false })
    }
  }

  return hits
}

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Groq chat helper ───────────────────────────────────────────────────────

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

// ── Query expansion ────────────────────────────────────────────────────────

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

function stripMark(s: string): string {
  return s.replace(/<\/?mark>/g, '')
}

// ── Candidate merge cap ────────────────────────────────────────────────────
const MAX_CANDIDATES = 25

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: AskBody
  try {
    body = (await req.json()) as AskBody
  } catch {
    return badRequest('invalid JSON body')
  }
  const question = (body.question ?? '').trim()
  const clientCandidates = body.candidates ?? []
  if (question.length < 2) return badRequest('question is required (>= 2 chars)')

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

  // 0. Classify the question type
  const qType = classifyQuestion(question)

  // 1. Expand the query into multiple Arabic search terms
  const terms = await expandQuery(question, apiKey)

  // 2. IN-PROCESS lexical search (no HTTP fetch!)
  //    This was the #1 bug: the old code fetched /api/search over HTTP,
  //    which silently failed on Vercel because getBaseUrl() returned ""
  //    and self-fetching could deadlock.
  const lexicalLists = await Promise.all(
    terms.map((t) => searchQuran(t)),
  )

  // 3. Merge: Lexical hits FIRST (exact keyword matches),
  //    then client semantic candidates SECOND.
  //    Dedupe by verse_key, cap at MAX_CANDIDATES.
  const seen = new Set<string>()
  const merged: Array<{ vk: string; ar: string; tr: string }> = []

  // Lexical goes FIRST because it is highly specific
  for (const list of lexicalLists) {
    for (const h of list) {
      if (seen.has(h.verse_key)) continue
      seen.add(h.verse_key)
      merged.push({ vk: h.verse_key, ar: stripMark(h.text), tr: '' })
      if (merged.length >= MAX_CANDIDATES) break
    }
    if (merged.length >= MAX_CANDIDATES) break
  }

  // Client Semantic goes SECOND as a fallback
  for (const c of clientCandidates) {
    if (!c?.vk || seen.has(c.vk)) continue
    seen.add(c.vk)
    merged.push(c)
    if (merged.length >= MAX_CANDIDATES) break
  }

  if (merged.length === 0) {
    // For factual questions, we can still answer without candidates
    if (qType !== 'factual') {
      return NextResponse.json(
        {
          error:
            'No candidate verses retrieved. Try rephrasing the question more specifically.',
        },
        { status: 422 },
      )
    }
  }

  // 4. Build candidate block WITH surah names for speaker awareness
  const candidateBlock = merged.length > 0
    ? merged
        .map(
          (c, i) =>
            `${i + 1}. [${c.vk} - ${surahName(c.vk)}] ${c.ar}` +
            (c.tr ? `\n   English: ${c.tr}` : ''),
        )
        .join('\n\n')
    : '(No candidate verses were retrieved for this question.)'

  // 5. Build the user message WITH question type hint
  const typeHint = `[QUESTION TYPE: ${qType.toUpperCase()}]`
  const userMessage =
    `${typeHint}\n\n` +
    `Question: ${question}\n\n` +
    `Candidate verses:\n\n${candidateBlock}\n\n` +
    `Now respond following the rules. Remember: if this is a FACTUAL question (type FACTUAL), you MUST answer directly from your knowledge per Rule 1. Cite verses with [S:V] notation only when using candidate verses.`

  // 6. Generate answer via Groq
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

  // 7. Validate citations — remove any [S:V] that the LLM hallucinated
  const validVkSet = new Set(merged.map((c) => c.vk))
  let validatedAnswer = answer
  for (const match of answer.matchAll(/\[(\d{1,3}\s*[:：]\s*\d{1,3})\]/g)) {
    const raw = match[1]
    const vk = raw.replace(/\s/g, '').replace(/：/, ':')
    if (!validVkSet.has(vk)) {
      validatedAnswer = validatedAnswer.replace(`[${raw}]`, '')
    }
  }
  answer = validatedAnswer

  // 8. Extract cited verses for the response
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
    question_type: qType,
    model: MODEL,
  })
}
