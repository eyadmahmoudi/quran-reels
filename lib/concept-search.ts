/**
 * Client-side semantic / concept search for Quran verses.
 *
 * No server, no API, no token, no recurring cost. The strategy:
 *
 *   1. Verse embeddings are pre-computed once locally (see
 *      `scripts/generate-embeddings.mjs`) using transformers.js with
 *      Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384-dim, multilingual).
 *      The resulting `verses.bin` + `verses-meta.json` ship as static
 *      assets in `public/embeddings/`.
 *
 *   2. The browser lazy-loads the same model from Hugging Face Hub on
 *      first concept search (cached in IndexedDB by transformers.js for
 *      future visits — ~100 MB one-time download, then instant).
 *
 *   3. The browser embeds the user's query, computes cosine similarity
 *      against all 6,236 verse vectors (sub-millisecond after the
 *      vectors are loaded), and returns the top matches.
 *
 * All embeddings are L2-normalized at generation time, so cosine
 * similarity reduces to a plain dot product — important because the
 * inner-loop hot path runs once per verse per query.
 */

const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'

export interface ConceptSearchResult {
  verse_key: string
  text: string         // Arabic Uthmani
  translation: string  // English (Saheeh International)
  score: number        // cosine similarity in [0, 1]
}

export type ConceptSearchStatus =
  | 'loading-model'
  | 'loading-embeddings'
  | 'embedding-query'
  | 'searching'

interface VerseMeta {
  vk: string
  ar: string
  tr: string
}

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
}

let extractorPromise: Promise<unknown> | null = null
let dataPromise: Promise<DataCache> | null = null

function getExtractor() {
  if (extractorPromise) return extractorPromise
  extractorPromise = (async () => {
    // Dynamic import keeps transformers.js out of the initial JS bundle
    // for users who never use concept search.
    const tfjs = await import('@huggingface/transformers')
    return tfjs.pipeline('feature-extraction', MODEL_NAME, {
      // q8 (8-bit quantized) is ~4× smaller than fp32 with ~no quality
      // loss for sentence-similarity. Saves ~80 MB on first download.
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
    return { meta, vectors }
  })()
  return dataPromise.catch((e) => {
    // Reset so the next attempt re-fetches.
    dataPromise = null
    throw e
  })
}

/**
 * Pre-warm the model + embeddings so the first user search returns
 * instantly. Call this from the search dialog as soon as the user
 * focuses the input. Errors are swallowed — they'll surface on the
 * actual search call.
 */
export function preloadConceptSearch() {
  if (typeof window === 'undefined') return
  getData().catch(() => {})
  getExtractor().catch(() => {})
}

export async function searchByConcept(
  query: string,
  onStatus?: (status: ConceptSearchStatus) => void,
  topK = 25,
  minScore = 0.35,
): Promise<ConceptSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  // Kick both off in parallel — they're independent.
  onStatus?.('loading-model')
  const extractorPromise = getExtractor()
  onStatus?.('loading-embeddings')
  const dataReady = getData()

  // Wait for both before continuing.
  const [extractor, data] = await Promise.all([extractorPromise, dataReady])

  onStatus?.('embedding-query')
  // The extractor pipeline output for a single string + mean pooling +
  // normalize=true is a Tensor of shape [1, dim] with .data as a flat
  // Float32Array of length `dim`.
  const result = (await (extractor as (
    text: string,
    opts: { pooling: 'mean'; normalize: boolean },
  ) => Promise<{ data: Float32Array }>)(q, { pooling: 'mean', normalize: true }))
  const queryVec = result.data
  if (queryVec.length !== data.meta.dimensions) {
    throw new Error(
      `query embedded to dim ${queryVec.length}, expected ${data.meta.dimensions}`,
    )
  }

  onStatus?.('searching')
  // Both query and verse vectors are L2-normalized, so cosine
  // similarity == dot product. ~6236 × 384 ≈ 2.4M mults per query →
  // a few milliseconds in modern V8.
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

  const top = scores.slice(0, topK).filter((s) => s.score >= minScore)
  return top.map((s) => {
    const v = data.meta.verses[s.idx]
    return {
      verse_key: v.vk,
      text: v.ar,
      translation: v.tr,
      score: s.score,
    }
  })
}
