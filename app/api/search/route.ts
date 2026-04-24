import { NextRequest, NextResponse } from 'next/server'

let quranCache: any[] | null = null

async function getQuran() {
  if (quranCache) return quranCache
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json',
    { cache: 'force-cache' }
  )
  quranCache = await res.json()
  return quranCache
}

function stripDiacritics(text: string) {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove harakat
    .replace(/[ٱإأآا]/g, 'ا')                            // normalize alef
    .replace(/ى/g, 'ي')                                   // normalize ya
    .replace(/ة/g, 'ه')                                   // normalize ta marbuta
    .trim()
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ results: [] })

  try {
    const quran = await getQuran()
    const normalizedQuery = stripDiacritics(query)
    const results: { verse_key: string; text: string }[] = []

    for (const surah of quran) {
      for (const verse of surah.verses) {
        if (stripDiacritics(verse.text).includes(normalizedQuery)) {
          results.push({
            verse_key: `${surah.id}:${verse.id}`,
            text: verse.text,
          })
          if (results.length >= 20) break
        }
      }
      if (results.length >= 20) break
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ results: [], error: String(err) }, { status: 200 })
  }
}