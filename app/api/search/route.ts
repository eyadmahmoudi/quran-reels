import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ results: [] })

  const apiUrl = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query.trim())}&size=20&language=ar`

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://quran.com',
        'Referer': 'https://quran.com/',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `API error: ${res.status}` }, { status: 200 })
    }

    const data = await res.json()
    const matches = data?.search?.results || []

    const results = matches.map((r: any) => ({
      verse_key: r.verse_key,
      text: r.text,
    }))

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ results: [], error: String(err) }, { status: 200 })
  }
}