/**
 * Client-side semantic / concept search for Quran verses.
 *
 * Hybrid: combines two signals so the user gets both direct text
 * matches AND meaning-based matches in the same result list.
 *
 *   1. LEXICAL — calls the existing `/api/search` endpoint with the
 *      raw query. Anything containing the query word verbatim wins
 *      and is ranked first. (Catches user expectation of "I typed
 *      الحزن so I should see verses with that word".)
 *
 *   2. SEMANTIC — embeds the query in the browser using transformers.js
 *      (model: Xenova/multilingual-e5-base, 768-dim, multilingual,
 *      retrieval-tuned), computes cosine similarity against
 *      pre-computed verse embeddings shipped at /embeddings/, and
 *      returns the top conceptually-related verses. (Catches
 *      "patience" → 70:5, "I'm sad" → comfort verses, etc.)
 *
 * Lexical hits are de-duplicated against the semantic list and shown
 * first; remaining slots are filled with semantic matches.
 *
 * No server, no API key, no recurring cost. The embedding model is
 * downloaded once per browser from Hugging Face Hub and cached in
 * IndexedDB by transformers.js for all future visits.
 */

// MUST match MODEL_NAME in scripts/generate-embeddings.mjs. The
// vectors shipped in public/embeddings/verses.bin were produced by
// this exact model — embedding queries with a different one would
// land in a different vector space and produce garbage matches.
const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'

export interface ConceptSearchResult {
  verse_key: string
  text: string         // Arabic Uthmani (may include <mark> highlights for lexical hits)
  translation: string  // English (Saheeh International)
  score: number        // 0–1 — exact lexical hits = 1.0, semantic = cosine
  matched: 'lexical' | 'semantic'
}

export type ConceptSearchStatus =
  | 'loading-model'
  | 'loading-embeddings'
  | 'embedding-query'
  | 'searching'

interface VerseMeta { vk: string; ar: string; tr: string }

interface MetaFile {
  model: string
  dimensions: number
  normalized: boolean
  count: number
  verses: VerseMeta[]
}

interface DataCache {
  meta: MetaFile
  vectors: Float32Array
  byKey: Map<string, VerseMeta>
}

let extractorPromise: Promise<unknown> | null = null
let dataPromise: Promise<DataCache> | null = null

function getExtractor() {
  if (extractorPromise) return extractorPromise
  extractorPromise = (async () => {
    const tfjs = await import('@huggingface/transformers')
    return tfjs.pipeline('feature-extraction', MODEL_NAME, {
      // q8 (8-bit quantized) is ~4× smaller than fp32 with negligible
      // quality loss for sentence-similarity at this scale.
      dtype: 'q8',
    })
  })()
  return extractorPromise
}

function getData(): Promise<DataCache> {
  if (dataPromise) return dataPromise
  dataPromise = (async () => {
    const [metaRes, binRes] = await Promise.all([
      fetch('/embeddings/verses-meta.json'),
      fetch('/embeddings/verses.bin'),
    ])
    if (!metaRes.ok) throw new Error('verses-meta.json not found')
    if (!binRes.ok) throw new Error('verses.bin not found')
    const meta = (await metaRes.json()) as MetaFile
    const buf = await binRes.arrayBuffer()
    const vectors = new Float32Array(buf)
    const expected = meta.count * meta.dimensions
    if (vectors.length !== expected) {
      throw new Error(
        `verses.bin has ${vectors.length} floats; meta says ${expected} ` +
          `(count=${meta.count} × dim=${meta.dimensions}). Regenerate.`,
      )
    }
    const byKey = new Map<string, VerseMeta>()
    for (const v of meta.verses) byKey.set(v.vk, v)
    return { meta, vectors, byKey }
  })()
  return dataPromise.catch((e) => {
    dataPromise = null
    throw e
  })
}

interface LexicalHit {
  verse_key: string
  text: string  // includes <mark> tags
  strict?: boolean
}

async function fetchLexical(query: string): Promise<LexicalHit[]> {
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
    if (!r.ok) return []
    const j = await r.json()
    return (j.results || []) as LexicalHit[]
  } catch {
    return []
  }
}

export function preloadConceptSearch() {
  if (typeof window === 'undefined') return
  getData().catch(() => {})
  getExtractor().catch(() => {})
}

export async function searchByConcept(
  query: string,
  onStatus?: (status: ConceptSearchStatus) => void,
  topK = 25,
  minScore = 0.32,  // MiniLM cosines are typically 0.3–0.6 for related verses
): Promise<ConceptSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  // Kick off all three loads in parallel: model, embeddings, lexical.
  // Lexical comes back fastest (network only), then we add semantic
  // when ready. The user often gets the most relevant direct matches
  // before the embedding model finishes downloading on first use.
  onStatus?.('loading-model')
  const extractorPromise = getExtractor()
  onStatus?.('loading-embeddings')
  const dataReady = getData()
  const lexicalReady = fetchLexical(q)

  const [extractor, data, lexicalHits] = await Promise.all([
    extractorPromise,
    dataReady,
    lexicalReady,
  ])

  onStatus?.('embedding-query')
  const result = (await (extractor as (
    text: string,
    opts: { pooling: 'mean'; normalize: boolean },
  ) => Promise<{ data: Float32Array }>)(q, {
    pooling: 'mean',
    normalize: true,
  }))
  const queryVec = result.data
  if (queryVec.length !== data.meta.dimensions) {
    throw new Error(
      `query embedded to dim ${queryVec.length}, expected ${data.meta.dimensions}`,
    )
  }

  onStatus?.('searching')
  const dim = data.meta.dimensions
  const verseCount = data.meta.count
  const scores = new Array<{ idx: number; score: number }>(verseCount)
  const vectors = data.vectors
  for (let i = 0; i < verseCount; i++) {
    let dot = 0
    const offset = i * dim
    for (let j = 0; j < dim; j++) {
      dot += vectors[offset + j] * queryVec[j]
    }
    scores[i] = { idx: i, score: dot }
  }
  scores.sort((a, b) => b.score - a.score)

  // Build the merged result list. Lexical hits go first (they're
  // verbatim matches, the user definitely wants them), then semantic
  // hits fill the remaining slots, deduped against lexical.
  const seen = new Set<string>()
  const out: ConceptSearchResult[] = []

  for (const lex of lexicalHits) {
    if (seen.has(lex.verse_key)) continue
    seen.add(lex.verse_key)
    const meta = data.byKey.get(lex.verse_key)
    out.push({
      verse_key: lex.verse_key,
      // Keep the highlighted Arabic from /api/search (with <mark> tags).
      text: lex.text,
      translation: meta?.tr || '',
      score: 1.0,
      matched: 'lexical',
    })
    if (out.length >= topK) return out
  }

  for (const s of scores) {
    if (out.length >= topK) break
    if (s.score < minScore) break
    const v = data.meta.verses[s.idx]
    if (seen.has(v.vk)) continue
    seen.add(v.vk)
    out.push({
      verse_key: v.vk,
      text: v.ar,
      translation: v.tr,
      score: s.score,
      matched: 'semantic',
    })
  }

  return out
}
