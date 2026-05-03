#!/usr/bin/env node
/**
 * Generate semantic-search embeddings for all 6,236 Quran verses
 * locally — NO API CALLS, NO TOKENS, NO PAYMENT REQUIRED.
 *
 * Uses @huggingface/transformers (transformers.js for Node) with
 * Xenova/paraphrase-multilingual-MiniLM-L12-v2 — a 384-dim multilingual
 * sentence-similarity model that handles Arabic and English in the same
 * vector space, so a single embedding per verse serves both languages.
 *
 * Output:
 *   public/embeddings/verses.bin       — float32 vectors, row-major
 *                                        (6236 × 384 × 4 bytes ≈ 9.5 MB)
 *   public/embeddings/verses-meta.json — verse_keys + Arabic text +
 *                                        English translation in row order
 *
 * Cost: $0
 *
 * Usage:
 *   node scripts/generate-embeddings.mjs
 *
 * Time: ~5-10 minutes on a typical CPU. The model (~110 MB) is
 * downloaded from Hugging Face on first run and cached in
 * ~/.cache/huggingface/ for subsequent runs.
 *
 * Re-run when you change the embedding template, the model, or the
 * translation source. Otherwise the bin + json live in the repo
 * permanently.
 */

import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from '@huggingface/transformers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'embeddings')

const QURAN_API = 'https://api.quran.com/api/v4'
const TRANSLATION_ID = 20  // Saheeh International — widely-used clear English
const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
const DIMENSIONS = 384
const BATCH_SIZE = 16  // tune up if you have RAM, down if you OOM

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function buildEmbedText(verse) {
  const trans = stripHtml(verse.translations?.[0]?.text || '')
  const ar = (verse.text_uthmani || '').trim()
  // Bilingual concatenation: a single multilingual vector carries both
  // semantic spaces, so Arabic queries and English queries both match.
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

  console.log(`Loading model ${MODEL_NAME} (downloads on first run, ~110 MB)…`)
  const t0 = Date.now()
  const extractor = await pipeline('feature-extraction', MODEL_NAME, {
    // q8 (8-bit quantized) gives ~4× smaller download with negligible
    // quality loss for sentence-similarity tasks at this scale.
    dtype: 'q8',
  })
  console.log(`Model ready in ${((Date.now() - t0) / 1000).toFixed(1)}s.`)

  console.log(`Embedding ${allVerses.length} verses in batches of ${BATCH_SIZE}…`)
  const allEmbeddings = []
  const totalBatches = Math.ceil(allVerses.length / BATCH_SIZE)
  const tStart = Date.now()
  for (let i = 0; i < allVerses.length; i += BATCH_SIZE) {
    const batch = allVerses.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const out = await extractor(
      batch.map((v) => v.embedText),
      { pooling: 'mean', normalize: true },
    )
    // out.data is a flat Float32Array of shape (batchSize × dim)
    const data = out.data
    for (let b = 0; b < batch.length; b++) {
      const vec = new Float32Array(DIMENSIONS)
      for (let j = 0; j < DIMENSIONS; j++) {
        vec[j] = data[b * DIMENSIONS + j]
      }
      allEmbeddings.push(vec)
    }
    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      const elapsed = (Date.now() - tStart) / 1000
      const rate = (batchNum * BATCH_SIZE) / elapsed
      const eta = (allVerses.length - batchNum * BATCH_SIZE) / rate
      process.stdout.write(
        `  batch ${batchNum.toString().padStart(3, ' ')}/${totalBatches}  ` +
          `(${rate.toFixed(1)} verses/s, ETA ${Math.max(0, eta).toFixed(0)}s)   \r`,
      )
    }
  }
  console.log(`\nGot ${allEmbeddings.length} embeddings.`)

  // Pack into one contiguous float32 buffer.
  const buf = new Float32Array(allEmbeddings.length * DIMENSIONS)
  for (let i = 0; i < allEmbeddings.length; i++) {
    buf.set(allEmbeddings[i], i * DIMENSIONS)
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(path.join(OUTPUT_DIR, 'verses.bin'), Buffer.from(buf.buffer))
  writeFileSync(
    path.join(OUTPUT_DIR, 'verses-meta.json'),
    JSON.stringify(
      {
        model: MODEL_NAME,
        dimensions: DIMENSIONS,
        translation_id: TRANSLATION_ID,
        normalized: true,
        count: allVerses.length,
        verses: allVerses.map(({ vk, ar, tr }) => ({ vk, ar, tr })),
      },
      null,
      0,
    ),
  )

  console.log(`\nWrote:`)
  console.log(`  public/embeddings/verses.bin      (${(buf.byteLength / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`  public/embeddings/verses-meta.json`)
  console.log(`Done.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
