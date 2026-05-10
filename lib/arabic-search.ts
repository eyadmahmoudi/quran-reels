// lib/arabic-search.ts
// Arabic text normalizer with Uthmani → modern Arabic matching support.
//
// KEY FIXES (v5):
// 1. SUPERSCRIPT ALEF (U+0670 ـٰ): Converted to ا BEFORE stripping diacritics.
// 2. TATWEEL/KASHIDA (U+0640 ـ): Stripped as diacritic — purely visual.
// 3. MORPHOLOGICAL NORMALIZATION (ون↔ين): Arabic sound masculine plurals
//    alternate between nominative ـون and genitive/accusative ـين.
//    e.g. الصابرون (nom.) ↔ الصابرين (gen.) — both mean "the patient".
//    normalizeMorpho() unifies these to enable cross-case matching.
// 4. MULTI-WORD SEARCH: searchQuranMulti() splits multi-word queries and
//    finds verses containing ALL words (AND logic), not just the full phrase.
//    e.g. "جزاء الصابرين" → find verses with BOTH "جزاء" AND "الصابرين/الصابرون".

const TASHKEEL_REGEX = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;
//                              ^^^^^
//  U+0640 (TATWEEL/KASHIDA) — purely visual stretching, no phonetic value

/**
 * Strip all diacritics (tashkeel) AND tatweel from text.
 * Converts superscript alef (ـٰ) to regular alef (ا) first,
 * then removes remaining diacritical marks and tatweel.
 */
export function normalizeBase(text: string): string {
  return text
    .replace(/\u0670/g, 'ا') // dagger alef → real alef BEFORE stripping
    .replace(TASHKEEL_REGEX, '');
}

/**
 * Fuzzy normalization: strips diacritics+tatweel, unifies alef variants,
 * ta marbuta → ha, alif maqsurah/yah → yah.
 * Also handles dagger alef → regular alef.
 */
export function normalizeAlefFuzzy(text: string): string {
  return text
    .replace(/\u0670/g, 'ا') // dagger alef → real alef BEFORE stripping
    .replace(TASHKEEL_REGEX, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي');
}

/**
 * Morphological normalization: extends fuzzy normalization with
 * Arabic sound plural suffix normalization (ون↔ين).
 *
 * In Arabic, sound masculine plurals change their suffix based on
 * grammatical case:
 *   - Nominative (رفع): ـون  (e.g., الصابرون = the patient, nom.)
 *   - Genitive/Accusative (جر/نصب): ـين  (e.g., الصابرين = the patient, gen.)
 *
 * Both forms refer to the SAME concept. By normalizing ون→ين at word
 * boundaries, we enable search queries using one form to find verses
 * using the other form.
 *
 * We use a space/end-of-string lookahead to avoid false positives
 * (e.g., "عون" meaning "help" should NOT become "عين").
 */
export function normalizeMorpho(text: string): string {
  return normalizeAlefFuzzy(text)
    .replace(/ون(?=\s|$|،|\.|؛|:)/g, 'ين'); // ون→ين at word boundaries only
}

/**
 * Concat normalization: morphological + remove all whitespace.
 * Used as a last-resort match when strict, fuzzy, and morpho all fail.
 */
export function normalizeConcat(text: string): string {
  return normalizeMorpho(text).replace(/\s+/g, '');
}

/**
 * Build a base-string → original-position index map.
 * This allows us to find matches in the normalized text and then
 * highlight the correct span in the original Uthmani text.
 */
export function buildIndexMap(text: string): { base: string; map: number[] } {
  // Pre-process: replace superscript alef with regular alef (1-to-1 swap)
  const preprocessed = text.replace(/\u0670/g, 'ا');

  let base = '';
  const map: number[] = [];
  for (let i = 0; i < preprocessed.length; i++) {
    const char = preprocessed[i];
    if (!TASHKEEL_REGEX.test(char)) {
      base += char;
      map.push(i);
    }
  }
  return { base, map };
}

// ── Quran Index & Search ──────────────────────────────────────────────────

interface IndexedVerse {
  surahId: number
  verseId: number
  text: string
  base: string
  fuzzy: string
  morpho: string
  concat: string
  baseMap: number[]
}

let indexPromise: Promise<IndexedVerse[]> | null = null

export async function getQuranIndex(): Promise<IndexedVerse[]> {
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
            morpho: normalizeMorpho(verse.text),
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

export interface SearchHit {
  verse_key: string
  text: string
  strict: boolean
  score: number  // Higher = better match. strict=3, morpho=2, fuzzy=1, concat=0.5
}

/**
 * Single-term search across all normalization tiers.
 * Used for each expanded search term individually.
 */
export async function searchQuran(
  query: string,
  maxResults = 30,
): Promise<SearchHit[]> {
  if (!query || query.trim().length < 2) return []

  const raw = query.trim()
  const index = await getQuranIndex()
  const qBase = normalizeBase(raw)
  const qFuzzy = normalizeAlefFuzzy(raw)
  const qMorpho = normalizeMorpho(raw)
  const qConcat = normalizeConcat(raw)

  if (qBase.length < 2 && qFuzzy.length < 2 && qMorpho.length < 2 && qConcat.length < 2) return []

  const hits: SearchHit[] = []
  const seenKeys = new Map<string, number>() // key → score

  // Tier 1: Strict match (diacritics stripped, alef variants preserved) — score 3
  if (qBase.length >= 2) {
    for (const entry of index) {
      const idx = entry.base.indexOf(qBase)
      if (idx === -1) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.set(vk, 3)
      hits.push({ verse_key: vk, text: entry.text, strict: true, score: 3 })
      if (hits.length >= maxResults) break
    }
  }

  // Tier 2: Morphological match (ون↔ien unified) — score 2
  // This is NEW and bridges the gap between الصابرون and الصابرين
  if (hits.length < 5 && qMorpho.length >= 2) {
    for (const entry of index) {
      if (hits.length >= maxResults) break
      if (!entry.morpho.includes(qMorpho)) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.set(vk, 2)
      hits.push({ verse_key: vk, text: entry.text, strict: false, score: 2 })
    }
  }

  // Tier 3: Fuzzy match (alef-unified, ta→ha, ya↔alif maqsurah) — score 1
  if (hits.length < 5 && qFuzzy.length >= 2) {
    for (const entry of index) {
      if (hits.length >= maxResults) break
      if (!entry.fuzzy.includes(qFuzzy)) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.set(vk, 1)
      hits.push({ verse_key: vk, text: entry.text, strict: false, score: 1 })
    }
  }

  // Tier 4: Concat match (spaces removed, last resort) — score 0.5
  if (hits.length === 0 && qConcat.length >= 2) {
    for (const entry of index) {
      if (hits.length >= maxResults) break
      if (!entry.concat.includes(qConcat)) continue
      const vk = `${entry.surahId}:${entry.verseId}`
      if (seenKeys.has(vk)) continue
      seenKeys.set(vk, 0.5)
      hits.push({ verse_key: vk, text: entry.text, strict: false, score: 0.5 })
    }
  }

  return hits
}

/**
 * Multi-word search: splits the query into individual words and finds
 * verses that contain ALL words (AND logic). This is essential for
 * queries like "جزاء الصابرين" where the two words never appear adjacent
 * in any single verse, but verse 39:10 contains both concepts
 * ("يوفى الصابرون أجرهم بغير حساب").
 *
 * Returns results sorted by relevance (number of matched words × score tier).
 */
export async function searchQuranMulti(
  query: string,
  maxResults = 30,
): Promise<SearchHit[]> {
  if (!query || query.trim().length < 2) return []

  const raw = query.trim()

  // First try as a single phrase (the original behavior)
  const phraseResults = await searchQuran(raw, maxResults)

  // Split into words, filtering out common Arabic stop words
  const stopWords = new Set([
    'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هو', 'هي', 'أن', 'إن',
    'لا', 'لم', 'لن', 'قد', 'ما', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
    'هل', 'كم', 'كيف', 'أين', 'متى', 'لماذا', 'لما', 'أي',
    'و', 'ف', 'ب', 'ل', 'ثم', 'أو', 'أم', 'بل', 'لكن',
    'is', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'and', 'or',
  ])

  const words = raw
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w))

  // If only one word after filtering, phrase results are sufficient
  if (words.length < 2) return phraseResults

  // For multi-word queries, find verses matching ALL words
  const index = await getQuranIndex()
  const wordResults: Map<string, { totalScore: number; matchCount: number; text: string; bestStrict: boolean }> = new Map()

  for (const word of words) {
    const hits = await searchQuran(word, 100) // Get more hits per word for intersection
    for (const hit of hits) {
      const existing = wordResults.get(hit.verse_key)
      if (existing) {
        existing.totalScore += hit.score
        existing.matchCount++
        if (hit.strict) existing.bestStrict = true
      } else {
        wordResults.set(hit.verse_key, {
          totalScore: hit.score,
          matchCount: 1,
          text: hit.text,
          bestStrict: hit.strict,
        })
      }
    }
  }

  // Filter to verses matching ALL query words
  const allWordHits: SearchHit[] = []
  for (const [vk, data] of wordResults) {
    if (data.matchCount >= words.length) {
      allWordHits.push({
        verse_key: vk,
        text: data.text,
        strict: data.bestStrict,
        score: data.totalScore * data.matchCount, // Boost verses matching more words
      })
    }
  }

  // Sort by score descending
  allWordHits.sort((a, b) => b.score - a.score)

  // Merge: multi-word hits first (more relevant), then phrase hits
  const seenKeys = new Set<string>()
  const merged: SearchHit[] = []

  for (const hit of allWordHits.slice(0, maxResults)) {
    if (!seenKeys.has(hit.verse_key)) {
      seenKeys.add(hit.verse_key)
      merged.push(hit)
    }
  }

  // Add phrase results as fallback
  for (const hit of phraseResults) {
    if (merged.length >= maxResults) break
    if (!seenKeys.has(hit.verse_key)) {
      seenKeys.add(hit.verse_key)
      merged.push(hit)
    }
  }

  return merged
}
