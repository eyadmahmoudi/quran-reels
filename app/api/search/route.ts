import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ results: [] })

  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://api.alquran.cloud/v1/search/${encoded}/quran-simple/ar`
    )
    
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    
    const data = await res.json()
    const matches = data?.data?.matches || []

    const results = matches.map((r: any) => ({
      verse_key: `${r.surah.number}:${r.numberInSurah}`,
      text: r.text,
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('Search proxy error:', err)
    return NextResponse.json({ results: [], error: String(err) }, { status: 500 })
  }
}