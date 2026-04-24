import { NextRequest, NextResponse } from 'next/server'
import { normalizeBase, normalizeLoose, buildIndexMap } from '@/lib/arabic-search'

// ────────────────────────────────────────────────────────────────────────
// Pre-built, normalized Quran index
// ────────────────────────────────────────────────────────────────────────

interface IndexedVerse {
  surahId: number
  verseId: number
  text: string          // original Uthmani
  base: string          // strict normalization
  loose: string         // loose normalization (alefs + spaces stripped)
  baseMap: number[]     // position map: base[i] came from text[baseMap[i]]
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
            loose: normalizeLoose(verse.text),
            baseMap: map,
          })
        }
      }
      return out
    })().catch((err) => {
      // Reset so next request can retry
      indexPromise = null
      throw err
    })
  }
  return indexPromise
}

// ────────────────────────────────────────────────────────────────────────
// Highlighting — wrap matched range in <mark>...</mark> on the original
// Uthmani text, using the base→original position map.
// ────────────────────────────────────────────────────────────────────────

function highlight(
  originalText: string,
  baseMap: number[],
  baseMatchStart: number,
  baseMatchEnd: number, // exclusive
): string {
  if (baseMatchStart < 0 || baseMatchEnd <= baseMatchStart) return originalText
  const startOrig = baseMap[baseMatchStart]
  const endOrig = baseMap[Math.min(baseMatchEnd - 1, baseMap.length - 1)]
  if (startOrig === undefined || endOrig === undefined) return originalText

  // Extend endOrig through any trailing tashkeel that belong to the last
  // highlighted consonant, so the mark closes at a visually clean boundary.
  let end = endOrig
  while (
    end + 1 < originalText.length &&
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/.test(
      originalText[end + 1],
    )
  ) {
    end++
  }

  return (
    originalText.slice(0, startOrig) +
    '<mark>' +
    originalText.slice(startOrig, end + 1) +
    '</mark>' +
    originalText.slice(end + 1)
  )
}

// ────────────────────────────────────────────────────────────────────────
// Route
// ────────────────────────────────────────────────────────────────────────

const MAX_RESULTS = 40

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return NextResponse.json({ results: [] })

  try {
    const index = await getIndex()
    const qBase = normalizeBase(raw)
    const qLoose = normalizeLoose(raw)
    if (qBase.length < 2 && qLoose.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const seen = new Set<string>()
    const strictHits: Array<{
      verse_key: string
      text: string
      strict: true
    }> = []

    // ── Pass 1: strict substring match on base-normalized text ──
    if (qBase.length >= 2) {
      for (const entry of index) {
        const idx = entry.base.indexOf(qBase)
        if (idx === -1) continue
        const key = `${entry.surahId}:${entry.verseId}`
        if (seen.has(key)) continue
        seen.add(key)
        strictHits.push({
          verse_key: key,
          text: highlight(entry.text, entry.baseMap, idx, idx + qBase.length),
          strict: true,
        })
        if (strictHits.length >= MAX_RESULTS) break
      }
    }

    // ── Pass 2: loose match (alef- and space-insensitive) ──
    const looseHits: Array<{ verse_key: string; text: string; strict: false }> = []
    if (strictHits.length < MAX_RESULTS && qLoose.length >= 2) {
      for (const entry of index) {
        if (!entry.loose.includes(qLoose)) continue
        const key = `${entry.surahId}:${entry.verseId}`
        if (seen.has(key)) continue
        seen.add(key)
        // Loose match can't be precisely highlighted on the original, so
        // we fall back to returning the unmodified Uthmani text.
        looseHits.push({ verse_key: key, text: entry.text, strict: false })
        if (strictHits.length + looseHits.length >= MAX_RESULTS) break
      }
    }

    return NextResponse.json({
      results: [...strictHits, ...looseHits],
      strict_count: strictHits.length,
      loose_count: looseHits.length,
    })
  } catch (err) {
    console.error('[search] error:', err)
    return NextResponse.json(
      { results: [], error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
