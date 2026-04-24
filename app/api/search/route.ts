import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ results: [] })

  const encoded = encodeURIComponent(query.trim())
  const apiUrl = `https://api.alquran.cloud/v1/search/${encoded}/all/quran-simple`

  try {
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `API error: ${res.status}` }, { status: 200 })
    }

    const data = await res.json()
    const matches = data?.data?.matches || []

    const results = matches.map((r: any) => ({
      verse_key: `${r.surah.number}:${r.numberInSurah}`,
      text: r.text,
    }))

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ results: [], error: String(err) }, { status: 200 })
  }
}