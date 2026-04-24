import { NextRequest, NextResponse } from 'next/server'

// Cached in memory between requests on the same Vercel instance
let quranCache: any[] | null = null

async function getQuran() {
  if (quranCache) return quranCache
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_ar.json',
    { cache: 'force-cache' }
  )
  const data = await res.json()
  quranCache = data
  return data
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ results: [] })

  try {
    const quran = await getQuran()

    const results: { verse_key: string; text: string }[] = []

    for (const surah of quran) {
      for (const verse of surah.verses) {
        if (verse.text.includes(query)) {
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