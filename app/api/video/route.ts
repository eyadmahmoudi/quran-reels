import { NextRequest } from 'next/server'

// Only allow known video CDN hosts
const ALLOWED_HOSTS = ['videos.pexels.com']

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return new Response('Missing url parameter', { status: 400 })

  // Validate host
  try {
    const parsed = new URL(url)
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new Response('Host not allowed', { status: 403 })
    }
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }

  try {
    // Fetch the full video — no Referer, no Range (Pexels CDN blocks both server-side)
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('[video proxy]', err)
    return new Response('Failed to fetch video', { status: 502 })
  }
}
