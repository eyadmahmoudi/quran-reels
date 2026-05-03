#!/usr/bin/env node
/**
 * Generate semantic-search embeddings for all 6,236 Quran verses.
 *
 * For each verse, embeds:
 *   "Translation: {english} | Arabic: {uthmani}"
 *
 * Using a single multilingual embedding per verse (OpenAI
 * text-embedding-3-small at 512 dimensions) lets us serve both Arabic
 * and English queries from the same index — the model places semantic
 * neighbors close in the vector space regardless of script.
 *
 * Output:
 *   public/embeddings/verses.bin       — float32 vectors, row-major
 *                                        (6236 × 512 × 4 bytes ≈ 12 MB)
 *   public/embeddings/verses-meta.json — verse_keys + Arabic text +
 *                                        English translation in row order
 *
 * Cost (one-time): ~$0.02 with text-embedding-3-small
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-embeddings.mjs
 *
 * Re-run when you change the embed text template, the model, or the
 * dimensions; otherwise the JSON + bin live in the repo permanently.
 */

import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'embeddings')

const QURAN_API = 'https://api.quran.com/api/v4'
const OPENAI_API = 'https://api.openai.com/v1/embeddings'
const TRANSLATION_ID = 20  // Saheeh International — widely-used clear English
const MODEL = 'text-embedding-3-small'
const DIMENSIONS = 512        // 1536 default, 512 keeps quality + halves disk
const EMBED_BATCH_SIZE = 100  // OpenAI accepts up to 2048; 100 is comfortable

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('error: OPENAI_API_KEY env var is required')
  process.exit(1)
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function buildEmbedText(verse) {
  const trans = stripHtml(verse.translations?.[0]?.text || '')
  const ar = (verse.text_uthmani || '').trim()
  return `Translation: ${trans} | Arabic: ${ar}`
}

async function fetchSurah(surahId) {
  const params = new URLSearchParams({
    fields: 'text_uthmani,verse_key',
    translations: String(TRANSLATION_ID),
    per_page: '300',
  })
  const r = await fetch(`${QURAN_API}/verses/by_chapter/${surahId}?${params}`)
  if (!r.ok) throw new Error(`fetch surah ${surahId}: HTTP ${r.status}`)
  return (await r.json()).verses
}

async function embedBatch(texts, attempt = 1) {
  const r = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, input: texts, dimensions: DIMENSIONS }),
  })
  if (r.status === 429 && attempt < 4) {
    const wait = 2 ** attempt * 1000
    console.warn(`  rate-limited, retrying in ${wait}ms…`)
    await new Promise((res) => setTimeout(res, wait))
    return embedBatch(texts, attempt + 1)
  }
  if (!r.ok) {
    throw new Error(`OpenAI embeddings: HTTP ${r.status} ${await r.text()}`)
  }
  const data = await r.json()
  return data.data.map((d) => d.embedding)
}

async function main() {
  console.log(`Fetching all 114 surahs from quran.com (translation ${TRANSLATION_ID})…`)
  const allVerses = []
  for (let i = 1; i <= 114; i++) {
    process.stdout.write(`  surah ${i.toString().padStart(3, ' ')}/114\r`)
    const verses = await fetchSurah(i)
    for (const v of verses) {
      allVerses.push({
        vk: v.verse_key,
        ar: (v.text_uthmani || '').trim(),
        tr: stripHtml(v.translations?.[0]?.text || ''),
        embedText: buildEmbedText(v),
      })
    }
  }
  console.log(`\nFetched ${allVerses.length} verses.`)

  console.log(`Embedding with ${MODEL} (${DIMENSIONS} dim) in batches of ${EMBED_BATCH_SIZE}…`)
  const totalBatches = Math.ceil(allVerses.length / EMBED_BATCH_SIZE)
  const allEmbeddings = []
  for (let i = 0; i < allVerses.length; i += EMBED_BATCH_SIZE) {
    const batch = allVerses.slice(i, i + EMBED_BATCH_SIZE)
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1
    process.stdout.write(`  batch ${batchNum.toString().padStart(2, ' ')}/${totalBatches}\r`)
    const embeddings = await embedBatch(batch.map((v) => v.embedText))
    if (embeddings.length !== batch.length) {
      throw new Error(`batch ${batchNum}: expected ${batch.length} embeddings, got ${embeddings.length}`)
    }
    allEmbeddings.push(...embeddings)
  }
  console.log(`\nGot ${allEmbeddings.length} embeddings.`)

  // Pack into a contiguous float32 buffer.
  const buf = new Float32Array(allEmbeddings.length * DIMENSIONS)
  for (let i = 0; i < allEmbeddings.length; i++) {
    const e = allEmbeddings[i]
    if (e.length !== DIMENSIONS) {
      throw new Error(`row ${i}: expected ${DIMENSIONS} dims, got ${e.length}`)
    }
    for (let j = 0; j < DIMENSIONS; j++) buf[i * DIMENSIONS + j] = e[j]
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(path.join(OUTPUT_DIR, 'verses.bin'), Buffer.from(buf.buffer))
  writeFileSync(
    path.join(OUTPUT_DIR, 'verses-meta.json'),
    JSON.stringify(
      {
        model: MODEL,
        dimensions: DIMENSIONS,
        translation_id: TRANSLATION_ID,
        count: allVerses.length,
        verses: allVerses.map(({ vk, ar, tr }) => ({ vk, ar, tr })),
      },
      null,
      0
    )
  )

  console.log(`\nWrote:`)
  console.log(`  public/embeddings/verses.bin (${(buf.byteLength / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`  public/embeddings/verses-meta.json`)
  console.log(`Done.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
