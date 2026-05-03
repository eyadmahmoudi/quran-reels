import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

// Required: filesystem access for the embeddings file means Node.js
// runtime, not Edge.
export const runtime = 'nodejs'

// Cache the bin + meta in module scope so cold-start cost is amortized
// across all subsequent requests on the same serverless instance.
interface EmbeddingsCache {
  embeddings: Float32Array
  verses: Array<{ vk: string; ar: string; tr: string }>
  dimensions: number
  model: string
}

let cache: EmbeddingsCache | null = null
let cacheLoadError: string | null = null

const META_PATH = path.join(process.cwd(), 'public', 'embeddings', 'verses-meta.json')
const BIN_PATH = path.join(process.cwd(), 'public', 'embeddings', 'verses.bin')

function loadEmbeddings(): EmbeddingsCache | null {
  if (cache) return cache
  if (cacheLoadError) return null
  if (!existsSync(META_PATH) || !existsSync(BIN_PATH)) {
    cacheLoadError =
      'embeddings files not found in public/embeddings/. Run `node scripts/generate-embeddings.mjs` to create them.'
    return null
  }
  try {
    const meta = JSON.parse(readFileSync(META_PATH, 'utf-8'))
    const buffer = readFileSync(BIN_PATH)
    // Buffer → Float32Array. Buffer.byteOffset is non-zero for slices,
    // so we must pass it explicitly.
    const embeddings = new Float32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / 4,
    )
    const expectedFloats = meta.count * meta.dimensions
    if (embeddings.length !== expectedFloats) {
      throw new Error(
        `embeddings.bin is ${embeddings.length} floats; meta says ${expectedFloats} ` +
          `(count=${meta.count} × dim=${meta.dimensions}). Regenerate.`,
      )
    }
    cache = {
      embeddings,
      verses: meta.verses,
      dimensions: meta.dimensions,
      model: meta.model,
    }
    return cache
  } catch (e) {
    cacheLoadError = e instanceof Error ? e.message : String(e)
    console.error('[concept-search] failed to load embeddings:', cacheLoadError)
    return null
  }
}

async function embedQuery(
  query: string,
  dimensions: number,
  model: string,
  apiKey: string,
): Promise<Float32Array> {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: query, dimensions }),
  })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`OpenAI embeddings failed: HTTP ${r.status} ${body.slice(0, 200)}`)
  }
  const data = await r.json()
  const v = data.data?.[0]?.embedding
  if (!Array.isArray(v) || v.length !== dimensions) {
    throw new Error(`OpenAI returned unexpected shape (len=${v?.length})`)
  }
  return new Float32Array(v)
}

/**
 * Cosine similarity between row `rowIndex` of the matrix and the query
 * vector. Both must have the same length (= dimensions). Avoids
 * per-call allocation by working directly on typed arrays.
 */
function cosineRow(
  matrix: Float32Array,
  rowIndex: number,
  rowLen: number,
  query: Float32Array,
  queryNorm: number,
): number {
  const offset = rowIndex * rowLen
  let dot = 0
  let magA = 0
  for (let i = 0; i < rowLen; i++) {
    const a = matrix[offset + i]
    dot += a * query[i]
    magA += a * a
  }
  // queryNorm pre-computed once outside the loop.
  return dot / (Math.sqrt(magA) * queryNorm)
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ results: [] })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        results: [],
        error:
          'concept search is not configured: OPENAI_API_KEY missing. Add it to your Vercel environment variables.',
      },
      { status: 503 },
    )
  }

  const data = loadEmbeddings()
  if (!data) {
    return NextResponse.json(
      {
        results: [],
        error: cacheLoadError ?? 'embeddings unavailable',
      },
      { status: 503 },
    )
  }

  let queryVec: Float32Array
  try {
    queryVec = await embedQuery(q, data.dimensions, data.model, apiKey)
  } catch (e) {
    return NextResponse.json(
      {
        results: [],
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    )
  }

  // Pre-compute query magnitude once.
  let queryMag = 0
  for (let i = 0; i < queryVec.length; i++) queryMag += queryVec[i] * queryVec[i]
  const queryNorm = Math.sqrt(queryMag)
  if (queryNorm === 0) {
    return NextResponse.json({ results: [] })
  }

  // Score every verse against the query. 6,236 × 512 mults ≈ 3M ops →
  // sub-millisecond in Node, no need for a vector DB at this scale.
  const verseCount = data.verses.length
  const dim = data.dimensions
  const scores = new Array<{ idx: number; score: number }>(verseCount)
  for (let i = 0; i < verseCount; i++) {
    scores[i] = {
      idx: i,
      score: cosineRow(data.embeddings, i, dim, queryVec, queryNorm),
    }
  }
  scores.sort((a, b) => b.score - a.score)

  const TOP_K = 25
  // Drop matches that are essentially noise (cosine < 0.18 is
  // basically unrelated under this model).
  const MIN_SCORE = 0.18
  const top = scores.slice(0, TOP_K).filter((s) => s.score >= MIN_SCORE)

  const results = top.map((s) => {
    const v = data.verses[s.idx]
    return {
      verse_key: v.vk,
      text: v.ar,
      translation: v.tr,
      score: Number(s.score.toFixed(4)),
    }
  })

  return NextResponse.json({
    results,
    query: q,
    model: data.model,
    examined: verseCount,
  })
}
