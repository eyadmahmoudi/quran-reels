// app/api/ask/route.ts
// Qur'an Q&A RAG endpoint — v5
//
// Pipeline: User question → Groq query expansion → MULTI-WORD lexical search →
// merge with client semantic candidates → Groq answer generation.
//
// v5 CHANGES from v4:
// - Multi-word search: "جزاء الصابرين" now finds 39:10 (which has both words
//   but not adjacent) by splitting the query and using AND logic
// - Morphological normalization (ون↔ين): "الصابرين" now matches "الصابرون"
// - Better candidate ranking: results sorted by relevance score
// - Prompt v5: Added EXACT PHRASE MATCH rule so LLM prefers verses that
//   contain the exact queried phrase over partial matches
// - Expanded terms filter: strips non-Arabic/non-English junk terms
// - Surah names in Arabic: added Arabic surah names alongside English

import { NextRequest, NextResponse } from 'next/server'
import {
  searchQuranMulti,
  getQuranIndex,
  normalizeBase,
  normalizeAlefFuzzy,
  normalizeMorpho,
  buildIndexMap,
} from '@/lib/arabic-search'

export const runtime = 'nodejs'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

// ── Answer prompt (v5 — Exact Phrase + Factual Override as top rules) ─────

const ANSWER_SYSTEM_PROMPT = `You are a knowledgeable, warm, conversational Qur'an assistant.

═══════════════════════════════════════════
RULES (ORDERED BY PRIORITY — Rule 1 > Rule 8):
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
This rule ALWAYS wins over Rule 8 (safety refusal). NEVER refuse a factual question.

RULE 2 — EXACT PHRASE PREFERENCE:
When multiple candidate verses are available, STRONGLY prefer verses that contain the EXACT phrase from the user's question. For example:
- If the user asks "من قال إنهم عدو لي", prefer the verse that contains "عدو لي" (26:77 - Abraham) over a verse that contains "عدو لكم" (18:50 - Allah about Iblis), because "عدو لي" matches the EXACT query phrase while "عدو لكم" does not.
- If the user asks about "الصابرين", prefer verses with "الصابرين" over verses with "الصابرون" when both are available.

RULE 3 — LANGUAGE MATCH:
Respond in the SAME LANGUAGE as the user's question.

RULE 4 — USE CANDIDATE VERSES:
For questions about themes, rulings, stories, and context, USE ONLY THE CANDIDATE VERSES provided below. Quote the strongest verse fully. Cite as [S:V].

RULE 5 — VOCABULARY BAN:
You are strictly forbidden from mentioning your retrieval system.
- NEVER use: "candidate", "candidates", "provided verses", "retrieved", "context window"
- NEVER use: "النصوص الموجودة", "الآيات الموجودة", "هذه الآيات", "الآيات المرشحة", "النصوص المقدمة"
Act as if you are answering naturally from memory.

RULE 6 — NO METAPHORS OR WORDPLAY:
Do not use verses about literal smoke/fire (e.g., Day of Judgment) to answer questions about modern concepts like smoking (التدخين).

RULE 7 — SPEAKER AWARENESS:
Check the surah name before attributing a verse to a person. For example:
- Verses in "Ash-Shuara" (26) about "عدو لي" are ABRAHAM speaking about idols, NOT Moses about Pharaoh.
- Verses about Moses and Pharaoh are in Surahs 7 (Al-Araf), 10 (Yunus), 20 (Taha), 28 (Al-Qasas).
- In Surah Taha (20:39), "عدو لي" is ALLAH speaking about Pharaoh as His enemy.
- In Surah Ash-Shuara (26:77), "عدو لي" is ABRAHAM speaking about idols.
- The PRONOUN after "عدو" distinguishes the speaker: "لي" (to me) vs "لكم" (to you).
Do NOT misattribute verses to the wrong speaker.

═══════════════════════════════════════════
RULE 8 — SAFETY REFUSAL (LOWEST PRIORITY):
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
- Religious ruling (حكم, هل يجوز): Rule 4 → give the ruling, quote the strongest verse.
- Story/Prophet (قصة, من هو): Rule 4 + Rule 7 → identify surah, tell story, quote key verse.
- Empathy/Comfort: Brief comfort, then 1-2 verses from candidates.
- Modern topic not in Quran (سيارة, كريبتو, تدخين): Rule 8 → safety refusal, OR cite general principle verse if one exists in candidates (e.g. 2:195 for harm).`

const EXPANSION_SYSTEM_PROMPT = `You are a Qur'an search-query expansion assistant.

Given a user question (in Arabic or English), generate 6-10 short Arabic search terms that would find the relevant verses by substring match against the Uthmani text of the Qur'an. Think of the actual Arabic words the verses USE.

CRITICAL RULES:
1. For questions about rulings/haram/halal, MUST include exact Quranic root words: "حرم", "اجتنبوه", "رجس", "إثم".
2. YOU MUST INCLUDE MORPHOLOGICAL VARIANTS OF THE MAIN NOUN/VERB. If they ask about "الصابرين", you must include BOTH "الصابرين" AND "الصابرون" (the nominative form). Also include verb forms: "صبروا", "يصبرون", "صبر".
3. Include the modern Arabic term AND the Quranic Arabic variant (e.g., both "الخمر" and "خمر").
4. For questions with pronouns like "عدو لي", include the exact phrase "عدو لي" AND the variant "عدو لكم" because different speakers use different pronouns.
5. For multi-word queries, include each important word separately AND the full phrase. E.g., "جزاء الصابرين" → include "جزاء", "الصابرين", "الصابرون", AND "جزاء الصابرين".
6. ONLY output Arabic and English terms. NO Chinese, Japanese, Korean, or other non-Arabic/non-English characters.
7. For factual questions (كم عدد, ما هي أطول), still generate search terms in case they're needed for context, but keep it simple.

Return STRICT JSON: { "terms": ["...", "...", ...] }

Examples:
Input: "حكم شرب الخمر"
Output: { "terms": ["الخمر", "الميسر", "اجتنبوه", "رجس من عمل الشيطان", "إثم كبير", "حرم"] }

Input: "ما هو جزاء الصابرين"
Output: { "terms": ["الصابرين", "الصابرون", "جزاء", "صبروا", "يصبرون", "أجرهم بغير حساب", "بما صبروا", "صبر"] }

Input: "من قال إنهم عدو لي"
Output: { "terms": ["عدو لي", "عدو لكم", "إنهم عدو", "فرعون", "إبليس", "إبراهيم"] }

Input: "كم عدد سور القرآن"
Output: { "terms": ["القرآن", "سورة"] }

Input: "في أي سورة توجد آية الكرسي"
Output: { "terms": ["آية الكرسي", "الكرسي", "الله لا إله إلا هو"] }`

// ── Surah name lookup (English + Arabic) ───────────────────────────────────

const SURAHS_EN: Record<number, string> = {
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

const SURAHS_AR: Record<number, string> = {
  1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء',
  5: 'المائدة', 6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال',
  9: 'التوبة', 10: 'يونس', 11: 'هود', 12: 'يوسف',
  13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر', 16: 'النحل',
  17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
  21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور',
  25: 'الفرقان', 26: 'الشعراء', 27: 'النمل', 28: 'القصص',
  29: 'العنكبوت', 30: 'الروم', 31: 'لقمان', 32: 'السجدة',
  33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر', 36: 'يس',
  37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان',
  45: 'الجاثية', 46: 'الأحقاف', 47: 'محمد', 48: 'الفتح',
  49: 'الحجرات', 50: 'ق', 51: 'الذاريات', 52: 'الطور',
  53: 'النجم', 54: 'القمر', 55: 'الرحمن', 56: 'الواقعة',
  57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
  61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن',
  65: 'الطلاق', 66: 'التحريم', 67: 'الملك', 68: 'القلم',
  69: 'الحاقة', 70: 'المعارج', 71: 'نوح', 72: 'الجن',
  73: 'المزمل', 74: 'المدثر', 75: 'القيامة',
  76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات',
  80: 'عبس', 81: 'التكوير', 82: 'الانفطار', 83: 'المطففين',
  84: 'الانشقاق', 85: 'البروج', 86: 'الطارق', 87: 'الأعلى',
  88: 'الغاشية', 89: 'الفجر', 90: 'البلد', 91: 'الشمس',
  92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين',
  96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة',
  100: 'العاديات', 101: 'القارعة', 102: 'التكاثر',
  103: 'العصر', 104: 'الهمزة', 105: 'الفيل', 106: 'قريش',
  107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون',
  110: 'النصر', 111: 'المسد', 112: 'الإخلاص', 113: 'الفلق',
  114: 'الناس',
}

function surahName(vk: string): string {
  const surah = parseInt(vk.split(':')[0], 10)
  const en = SURAHS_EN[surah] ?? ''
  const ar = SURAHS_AR[surah] ?? ''
  return ar ? `${en} / ${ar}` : en
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
    /قصة/i, /من هو/i, /من هي/i, /من قال/i, /who is/i, /story of/i,
    /who said/i,
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

/**
 * Filter expanded terms to remove non-Arabic/non-English junk.
 * The LLM sometimes outputs Chinese, Japanese, or other characters
 * that are useless for Arabic substring search.
 */
function isSearchableTerm(term: string): boolean {
  if (term.trim().length < 2) return false
  // Allow Arabic, English, and common punctuation only
  const cleaned = term.replace(/[\s\-,.،؛:!?'"()]/g, '')
  if (cleaned.length === 0) return false
  // Must contain at least one Arabic or English letter
  return /[\u0600-\u06FFa-zA-Z]/.test(cleaned)
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
      ? parsed.terms
          .filter((t): t is string => typeof t === 'string' && isSearchableTerm(t))
      : []
    if (!terms.some((t) => t === question)) terms.unshift(question)
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

  // 2. MULTI-WORD lexical search (no HTTP fetch!)
  //    Each term is searched individually using searchQuranMulti,
  //    which splits multi-word terms and finds verses containing ALL words.
  const lexicalLists = await Promise.all(
    terms.map((t) => searchQuranMulti(t)),
  )

  // 3. Merge: Lexical hits FIRST (exact keyword matches),
  //    then client semantic candidates SECOND.
  //    Dedupe by verse_key, cap at MAX_CANDIDATES.
  //    Track best score per verse for ranking.
  const seen = new Set<string>()
  const scoreMap = new Map<string, number>()
  const merged: Array<{ vk: string; ar: string; tr: string; score: number }> = []

  // Collect all lexical hits with their scores
  for (const list of lexicalLists) {
    for (const h of list) {
      if (seen.has(h.verse_key)) {
        // Update score if this hit is better
        const existing = merged.find((m) => m.vk === h.verse_key)
        if (existing && h.score > existing.score) {
          existing.score = h.score
        }
        continue
      }
      seen.add(h.verse_key)
      merged.push({ vk: h.verse_key, ar: stripMark(h.text), tr: '', score: h.score })
    }
  }

  // Sort by score descending — best matches first for the LLM
  merged.sort((a, b) => b.score - a.score)

  // Cap at MAX_CANDIDATES after sorting
  if (merged.length > MAX_CANDIDATES) {
    merged.length = MAX_CANDIDATES
  }

  // Client Semantic goes SECOND as a fallback
  for (const c of clientCandidates) {
    if (!c?.vk || seen.has(c.vk)) continue
    seen.add(c.vk)
    merged.push({ ...c, score: 0 })
    if (merged.length >= MAX_CANDIDATES + 5) break // Allow a few extra semantic candidates
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
        .slice(0, MAX_CANDIDATES)
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
    `Candidate verses (sorted by relevance, best matches first):\n\n${candidateBlock}\n\n` +
    `Now respond following the rules. Remember: if this is a FACTUAL question (type FACTUAL), you MUST answer directly from your knowledge per Rule 1. For other questions, prefer verses listed FIRST (they are the best matches). Cite verses with [S:V] notation only when using candidate verses.`

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
