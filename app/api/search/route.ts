// app/api/search/route.ts — v5
import { NextRequest, NextResponse } from 'next/server'
import {
  getQuranIndex,
  normalizeBase,
  normalizeAlefFuzzy,
  normalizeMorpho,
  normalizeConcat,
  buildIndexMap,
} from '@/lib/arabic-search'

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
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/.test(originalText[end + 1])
  ) { end++ }
  return originalText.slice(0, startOrig) + '<mark>' + originalText.slice(startOrig, end + 1) + '</mark>' + originalText.slice(end + 1)
}

const MAX_RESULTS = 40

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (raw.length < 2) return NextResponse.json({ results: [] })

  try {
    const index = await getQuranIndex()
    const qBase = normalizeBase(raw)
    const qFuzzy = normalizeAlefFuzzy(raw)
    const qMorpho = normalizeMorpho(raw)
    const qConcat = normalizeConcat(raw)

    if (qBase.length < 2 && qFuzzy.length < 2 && qMorpho.length < 2 && qConcat.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const strictHits: Array<{ verse_key: string; text: string; strict: true }> = []
    if (qBase.length >= 2) {
      for (const entry of index) {
        const idx = entry.base.indexOf(qBase)
        if (idx === -1) continue
        strictHits.push({ verse_key: `${entry.surahId}:${entry.verseId}`, text: highlight(entry.text, entry.baseMap, idx, idx + qBase.length), strict: true })
        if (strictHits.length >= MAX_RESULTS) break
      }
    }

    const morphoHits: Array<{ verse_key: string; text: string; strict: false }> = []
    if (strictHits.length < 3 && qMorpho.length >= 2) {
      const strictKeys = new Set(strictHits.map((h) => h.verse_key))
      for (const entry of index) {
        if (!entry.morpho.includes(qMorpho)) continue
        const vk = `${entry.surahId}:${entry.verseId}`
        if (strictKeys.has(vk)) continue
        morphoHits.push({ verse_key: vk, text: entry.text, strict: false })
        if (strictHits.length + morphoHits.length >= MAX_RESULTS) break
      }
    }

    const fuzzyHits: Array<{ verse_key: string; text: string; strict: false }> = []
    if (strictHits.length + morphoHits.length < 5 && qFuzzy.length >= 2) {
      const existingKeys = new Set([...strictHits.map((h) => h.verse_key), ...morphoHits.map((h) => h.verse_key)])
      for (const entry of index) {
        if (!entry.fuzzy.includes(qFuzzy)) continue
        const vk = `${entry.surahId}:${entry.verseId}`
        if (existingKeys.has(vk)) continue
        fuzzyHits.push({ verse_key: vk, text: entry.text, strict: false })
        if (strictHits.length + morphoHits.length + fuzzyHits.length >= MAX_RESULTS) break
      }
    }

    const concatHits: Array<{ verse_key: string; text: string; strict: false }> = []
    if (strictHits.length === 0 && morphoHits.length === 0 && fuzzyHits.length === 0 && qConcat.length >= 2) {
      for (const entry of index) {
        if (!entry.concat.includes(qConcat)) continue
        concatHits.push({ verse_key: `${entry.surahId}:${entry.verseId}`, text: entry.text, strict: false })
        if (concatHits.length >= MAX_RESULTS) break
      }
    }

    return NextResponse.json({
      results: [...strictHits, ...morphoHits, ...fuzzyHits, ...concatHits],
      strict_count: strictHits.length,
      loose_count: morphoHits.length + fuzzyHits.length + concatHits.length,
    })
  } catch (err) {
    console.error('[search] error:', err)
    return NextResponse.json({ results: [], error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}