import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  // Validate it's a quran audio URL
  if (!url.startsWith('https://verses.quran.com/') && !url.startsWith('https://everyayah.com/')) {
    return NextResponse.json({ error: 'Invalid audio URL' }, { status: 400 })
  }

  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.status}` },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Audio proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio' },
      { status: 500 }
    )
  }
}
