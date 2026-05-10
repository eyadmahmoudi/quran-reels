'use client'

import { useEffect, useRef } from 'react'
import type { BackgroundOption, Verse } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'
import { CALLIGRAPHY_STYLES } from '@/lib/quran-types'
import { getHijriDate } from '@/lib/hijri-date'

interface PreviewCanvasProps {
  background: BackgroundOption
  verse: Verse | undefined
  showTranslation: boolean
  displayMode: 'minimal' | 'classic'
  surahName: string
  watermark?: string
  calligraphyStyle?: string
  showHijriDate?: boolean
  showTafsir?: boolean
  showJuzProgress?: boolean
}

const WIDTH = 540
const HEIGHT = 960

function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement,
) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = img.width * scale
  const sh = img.height * scale
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh)
}

function drawGradientFallback(ctx: CanvasRenderingContext2D, w: number, h: number, value: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  if (value.includes('emerald')) {
    g.addColorStop(0, '#0a1a14'); g.addColorStop(0.5, '#0d2818'); g.addColorStop(1, '#0a1a14')
  } else if (value.includes('royal') || value.includes('blue')) {
    g.addColorStop(0, '#0a0f1a'); g.addColorStop(0.5, '#1a2a4a'); g.addColorStop(1, '#0a0f1a')
  } else if (value.includes('golden')) {
    g.addColorStop(0, '#1a1510'); g.addColorStop(0.5, '#2a2015'); g.addColorStop(1, '#1a1510')
  } else if (value.includes('purple')) {
    g.addColorStop(0, '#0f0a1a'); g.addColorStop(0.5, '#1e1040'); g.addColorStop(1, '#0f0a1a')
  } else {
    g.addColorStop(0, '#0c1220'); g.addColorStop(0.5, '#1a2744'); g.addColorStop(1, '#0c1220')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function getCalligraphyFont(styleId: string): { body: string; marker: string } {
  const style = CALLIGRAPHY_STYLES.find(s => s.id === styleId) ?? CALLIGRAPHY_STYLES[0]
  return {
    body: style.fontFamily,
    marker: '"UthmanicHafs", "Amiri Quran", "Scheherazade New", serif',
  }
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: BackgroundOption,
  bgImg: HTMLImageElement | null,
  verse: Verse | undefined,
  showTranslation: boolean,
  mode: 'minimal' | 'classic',
  surahName: string,
  watermark: string | undefined,
  animT: number,
  calligraphyStyle?: string,
  showHijriDate?: boolean,
  showTafsir?: boolean,
  showJuzProgress?: boolean,
) {
  const uiScale = w / 1080
  const s = (n: number) => n * uiScale
  const bgValue = typeof bg.value === 'string' ? bg.value : (bg.value[0] ?? '')
  const fonts = getCalligraphyFont(calligraphyStyle ?? 'nabi')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (bg.type === 'animated' && typeof bg.value === 'string') {
    drawAnimatedBackground(ctx, w, h, animT, bg.value)
  } else if (bgImg) {
    drawCoverImage(ctx, w, h, bgImg)
  } else {
    drawGradientFallback(ctx, w, h, bgValue)
  }

  const hasRich = bg.type === 'animated' || !!bgImg
  ctx.fillStyle = mode === 'minimal'
    ? (hasRich ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.20)')
    : (hasRich ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)')
  ctx.fillRect(0, 0, w, h)

  // ── Hijri Date overlay (top-left) ──
  if (showHijriDate) {
    ctx.save()
    const hijri = getHijriDate()
    const dateSize = Math.round(s(18))
    ctx.font = `500 ${dateSize}px "Reem Kufi", "Noto Naskh Arabic", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = s(8)
    ctx.fillStyle = 'rgba(212,175,55,0.85)'
    ctx.direction = 'rtl'
    ctx.fillText(hijri.formattedAr, w / 2, s(mode === 'classic' ? 52 : 36))
    ctx.restore()
  }

  if (mode === 'classic') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    const bw = s(320), bh = s(56)
    const bx = w / 2 - bw / 2, by = s(90)
    const r = s(28)
    ctx.beginPath()
    ctx.moveTo(bx + r, by)
    ctx.lineTo(bx + bw - r, by)
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r)
    ctx.lineTo(bx + bw, by + bh - r)
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh)
    ctx.lineTo(bx + r, by + bh)
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r)
    ctx.lineTo(bx, by + r)
    ctx.quadraticCurveTo(bx, by, bx + r, by)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(212,175,55,0.9)'
    ctx.font = `${Math.round(s(30))}px "UthmanicHafs", "Amiri Quran", "Scheherazade New", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(surahName, w / 2, s(118))
    ctx.restore()
  }

  if (verse) {
    ctx.save()
    ctx.fillStyle = 'white'
    const arabicSize = Math.round(s(mode === 'minimal' ? 58 : 68))
    const bodyFont = `${arabicSize}px ${fonts.body}`
    const uthmanicFont = `${arabicSize}px ${fonts.marker}`
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = s(mode === 'minimal' ? 18 : 24)
    ctx.direction = 'rtl'

    const text = verse.text_uthmani || verse.words?.map((wd) => wd.text_uthmani).join(' ') || ''
    const verseNumber = parseInt(verse.verse_key.split(':')[1] || '1', 10)
    const markerChar = `\u06DD${toArabicNumerals(verseNumber)}`

    ctx.font = uthmanicFont
    const markerW = ctx.measureText(markerChar).width

    ctx.font = bodyFont
    const maxLineW = w - s(100)
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word
      if (ctx.measureText(test).width > maxLineW && cur) {
        lines.push(cur)
        cur = word
      } else {
        cur = test
      }
    }
    if (cur) {
      const lastW = ctx.measureText(cur).width
      const spaceW = ctx.measureText(' ').width
      if (lastW + spaceW + markerW > maxLineW) {
        lines.push(cur)
        lines.push('')
      } else {
        lines.push(cur)
      }
    }

    const lineH = arabicSize * 2.0
    const totalH = lines.length * lineH
    const centerY = mode === 'minimal' ? h * 0.44 : h / 2 - (showTranslation ? s(80) : 0)
    const startY = centerY - totalH / 2

    lines.forEach((line, i) => {
      const y = startY + i * lineH
      const isLast = i === lines.length - 1
      if (!isLast) {
        ctx.font = bodyFont
        ctx.textAlign = 'center'
        ctx.fillText(line, w / 2, y)
      } else if (line === '') {
        ctx.font = uthmanicFont
        ctx.textAlign = 'center'
        ctx.fillText(markerChar, w / 2, y)
      } else {
        ctx.font = bodyFont
        const lineW = ctx.measureText(line).width
        const spaceW = ctx.measureText(' ').width
        ctx.font = uthmanicFont
        const mw = ctx.measureText(markerChar).width
        const totalW = lineW + spaceW + mw
        const right = w / 2 + totalW / 2
        const left = w / 2 - totalW / 2
        ctx.font = bodyFont; ctx.textAlign = 'right'; ctx.fillText(line, right, y)
        ctx.font = uthmanicFont; ctx.textAlign = 'left'; ctx.fillText(markerChar, left, y)
      }
    })
    ctx.shadowBlur = 0

    if (showTranslation) {
      const trans = verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? ''
      if (trans) {
        ctx.fillStyle = mode === 'minimal' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)'
        const tSize = Math.round(s(mode === 'minimal' ? 28 : 34))
        ctx.font = `${tSize}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.direction = 'ltr'
        ctx.shadowColor = 'rgba(0,0,0,0.9)'
        ctx.shadowBlur = s(12)
        const tWords = trans.split(' ')
        const tLines: string[] = []
        let tCur = ''
        for (const word of tWords) {
          const test = tCur ? `${tCur} ${word}` : word
          if (ctx.measureText(test).width > w - s(160) && tCur) {
            tLines.push(tCur)
            tCur = word
          } else {
            tCur = test
          }
        }
        if (tCur) tLines.push(tCur)
        const tLineH = tSize * 1.5
        const tY = startY + totalH + (mode === 'minimal' ? s(44) : s(70))
        tLines.forEach((line, i) => ctx.fillText(line, w / 2, tY + i * tLineH))
      }
    }

    // ── Tafsir overlay (below translation, smaller text) ──
    if (showTafsir) {
      // Tafsir comes as the second translation (index 1) when tafsirId is included
      const tafsir = verse.translations?.[1]?.text?.replace(/<[^>]+>/g, '') ?? ''
      if (tafsir) {
        ctx.fillStyle = 'rgba(212,175,55,0.7)'
        const tfSize = Math.round(s(mode === 'minimal' ? 20 : 24))
        ctx.font = `${tfSize}px Georgia, serif`
        ctx.textAlign = 'center'
        ctx.direction = 'ltr'
        ctx.shadowColor = 'rgba(0,0,0,0.9)'
        ctx.shadowBlur = s(8)
        const tfMaxW = w - s(120)
        const tfWords = tafsir.split(' ')
        const tfLines: string[] = []
        let tfCur = ''
        for (const word of tfWords) {
          const test = tfCur ? `${tfCur} ${word}` : word
          if (ctx.measureText(test).width > tfMaxW && tfCur) {
            tfLines.push(tfCur)
            tfCur = word
          } else {
            tfCur = test
          }
        }
        if (tfCur) tfLines.push(tfCur)
        // Cap at 4 lines
        const capped = tfLines.slice(0, 4)
        const tfLineH = tfSize * 1.4
        // Position below translation or below Arabic text
        const transBottom = showTranslation
          ? startY + totalH + (mode === 'minimal' ? s(44) : s(70)) + s(28) * 2
          : startY + totalH + (mode === 'minimal' ? s(44) : s(70))
        capped.forEach((line, i) => ctx.fillText(line, w / 2, transBottom + i * tfLineH))
      }
    }

    // ── Juz / Hizb progress indicator ──
    if (showJuzProgress && verse) {
      ctx.save()
      const juzNum = verse.juz_number ?? 0
      const progSize = Math.round(s(16))
      ctx.font = `500 ${progSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = s(6)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.direction = 'ltr'
      const progressY = h - (watermark ? s(70) : s(36))
      // Juz progress bar (30 parts)
      const barW = w - s(120)
      const barH = Math.max(2, Math.round(s(4)))
      const barX = s(60)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(barX, progressY - progSize - s(4), barW, barH)
      const juzFrac = juzNum / 30
      ctx.fillStyle = 'rgba(212,175,55,0.6)'
      ctx.fillRect(barX, progressY - progSize - s(4), barW * juzFrac, barH)
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(`Juz ${juzNum} of 30`, w / 2, progressY - progSize - s(12))
      ctx.restore()
    }
    ctx.restore()
  }

  if (watermark) {
    ctx.save()
    ctx.font = `500 ${Math.round(s(22))}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.shadowColor = 'rgba(0,0,0,0.7)'
    ctx.shadowBlur = s(10)
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    const handle = watermark.startsWith('@') ? watermark : `@${watermark}`
    ctx.fillText(handle, w / 2, h - s(36))
    ctx.restore()
  }
}

export function PreviewCanvas({ background, verse, showTranslation, displayMode, surahName, watermark, calligraphyStyle, showHijriDate, showTafsir, showJuzProgress }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let cancelled = false
    imgRef.current = null

    const needsImage =
      background.type === 'custom' ||
      background.type === 'preset' ||
      background.type === 'image'

    const loadIfNeeded = async () => {
      if (!needsImage) return
      try {
        const url = typeof background.value === 'string' ? background.value : background.value[0]
        if (url) {
          const img = await loadImage(url)
          if (!cancelled) imgRef.current = img
        }
      } catch {
        if (!cancelled) imgRef.current = null
      }
    }

    const start = performance.now()
    startRef.current = start

    const tick = (now: number) => {
      if (cancelled) return
      drawPreview(
        ctx, WIDTH, HEIGHT, background, imgRef.current,
        verse, showTranslation, displayMode, surahName, watermark,
        now - startRef.current,
        calligraphyStyle, showHijriDate, showTafsir, showJuzProgress,
      )
      if (background.type === 'animated') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    loadIfNeeded().then(() => {
      if (cancelled) return
      tick(performance.now())
    })

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [background, verse, showTranslation, displayMode, surahName, watermark, calligraphyStyle, showHijriDate, showTafsir, showJuzProgress])

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="block h-full w-full"
    />
  )
}
