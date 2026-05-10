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

const TASHKEEL_REGEX = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;

export function normalizeBase(text: string): string {
  return text
    .replace(/\u0670/g, 'ا')
    .replace(TASHKEEL_REGEX, '');
}

export function normalizeAlefFuzzy(text: string): string {
  return text
    .replace(/\u0670/g, 'ا')
    .replace(TASHKEEL_REGEX, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي');
}

export function normalizeMorpho(text: string): string {
  return normalizeAlefFuzzy(text)
    .replace(/ون(?=\s|$|،|\.|؛|:)/g, 'ين');
}

export function normalizeConcat(text: string): string {
  return normalizeMorpho(text).replace(/\s+/g, '');
}

export function buildIndexMap(text: string): { base: string; map: number[] } {
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
  score: number
}

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
  const seenKeys = new Map<string, number>()

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

export async function searchQuranMulti(
  query: string,
  maxResults = 30,
): Promise<SearchHit[]> {
  if (!query || query.trim().length < 2) return []
  const raw = query.trim()
  const phraseResults = await searchQuran(raw, maxResults)
  const stopWords = new Set([
    'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هو', 'هي', 'أن', 'إن',
    'لا', 'لم', 'لن', 'قد', 'ما', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
    'هل', 'كم', 'كيف', 'أين', 'متى', 'لماذا', 'لما', 'أي',
    'و', 'ف', 'ب', 'ل', 'ثم', 'أو', 'أم', 'بل', 'لكن',
    'is', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'and', 'or',
  ])
  const words = raw.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w))
  if (words.length < 2) return phraseResults

  const wordResults: Map<string, { totalScore: number; matchCount: number; text: string; bestStrict: boolean }> = new Map()
  for (const word of words) {
    const hits = await searchQuran(word, 100)
    for (const hit of hits) {
      const existing = wordResults.get(hit.verse_key)
      if (existing) {
        existing.totalScore += hit.score
        existing.matchCount++
        if (hit.strict) existing.bestStrict = true
      } else {
        wordResults.set(hit.verse_key, { totalScore: hit.score, matchCount: 1, text: hit.text, bestStrict: hit.strict })
      }
    }
  }

  const allWordHits: SearchHit[] = []
  for (const [vk, data] of wordResults) {
    if (data.matchCount >= words.length) {
      allWordHits.push({ verse_key: vk, text: data.text, strict: data.bestStrict, score: data.totalScore * data.matchCount })
    }
  }
  allWordHits.sort((a, b) => b.score - a.score)

  const seenKeys = new Set<string>()
  const merged: SearchHit[] = []
  for (const hit of allWordHits.slice(0, maxResults)) {
    if (!seenKeys.has(hit.verse_key)) { seenKeys.add(hit.verse_key); merged.push(hit) }
  }
  for (const hit of phraseResults) {
    if (merged.length >= maxResults) break
    if (!seenKeys.has(hit.verse_key)) { seenKeys.add(hit.verse_key); merged.push(hit) }
  }
  return merged
}