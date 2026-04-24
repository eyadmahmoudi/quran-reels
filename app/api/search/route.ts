import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/quran-simple/ar`,
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    const matches = data?.data?.matches || []

    const results = matches.map((r: any) => ({
      verse_key: `${r.surah.number}:${r.numberInSurah}`,
      text: r.text,
    }))

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}