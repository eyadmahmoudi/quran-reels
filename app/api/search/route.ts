import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeBase,
  normalizeAlefFuzzy,
  normalizeConcat,
  buildIndexMap,
} from '@/lib/arabic-search'

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

function highlight(
  originalText: string,
  baseMap: number[],
  baseMatchStart: number,
  baseMatchEnd: number,
): string {
  if (baseMatchStart < 0 || baseMatchEnd <= baseMatchStart) return originalText
  const startOrig = baseMap[baseMatchStart]
  const endOrig = baseMap[Math.min(baseMatchEnd - 1, baseMap.length - 1)]
  if (startOrig === undefined || endOrig === undefined) return originalText

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

const MAX_RESULTS = 40

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return NextResponse.json({ results: [] })

  try {
    const index = await getIndex()
    const qBase = normalizeBase(raw)
    const qFuzzy = normalizeAlefFuzzy(raw)
    const qConcat = normalizeConcat(raw)
    
    if (qBase.length < 2 && qFuzzy.length < 2 && qConcat.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const strictHits: Array<{
      verse_key: string
      text: string
      strict: true
    }> = []
    
    if (qBase.length >= 2) {
      for (const entry of index) {
        const idx = entry.base.indexOf(qBase)
        if (idx === -1) continue
        strictHits.push({
          verse_key: `${entry.surahId}:${entry.verseId}`,
          text: highlight(entry.text, entry.baseMap, idx, idx + qBase.length),
          strict: true,
        })
        if (strictHits.length >= MAX_RESULTS) break
      }
    }

    const fuzzyHits: Array<{ verse_key: string; text: string; strict: false }> = []
    
    if (strictHits.length < 3 && qFuzzy.length >= 2) {
      for (const entry of index) {
        if (!entry.fuzzy.includes(qFuzzy)) continue
        fuzzyHits.push({
          verse_key: `${entry.surahId}:${entry.verseId}`,
          text: entry.text,
          strict: false,
        })
        if (fuzzyHits.length >= MAX_RESULTS) break
      }
    }

    const concatHits: Array<{ verse_key: string; text: string; strict: false }> = []
    if (strictHits.length === 0 && fuzzyHits.length === 0 && qConcat.length >= 2) {
      for (const entry of index) {
        if (!entry.concat.includes(qConcat)) continue
        concatHits.push({
          verse_key: `${entry.surahId}:${entry.verseId}`,
          text: entry.text,
          strict: false,
        })
        if (concatHits.length >= MAX_RESULTS) break
      }
    }

    return NextResponse.json({
      results: [...strictHits, ...fuzzyHits, ...concatHits],
      strict_count: strictHits.length,
      loose_count: fuzzyHits.length + concatHits.length,
    })
  } catch (err) {
    console.error('[search] error:', err)
    return NextResponse.json(
      { results: [], error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}