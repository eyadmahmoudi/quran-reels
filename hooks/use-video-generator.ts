'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Verse, Word, BackgroundOption, ReelConfig } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'
import { splitVerseByWordTimings, splitTranslation } from '@/lib/verse-chunking'
import { fetchAudioSegments } from '@/lib/quran-api'

interface VideoGeneratorOptions {
  verses: Verse[]
  background: BackgroundOption
  showTranslation: boolean
  surahName: string
  qdcRecitationId: number | null
  reciterFolder: string
  surahId: number
  startVerse: number
  endVerse: number
  displayMode?: 'minimal' | 'classic'
  includeIstiadha?: boolean
}

interface UseVideoGeneratorReturn {
  isGenerating: boolean
  progress: number
  error: string | null
  generateVideo: (options: VideoGeneratorOptions) => Promise<void>
  cancelGeneration: () => void
}

interface DisplaySegment {
  type: 'intro' | 'verse-chunk'
  introText?: string
  verseIndex?: number
  chunkText?: string
  showMarker: boolean
  showTranslationForChunk: boolean
  translationChunkText?: string
  startMs: number
  endMs: number
}

function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img); img.onerror = reject; img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}


// ═══════════════════════════════════════════════════════════════════════
// AUDIO ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

function findLeadingSilenceMs(buffer: AudioBuffer, threshold = 0.01): number {
  const sr = buffer.sampleRate
  const maxSearch = Math.min(buffer.length, Math.floor(sr * 0.8))
  const ch0 = buffer.getChannelData(0)
  for (let i = 0; i < maxSearch; i++) {
    if (Math.abs(ch0[i]) > threshold) {
      const startSample = Math.max(0, i - Math.floor(sr * 0.01))
      return (startSample / sr) * 1000
    }
  }
  return 0
}

function findTrailingSilenceMs(buffer: AudioBuffer, threshold = 0.01): number {
  const sr = buffer.sampleRate
  const maxSearch = Math.min(buffer.length, Math.floor(sr * 0.8))
  const ch0 = buffer.getChannelData(0)
  for (let i = buffer.length - 1; i >= buffer.length - maxSearch; i--) {
    if (Math.abs(ch0[i]) > threshold) {
      const endSample = Math.min(buffer.length, i + Math.floor(sr * 0.01))
      return ((buffer.length - endSample) / sr) * 1000
    }
  }
  return 0
}

/**
 * Detects INTERNAL silence pauses within a verse's AudioBuffer.
 *
 * FIX v3 — Three critical changes from v2:
 *
 * 1. RAISED minGapMs from 120 → 250ms
 *    120ms caught breathing pauses (120–200ms) that aren't real waqf
 *    transitions. Real waqf pauses from EveryAyah reciters are 300–600ms.
 *    250ms catches the shorter end while filtering most breathing.
 *
 * 2. MERGE close pauses (within 1.5s of each other)
 *    A reciter sometimes double-pauses near a waqf mark: a brief stop,
 *    a quick breath, then a longer stop. The old code treated these as
 *    TWO separate boundaries, creating an ultra-short segment (~0.8s)
 *    that caused blank frames during fade transitions. Merging them into
 *    one boundary eliminates this.
 *
 * 3. Returns the MIDPOINT of merged pauses as the boundary timestamp
 *    instead of the raw start/end. This centers the text transition
 *    in the middle of the silence, which looks more natural.
 */
function findInternalPauses(
  buffer: AudioBuffer,
  threshold = 0.015,
  minGapMs = 250           // ← raised from 120
): Array<{ startMs: number; endMs: number }> {
  const sr = buffer.sampleRate
  const ch0 = buffer.getChannelData(0)
  const windowSamples = Math.floor(sr * 0.02)

  const leadMs = findLeadingSilenceMs(buffer)
  const trailMs = findTrailingSilenceMs(buffer)
  const bufDurationMs = (buffer.length / sr) * 1000

  const searchStartSample = Math.floor(sr * (leadMs + 200) / 1000)
  const searchEndSample = Math.floor(sr * (bufDurationMs - trailMs - 200) / 1000)
  if (searchStartSample >= searchEndSample) return []

  const minGapSamples = Math.floor(sr * (minGapMs / 1000))
  const rawPauses: Array<{ startMs: number; endMs: number }> = []
  let inSilence = false
  let silenceStartSample = 0

  for (let i = searchStartSample; i < searchEndSample; i += windowSamples) {
    let sumSq = 0
    const winEnd = Math.min(i + windowSamples, buffer.length)
    for (let j = i; j < winEnd; j++) { sumSq += ch0[j] * ch0[j] }
    const rms = Math.sqrt(sumSq / (winEnd - i))

    if (rms < threshold) {
      if (!inSilence) { inSilence = true; silenceStartSample = i }
    } else {
      if (inSilence) {
        if (i - silenceStartSample >= minGapSamples) {
          rawPauses.push({
            startMs: (silenceStartSample / sr) * 1000,
            endMs: (i / sr) * 1000,
          })
        }
        inSilence = false
      }
    }
  }
  if (inSilence && (searchEndSample - silenceStartSample) >= minGapSamples) {
    rawPauses.push({
      startMs: (silenceStartSample / sr) * 1000,
      endMs: (searchEndSample / sr) * 1000,
    })
  }

  // ── FILTER BREATHING PAUSES ──
  const filtered: Array<{ startMs: number; endMs: number }> = [...rawPauses]

  for (let i = filtered.length - 1; i > 0; i--) {
    const prev = filtered[i - 1]
    const curr = filtered[i]
    const gap = curr.startMs - prev.endMs

    if (gap < 2000) {
      const prevDur = prev.endMs - prev.startMs
      const currDur = curr.endMs - curr.startMs
      if (prevDur <= currDur) {
        filtered.splice(i - 1, 1)
      } else {
        filtered.splice(i, 1)
      }
    }
  }

  return filtered
}


// ═══════════════════════════════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════════════════════════════

function drawRasterBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  el: HTMLImageElement,
) {
  const w = el.width
  const h = el.height
  if (!w || !h) return
  const scale = Math.max(width / w, height / h)
  const x = (width - w * scale) / 2
  const y = (height - h * scale) / 2
  ctx.drawImage(el, x, y, w * scale, h * scale)
}

// ── CONTENT LAYER HELPERS (extracted so cross-fade can overlay them) ──

function drawIntroContentLayer(
  ctx: CanvasRenderingContext2D, width: number, height: number,
  taawudhText: string, fadeOpacity: number,
) {
  const uiScale = width / 1080
  const s = (n: number) => n * uiScale
  ctx.save()
  ctx.globalAlpha = fadeOpacity
  ctx.fillStyle = 'white'
  ctx.font = `${Math.round(s(52))}px "Nabi", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = s(18)
  ctx.direction = 'rtl'
  ctx.fillText(taawudhText, width / 2, height * 0.44)
  ctx.restore()
}

/**
 * Draws verse text + (optional) translation. Returns the bottom Y of the
 * translation block when present (used by classic-mode progress-bar layout).
 */
function drawVerseContentLayer(
  ctx: CanvasRenderingContext2D, width: number, height: number,
  verse: Verse, displayMode: 'minimal' | 'classic',
  showTranslation: boolean, chunkText: string | undefined,
  showMarker: boolean, translationChunkText: string | undefined,
  fadeOpacity: number,
): number | undefined {
  const uiScale = width / 1080
  const s = (n: number) => n * uiScale
  let translationBottomForBar: number | undefined

  ctx.save()
  ctx.globalAlpha = fadeOpacity

  ctx.fillStyle = 'white'
  const arabicFontSize = Math.round(s(displayMode === 'minimal' ? 58 : 68))
  const nabiFont = `${arabicFontSize}px "Nabi", sans-serif`
  const uthmanicFont = `${arabicFontSize}px "UthmanicHafs", "Amiri Quran", "Scheherazade New", serif`
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = s(displayMode === 'minimal' ? 18 : 24)
  ctx.direction = 'rtl'

  const verseText = chunkText || verse.text_uthmani || verse.words?.map(w => w.text_uthmani).join(' ') || ''
  const verseNumber = parseInt(verse.verse_key.split(':')[1])
  const markerChar = `۝${toArabicNumerals(verseNumber)}`

  ctx.font = uthmanicFont
  const markerWidth = ctx.measureText(markerChar).width

  ctx.font = nabiFont
  const maxWidth = width - s(100)
  const words = verseText.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine); currentLine = word
    } else { currentLine = testLine }
  }

  if (showMarker) {
    if (currentLine) {
      const lastLineWidth = ctx.measureText(currentLine).width
      const spaceW = ctx.measureText(' ').width
      if (lastLineWidth + spaceW + markerWidth > maxWidth) {
        lines.push(currentLine); lines.push('')
      } else { lines.push(currentLine) }
    }
  } else {
    if (currentLine) lines.push(currentLine)
  }

  const lineHeight = arabicFontSize * 2.0
  const totalTextHeight = lines.length * lineHeight
  const shouldShowTranslation = showTranslation
  const textCenterY = displayMode === 'minimal' ? height * 0.44 : height / 2 - (shouldShowTranslation ? s(80) : 0)
  const textStartY = textCenterY - totalTextHeight / 2

  lines.forEach((line, i) => {
    const y = textStartY + i * lineHeight
    const isLastLine = i === lines.length - 1

    if (!showMarker || !isLastLine) {
      ctx.font = nabiFont; ctx.textAlign = 'center'; ctx.fillText(line, width / 2, y)
    } else if (line === '') {
      ctx.font = uthmanicFont; ctx.textAlign = 'center'; ctx.fillText(markerChar, width / 2, y)
    } else {
      ctx.font = nabiFont
      const lineW = ctx.measureText(line).width
      const spaceW = ctx.measureText(' ').width
      ctx.font = uthmanicFont
      const mw = ctx.measureText(markerChar).width
      const totalW = lineW + spaceW + mw
      const rightEdge = width / 2 + totalW / 2
      const leftEdge = width / 2 - totalW / 2

      ctx.font = nabiFont; ctx.textAlign = 'right'; ctx.fillText(line, rightEdge, y)
      ctx.font = uthmanicFont; ctx.textAlign = 'left'; ctx.fillText(markerChar, leftEdge, y)
    }
  })
  ctx.shadowBlur = 0

  if (shouldShowTranslation) {
    const rawTranslation = translationChunkText || (verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? '')
    if (rawTranslation) {
      ctx.fillStyle = displayMode === 'minimal' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)'
      const transFontSize = Math.round(s(displayMode === 'minimal' ? 28 : 34))
      ctx.font = `${transFontSize}px Georgia, serif`
      ctx.textAlign = 'center'; ctx.direction = 'ltr'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = s(12)

      const transWords = rawTranslation.split(' ')
      const transLines: string[] = []
      let transLine = ''
      for (const word of transWords) {
        const testLine = transLine ? `${transLine} ${word}` : word
        if (ctx.measureText(testLine).width > width - s(160) && transLine) {
          transLines.push(transLine); transLine = word
        } else { transLine = testLine }
      }
      if (transLine) transLines.push(transLine)

      const transLineHeight = transFontSize * 1.5
      const transY = textStartY + totalTextHeight + (displayMode === 'minimal' ? s(44) : s(70))
      transLines.forEach((line, i) => ctx.fillText(line, width / 2, transY + i * transLineHeight))
      if (displayMode === 'classic' && transLines.length > 0) {
        const lastY = transY + (transLines.length - 1) * transLineHeight
        translationBottomForBar = lastY + transFontSize * 0.55
      }
    }
  }
  ctx.restore()

  return translationBottomForBar
}

function drawFrame(
  ctx: CanvasRenderingContext2D, width: number, height: number,
  backgroundImage: HTMLImageElement | null,
  background: BackgroundOption,
  surahName: string, verse: Verse | undefined, showTranslation: boolean,
  displayMode: 'minimal' | 'classic', taawudhText?: string, animTimeMs?: number,
  chunkText?: string, showMarker: boolean = true, showTranslationOverride: boolean = true,
  fadeOpacity: number = 1, translationChunkText?: string,
  videoProgress?: number,
) {
  let translationBottomForBar: number | undefined
  const uiScale = width / 1080
  const s = (n: number) => n * uiScale
  const bgValue = typeof background.value === 'string' ? background.value : (background.value[0] ?? '')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (background.type === 'animated') {
    if (typeof background.value === 'string') {
      drawAnimatedBackground(ctx, width, height, animTimeMs ?? 0, background.value)
    }
  } else if (backgroundImage) {
    drawRasterBackground(ctx, width, height, backgroundImage)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    if (bgValue.includes('emerald')) {
      gradient.addColorStop(0, '#0a1a14'); gradient.addColorStop(0.5, '#0d2818'); gradient.addColorStop(1, '#0a1a14')
    } else if (bgValue.includes('royal') || bgValue.includes('blue')) {
      gradient.addColorStop(0, '#0a0f1a'); gradient.addColorStop(0.5, '#1a2a4a'); gradient.addColorStop(1, '#0a0f1a')
    } else if (bgValue.includes('golden')) {
      gradient.addColorStop(0, '#1a1510'); gradient.addColorStop(0.5, '#2a2015'); gradient.addColorStop(1, '#1a1510')
    } else if (bgValue.includes('purple')) {
      gradient.addColorStop(0, '#0f0a1a'); gradient.addColorStop(0.5, '#1e1040'); gradient.addColorStop(1, '#0f0a1a')
    } else {
      gradient.addColorStop(0, '#0c1220'); gradient.addColorStop(0.5, '#1a2744'); gradient.addColorStop(1, '#0c1220')
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  const hasRichBg = background.type === 'animated' || !!backgroundImage
  if (displayMode === 'minimal') {
    ctx.fillStyle = hasRichBg ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.20)'
  } else {
    ctx.fillStyle = hasRichBg ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)'
  }
  ctx.fillRect(0, 0, width, height)

  if (taawudhText && !verse) {
    drawIntroContentLayer(ctx, width, height, taawudhText, fadeOpacity)
    if (displayMode === 'classic' && videoProgress !== undefined) {
      const barX = Math.round(s(40))
      const barW = Math.round(width - barX * 2)
      const barH = Math.max(2, Math.round(s(6)))
      const trackTop = Math.round(height - s(30))
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(barX, trackTop, barW, barH)
      ctx.fillStyle = 'rgba(212,175,55,0.9)'
      ctx.fillRect(barX, trackTop, barW * videoProgress, barH)
    }
    return
  }

  if (displayMode === 'classic') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    roundRect(ctx, width / 2 - s(160), s(90), s(320), s(56), s(28))
    ctx.fill()
    ctx.fillStyle = 'rgba(212,175,55,0.9)'
    ctx.font = `${Math.round(s(30))}px "UthmanicHafs", "Amiri Quran", "Scheherazade New", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(surahName, width / 2, s(118))
    ctx.restore()
  }

  if (!verse) return

  translationBottomForBar = drawVerseContentLayer(
    ctx, width, height, verse, displayMode,
    showTranslation && showTranslationOverride,
    chunkText, showMarker, translationChunkText, fadeOpacity,
  )

  if (displayMode === 'classic' && videoProgress !== undefined) {
    const barX = Math.round(s(40))
    const barW = Math.round(width - barX * 2)
    const barH = Math.max(2, Math.round(s(6)))
    const gapBelowTranslation = s(18)
    const defaultTrackTop = height - s(30)
    let trackTop = defaultTrackTop
    if (translationBottomForBar !== undefined) {
      const minTop = translationBottomForBar + gapBelowTranslation
      if (minTop > defaultTrackTop) {
        trackTop = Math.min(minTop, height - barH - s(10))
      }
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.fillRect(barX, Math.round(trackTop), barW, barH)
    ctx.fillStyle = 'rgba(212,175,55,0.9)'
    ctx.fillRect(barX, Math.round(trackTop), barW * videoProgress, barH)
  }
}

async function exportVerseImages(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, verses: Verse[],
  background: BackgroundOption, backgroundImage: HTMLImageElement | null,
  surahName: string, showTranslation: boolean, displayMode: 'minimal' | 'classic',
  setProgress: (n: number) => void
) {
  for (let i = 0; i < verses.length; i++) {
    drawFrame(ctx, canvas.width, canvas.height, backgroundImage, background, surahName, verses[i], showTranslation, displayMode, undefined, i * 3000)
    const blob = await new Promise<Blob>((resolve) => { canvas.toBlob((b) => resolve(b!), 'image/png', 1.0) })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `verse-${verses[i].verse_key.replace(':', '-')}.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setProgress(50 + ((i + 1) / verses.length) * 40)
    if (i < verses.length - 1) await new Promise((r) => setTimeout(r, 100))
  }
}


// ═══════════════════════════════════════════════════════════════════════
// DISPLAY SEGMENT BUILDING — POSITION-MATCHED AUDIO PAUSES
// ═══════════════════════════════════════════════════════════════════════

const ARABIC_MARKS_FOR_MATCH = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF]/g

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '')
}

function normalizeArabicWordToken(token: string): string {
  return token
    .replace(ARABIC_MARKS_FOR_MATCH, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/\s+/g, '')
    .trim()
}

function cleanJoinedTranslation(text: string): string {
  let s = text.replace(/\s+/g, ' ').trim()
  s = s.replace(/\s+,/g, ',')
  s = s.replace(/,\s*/g, ', ')
  s = s.replace(/\s+\./g, '.')
  s = s.replace(/\(\s+/g, '(')
  s = s.replace(/\s+\)/g, ')')
  return s.trim()
}

function getContentWords(verse: Verse): Word[] {
  return (verse.words ?? []).filter(w => w.char_type_name === 'word')
}

function translationFromArabicGroupText(
  verse: Verse,
  arabicGroupText: string,
  proportionalFallback: string
): string {
  const contentWords = getContentWords(verse)
  const chunkTokens = arabicGroupText.split(/\s+/).filter(Boolean)
  if (contentWords.length === 0 || chunkTokens.length === 0) {
    return proportionalFallback.trim()
  }

  const normChunk = chunkTokens.map(normalizeArabicWordToken).filter(t => t.length > 0)
  if (normChunk.length === 0) return proportionalFallback.trim()

  const normVerse = contentWords.map(w => normalizeArabicWordToken(w.text_uthmani))

  for (let i = 0; i <= normVerse.length - normChunk.length; i++) {
    let match = true
    for (let j = 0; j < normChunk.length; j++) {
      if (normVerse[i + j] !== normChunk[j]) {
        match = false
        break
      }
    }
    if (!match) continue

    const parts: string[] = []
    for (let k = 0; k < normChunk.length; k++) {
      const w = contentWords[i + k]
      const raw = w.translation?.text
      if (raw && raw.trim()) parts.push(stripHtmlTags(raw).trim())
    }
    if (parts.length === 0) continue
    return cleanJoinedTranslation(parts.join(' '))
  }

  return proportionalFallback.trim()
}

function buildGroupTranslationText(
  verse: Verse,
  arabicGroupText: string,
  chunkIndices: number[],
  chunks: ReturnType<typeof splitVerseByWordTimings>,
  translationChunks: string[]
): string {
  const proportionalFallback = chunkIndices
    .map(ci => translationChunks[chunks[ci].chunkIndex] || '')
    .join(' ')
    .trim()

  if (!verse.words?.length) return proportionalFallback

  const wbw = translationFromArabicGroupText(verse, arabicGroupText, proportionalFallback)
  return wbw || proportionalFallback
}

interface QDCVerseInfo {
  segments: number[][]
  timestamp_from: number
  timestamp_to: number
}

function buildDisplaySegments(
  verseTimings: Array<{ startMs: number; endMs: number }>,
  verses: Verse[],
  introOffset: number,
  taawudhIdx: number,
  bismillahIdx: number,
  taawudhText: string,
  bismillahText: string,
  displayMode: 'minimal' | 'classic',
  showTranslation: boolean,
  perBufferPauses: Array<Array<{ startMs: number; endMs: number }>>,
  rawTimings: Array<{ startMs: number; endMs: number }>,
  qdcInfoByDisplayIndex: Array<QDCVerseInfo | null>,
  bufferRecitationDurations: number[]
): DisplaySegment[] {
  const segments: DisplaySegment[] = []
  const WAQF_BONUS_CHARS = 11

  for (let i = 0; i < verseTimings.length; i++) {
    const timing = verseTimings[i]

    if (i === taawudhIdx) {
      segments.push({ type: 'intro', introText: taawudhText, showMarker: false, showTranslationForChunk: false, startMs: timing.startMs, endMs: timing.endMs })
      continue
    }
    if (i === bismillahIdx) {
      segments.push({ type: 'intro', introText: bismillahText, showMarker: false, showTranslationForChunk: false, startMs: timing.startMs, endMs: timing.endMs })
      continue
    }

    const verseArrayIdx = i - introOffset
    if (verseArrayIdx < 0 || verseArrayIdx >= verses.length) continue

    const verse = verses[verseArrayIdx]
    const verseText = verse.text_uthmani || ''
    const maxChars = displayMode === 'minimal' ? 80 : 90

    const chunks = splitVerseByWordTimings(verseText, null, maxChars)
    const fullTranslation = verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? ''
    const translationChunks = splitTranslation(fullTranslation, chunks)

    if (chunks.length === 1) {
      segments.push({
        type: 'verse-chunk', verseIndex: verseArrayIdx, chunkText: undefined,
        showMarker: true, showTranslationForChunk: showTranslation,
        translationChunkText: undefined,
        startMs: timing.startMs, endMs: timing.endMs,
      })
      continue
    }

    const verseDuration = timing.endMs - timing.startMs
    const numBoundaries = chunks.length - 1

    const weights = chunks.map(c =>
      c.charCount + (c.endsWithWaqf ? WAQF_BONUS_CHARS : 0)
    )
    const totalWeight = weights.reduce((s, w) => s + w, 0) || 1

    const textBoundaries: number[] = []
    let cumW = 0
    for (let j = 0; j < numBoundaries; j++) {
      cumW += weights[j]
      textBoundaries.push(cumW / totalWeight)
    }

    const bufferPauses = perBufferPauses[i] ?? []
    const rawStart = rawTimings[i].startMs
    const qdcInfo = qdcInfoByDisplayIndex[i] ?? null

    // ── QDC WORD-TIMING PATH ──
    // When QDC per-word segments exist, use them to derive exact chunk
    // boundaries. This is the YouTube-subtitle-style behaviour: each chunk's
    // boundary is set to the moment its last word ends in the recitation.
    // Falls back to pause heuristic when QDC data is absent (e.g., Mohamed
    // Ayoub) or when scaling is sanity-check-failing.
    if (qdcInfo && qdcInfo.segments.length > 0 && numBoundaries > 0) {
      // Build word-position → {startMs, endMs} (last occurrence wins; for
      // repeated recitations like Mishari, span over all occurrences).
      const qdcSegMap = new Map<number, { startMs: number; endMs: number }>()
      for (const seg of qdcInfo.segments) {
        if (!Array.isArray(seg) || seg.length < 3) continue
        const [pos, sMs, eMs] = seg
        const existing = qdcSegMap.get(pos)
        if (!existing) {
          qdcSegMap.set(pos, { startMs: sMs, endMs: eMs })
        } else {
          qdcSegMap.set(pos, {
            startMs: Math.min(existing.startMs, sMs),
            endMs: Math.max(existing.endMs, eMs),
          })
        }
      }

      // QDC recitation span (use first/last actual segment, not timestamp_from/to,
      // to avoid any leading/trailing silence baked into chapter timestamps).
      const segPositions = [...qdcSegMap.keys()].sort((a, b) => a - b)
      const firstPos = segPositions[0]
      const lastPos = segPositions[segPositions.length - 1]
      const qdcRecStart = qdcSegMap.get(firstPos)!.startMs
      const qdcRecEnd = qdcSegMap.get(lastPos)!.endMs
      const qdcRecDur = qdcRecEnd - qdcRecStart

      // verseTimings[i].startMs is post-leading-silence; bufferRecitationDurations[i]
      // is the active recitation length (excludes both leading and trailing silence).
      const bufRecStart = verseTimings[i].startMs
      const bufRecDur = bufferRecitationDurations[i] ?? 0
      const scale = qdcRecDur > 0 && bufRecDur > 0 ? bufRecDur / qdcRecDur : 0

      // Sanity check: same recording across CDNs should be within ±20% tempo.
      const scaleOk = scale > 0.7 && scale < 1.3

      if (scaleOk) {
        // Compute cumulative word position at end of each chunk.
        const chunkEndWordPos: number[] = []
        let cum = 0
        for (const c of chunks) {
          cum += c.wordCount
          chunkEndWordPos.push(cum)
        }

        const qdcBoundaries: Array<{ startMs: number; endMs: number } | null> = []
        const FALLBACK_HALF_WIDTH_MS = 60
        // Cross-fade is centered on the boundary, so the new chunk only
        // reaches full alpha HALF_FADE *after* the boundary timestamp.
        // To avoid this perceptual lag in connected recitation (no real
        // pause between two chunks), we lead the boundary by HALF_FADE so
        // the cross-fade COMPLETES right when the next word becomes
        // audible. When there IS a real wa9f pause, we keep anchoring to
        // the pause start (current behavior, user-confirmed perfect).
        const HALF_FADE_QDC = FADE_DURATION_MS / 2
        const REAL_PAUSE_GAP_MS = 150
        let allFound = true
        for (let k = 0; k < numBoundaries; k++) {
          const lastWordPos = chunkEndWordPos[k]
          const nextWordPos = lastWordPos + 1

          // Look up the last word of the current chunk; walk back if missing.
          let curEntry = qdcSegMap.get(lastWordPos)
          let foundPos = lastWordPos
          for (let back = 1; back <= 2 && !curEntry; back++) {
            curEntry = qdcSegMap.get(lastWordPos - back)
            foundPos = lastWordPos - back
          }
          // Look up the first word of the next chunk (used for lead).
          const nextEntry = qdcSegMap.get(nextWordPos)

          let qdcEventMs: number | null = null
          let mode: 'pause' | 'connected' | 'curr-only' | 'next-only' | 'miss'

          if (curEntry && nextEntry) {
            const gap = nextEntry.startMs - curEntry.endMs
            if (gap > REAL_PAUSE_GAP_MS) {
              // Real wa9f pause — anchor at the start of the silence.
              qdcEventMs = curEntry.endMs
              mode = 'pause'
            } else {
              // Connected (or near-connected) — lead so cross-fade
              // completes right when the next word arrives.
              qdcEventMs = nextEntry.startMs - HALF_FADE_QDC / scale
              mode = 'connected'
            }
          } else if (nextEntry) {
            qdcEventMs = nextEntry.startMs - HALF_FADE_QDC / scale
            mode = 'next-only'
          } else if (curEntry) {
            qdcEventMs = curEntry.endMs
            mode = 'curr-only'
          } else {
            mode = 'miss'
          }

          if (qdcEventMs === null) {
            qdcBoundaries.push(null)
            allFound = false
            continue
          }

          const relativeQdcMs = qdcEventMs - qdcRecStart
          const bufferMs = bufRecStart + relativeQdcMs * scale
          qdcBoundaries.push({
            startMs: bufferMs - FALLBACK_HALF_WIDTH_MS,
            endMs: bufferMs + FALLBACK_HALF_WIDTH_MS,
          })
          if (foundPos !== lastWordPos) {
            console.log(`[sync] V${verseArrayIdx} QDC: boundary ${k} word ${lastWordPos} missing, used word ${foundPos}`)
          }
          console.log(`[sync] V${verseArrayIdx} boundary ${k} mode=${mode} @ ${(bufferMs/1000).toFixed(2)}s`)
        }

        console.log(`[sync] V${verseArrayIdx} QDC word-timing: scale=${scale.toFixed(3)}, ${qdcBoundaries.filter(b => b).length}/${numBoundaries} boundaries derived${allFound ? '' : ' (some fallbacks needed)'}`)

        // Build display groups directly: each chunk is its own group when
        // we have a boundary; merge orphans into next chunk if a boundary
        // is missing.
        type DisplayGroup = {
          chunkIndices: number[]
          text: string
          isLast: boolean
          translationText: string
        }

        const displayGroups: DisplayGroup[] = []
        const activeBoundaries: Array<{ startMs: number; endMs: number }> = []
        let currentGroupIndices: number[] = [0]

        for (let b = 0; b < numBoundaries; b++) {
          if (qdcBoundaries[b] !== null) {
            const groupText = currentGroupIndices.map(ci => chunks[ci].text).join(' ')
            const groupTranslation = buildGroupTranslationText(
              verse, groupText, currentGroupIndices, chunks, translationChunks
            )
            displayGroups.push({
              chunkIndices: [...currentGroupIndices],
              text: groupText,
              isLast: false,
              translationText: groupTranslation,
            })
            activeBoundaries.push(qdcBoundaries[b]!)
            currentGroupIndices = [b + 1]
          } else {
            currentGroupIndices.push(b + 1)
          }
        }

        const finalGroupText = currentGroupIndices.map(ci => chunks[ci].text).join(' ')
        const finalGroupTranslation = buildGroupTranslationText(
          verse, finalGroupText, currentGroupIndices, chunks, translationChunks
        )
        displayGroups.push({
          chunkIndices: [...currentGroupIndices],
          text: finalGroupText,
          isLast: true,
          translationText: finalGroupTranslation,
        })

        for (let g = 0; g < displayGroups.length; g++) {
          const group = displayGroups[g]
          const startMs = g === 0
            ? timing.startMs
            : (activeBoundaries[g - 1].startMs + activeBoundaries[g - 1].endMs) / 2
          const endMs = g === displayGroups.length - 1
            ? timing.endMs
            : (activeBoundaries[g].startMs + activeBoundaries[g].endMs) / 2
          const isFullVerse = group.chunkIndices.length === chunks.length

          segments.push({
            type: 'verse-chunk',
            verseIndex: verseArrayIdx,
            chunkText: isFullVerse ? undefined : group.text,
            showMarker: group.isLast,
            showTranslationForChunk: showTranslation,
            translationChunkText: isFullVerse ? undefined : group.translationText,
            startMs: Math.max(startMs, timing.startMs),
            endMs: Math.min(endMs, timing.endMs),
          })
        }

        continue
      } else {
        console.warn(`[sync] V${verseArrayIdx} QDC scale=${scale.toFixed(3)} out of [0.7, 1.3]; falling back to pause heuristic`)
      }
    }

    const pauseProportions = bufferPauses.map(p => {
      const midMs = (p.startMs + p.endMs) / 2
      const relativeMs = (rawStart + midMs) - timing.startMs
      return {
        proportion: Math.max(0, Math.min(1, relativeMs / verseDuration)),
        transitionMs: rawStart + p.startMs,
        resumeMs: rawStart + p.endMs,
      }
    })

    if (pauseProportions.length > 0 && numBoundaries > 0) {
      const boundaryAssignment: Array<{ pauseIdx: number; dist: number } | null> =
        new Array(numBoundaries).fill(null)

      const MAX_PAUSE_TO_BOUNDARY_DIST = 0.13

      for (let pi = 0; pi < pauseProportions.length; pi++) {
        let bestBoundary = -1
        let bestDist = Number.POSITIVE_INFINITY

        for (let k = 0; k < numBoundaries; k++) {
          const dist = Math.abs(pauseProportions[pi].proportion - textBoundaries[k])
          if (dist < bestDist) {
            bestDist = dist
            bestBoundary = k
          }
        }

        if (bestBoundary >= 0 && bestDist < MAX_PAUSE_TO_BOUNDARY_DIST) {
          const existing = boundaryAssignment[bestBoundary]
          if (!existing || bestDist < existing.dist) {
            boundaryAssignment[bestBoundary] = { pauseIdx: pi, dist: bestDist }
          }
        }
      }

      for (let k = 1; k < numBoundaries; k++) {
        const prev = boundaryAssignment[k - 1]
        const curr = boundaryAssignment[k]
        if (prev && curr) {
          if (pauseProportions[curr.pauseIdx].transitionMs <=
              pauseProportions[prev.pauseIdx].resumeMs) {
            if (prev.dist > curr.dist) {
              boundaryAssignment[k - 1] = null
            } else {
              boundaryAssignment[k] = null
            }
          }
        }
      }

      const selectedBoundaries: Array<{ startMs: number; endMs: number } | null> =
        boundaryAssignment.map(a => {
          if (!a) return null
          return {
            startMs: pauseProportions[a.pauseIdx].transitionMs,
            endMs: pauseProportions[a.pauseIdx].resumeMs,
          }
        })

      console.log(`[sync] V${verseArrayIdx} pause assignment (${pauseProportions.length} pauses, ${numBoundaries} boundaries):`)
      for (let k = 0; k < numBoundaries; k++) {
        const a = boundaryAssignment[k]
        if (a) {
          console.log(`  Boundary ${k} (text@${(textBoundaries[k]*100).toFixed(1)}%) ← Pause@${(pauseProportions[a.pauseIdx].proportion*100).toFixed(1)}% (dist ${(a.dist*100).toFixed(1)}%)`)
        } else {
          console.log(`  Boundary ${k} (text@${(textBoundaries[k]*100).toFixed(1)}%) ← PROPORTIONAL (no close pause)`)
        }
      }

      // For chunks ending in a waqf mark, the screen MUST advance at that
      // boundary even if pause-detection missed the audio gap. Reciters like
      // Mohamed Ayoub have short waqf pauses (~150ms) that fall below
      // findInternalPauses' 250ms threshold, which previously caused the
      // boundary to be dropped and the next chunk to be merged into the
      // current display group — making the screen lag one chunk behind the
      // audio. When that happens, fall back to a text-proportional transition.
      const SYNTHETIC_PAUSE_HALF_WIDTH_MS = 80
      const effectiveBoundaries = selectedBoundaries.map((b, idx) => {
        if (!chunks[idx].endsWithWaqf) return null
        if (b !== null) return b
        const propTimeMs = timing.startMs + textBoundaries[idx] * verseDuration
        console.log(`[sync] V${verseArrayIdx} boundary ${idx} (text@${(textBoundaries[idx]*100).toFixed(1)}%): no pause detected, using proportional time ${(propTimeMs/1000).toFixed(2)}s`)
        return {
          startMs: propTimeMs - SYNTHETIC_PAUSE_HALF_WIDTH_MS,
          endMs: propTimeMs + SYNTHETIC_PAUSE_HALF_WIDTH_MS,
        }
      })

      type DisplayGroup = {
        chunkIndices: number[]
        text: string
        isLast: boolean
        translationText: string
      }

      const displayGroups: DisplayGroup[] = []
      const activePauses: Array<{ startMs: number; endMs: number }> = []
      let currentGroupIndices: number[] = [0]

      for (let b = 0; b < numBoundaries; b++) {
        if (effectiveBoundaries[b] !== null) {
          const groupText = currentGroupIndices.map(ci => chunks[ci].text).join(' ')
          const groupTranslation = buildGroupTranslationText(
            verse, groupText, currentGroupIndices, chunks, translationChunks
          )

          displayGroups.push({
            chunkIndices: [...currentGroupIndices],
            text: groupText,
            isLast: false,
            translationText: groupTranslation,
          })
          activePauses.push(effectiveBoundaries[b]!)
          currentGroupIndices = [b + 1]
        } else {
          currentGroupIndices.push(b + 1)
        }
      }

      const finalGroupText = currentGroupIndices.map(ci => chunks[ci].text).join(' ')
      const finalGroupTranslation = buildGroupTranslationText(
        verse, finalGroupText, currentGroupIndices, chunks, translationChunks
      )
      displayGroups.push({
        chunkIndices: [...currentGroupIndices],
        text: finalGroupText,
        isLast: true,
        translationText: finalGroupTranslation,
      })

      console.log(`[sync] V${verseArrayIdx} waqf+pause merge: ${chunks.length} text chunks -> ${displayGroups.length} display groups`)

      for (let g = 0; g < displayGroups.length; g++) {
        const group = displayGroups[g]
        const startMs = g === 0
          ? timing.startMs
          : (activePauses[g - 1].startMs + activePauses[g - 1].endMs) / 2
        const endMs = g === displayGroups.length - 1
          ? timing.endMs
          : (activePauses[g].startMs + activePauses[g].endMs) / 2
        const isFullVerse = group.chunkIndices.length === chunks.length

        segments.push({
          type: 'verse-chunk',
          verseIndex: verseArrayIdx,
          chunkText: isFullVerse ? undefined : group.text,
          showMarker: group.isLast,
          showTranslationForChunk: showTranslation,
          translationChunkText: isFullVerse ? undefined : group.translationText,
          startMs: Math.max(startMs, timing.startMs),
          endMs: Math.min(endMs, timing.endMs),
        })
      }

    } else {
      segments.push({
        type: 'verse-chunk',
        verseIndex: verseArrayIdx,
        chunkText: undefined,
        showMarker: true,
        showTranslationForChunk: showTranslation,
        translationChunkText: undefined,
        startMs: timing.startMs,
        endMs: timing.endMs,
      })
    }
  }

  return segments
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════

// Cross-fade transition window centered on each segment boundary.
// Total transition time = FADE_DURATION_MS. Total brightness stays at 1.0
// throughout (no "blink") because outgoing/incoming alphas are cos²/sin²
// pair that always sums to 1.
const FADE_DURATION_MS = 220

export function useVideoGenerator(config: ReelConfig): UseVideoGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)
  const latestConfigRef = useRef(config)
  useEffect(() => {
    latestConfigRef.current = config
  }, [config])

  const generateVideo = useCallback(
    async (options: VideoGeneratorOptions) => {
      const {
        verses, background, showTranslation, surahName, qdcRecitationId,
        reciterFolder, surahId, startVerse, endVerse,
        displayMode = 'minimal', includeIstiadha = true,
      } = options

      if (verses.length === 0) { setError('No verses to generate video from'); return }

      setIsGenerating(true)
      setProgress(0)
      setError(null)
      cancelledRef.current = false

      try {
        const width = 720
        const height = 1280
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d', { alpha: false })!

        setProgress(5)
        const audioCtx = new AudioContext({ sampleRate: 48000 })
        const decodedBuffers: AudioBuffer[] = []

        const taawudhText = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ'
        const BISMILLAH_TEXT = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'
        const qdcVerseTimings = qdcRecitationId
          ? await fetchAudioSegments(qdcRecitationId, surahId, startVerse, endVerse).catch(() => [])
          : []

        let taawudhBuffer: AudioBuffer | null = null
        if (includeIstiadha) {
          try {
            const resp = await fetch('/audio/taawwudh.mp3')
            if (resp.ok) { taawudhBuffer = await audioCtx.decodeAudioData(await resp.arrayBuffer()) }
          } catch { }
        }

        const needsBismillah = startVerse === 1 && surahId !== 1 && surahId !== 9
        let bismillahBuffer: AudioBuffer | null = null
        if (needsBismillah) {
          try {
            const originalUrl = `https://everyayah.com/data/${reciterFolder}/001001.mp3`
            const resp = await fetch(`/api/audio?url=${encodeURIComponent(originalUrl)}`)
            if (resp.ok) { bismillahBuffer = await audioCtx.decodeAudioData(await resp.arrayBuffer()) }
          } catch { }
        }

        for (let i = startVerse; i <= endVerse; i++) {
          if (cancelledRef.current) { audioCtx.close(); return }
          const filename = `${surahId.toString().padStart(3, '0')}${i.toString().padStart(3, '0')}.mp3`
          const originalUrl = `https://everyayah.com/data/${reciterFolder}/${filename}`
          const resp = await fetch(`/api/audio?url=${encodeURIComponent(originalUrl)}`)
          if (!resp.ok) throw new Error(`Failed to fetch audio for verse ${i}`)
          decodedBuffers.push(await audioCtx.decodeAudioData(await resp.arrayBuffer()))
          setProgress(5 + ((i - startVerse + 1) / (endVerse - startVerse + 1)) * 25)
        }

        if (bismillahBuffer) decodedBuffers.unshift(bismillahBuffer)
        if (taawudhBuffer) decodedBuffers.unshift(taawudhBuffer)
        if (cancelledRef.current) { audioCtx.close(); return }

        const sampleRate = audioCtx.sampleRate
        const totalSamples = decodedBuffers.reduce((s, b) => s + b.length, 0)
        const combined = audioCtx.createBuffer(2, totalSamples, sampleRate)
        let sampleOffset = 0, timeOffset = 0
        const rawTimings: Array<{ startMs: number; endMs: number }> = []

        for (const buf of decodedBuffers) {
          const durationMs = (buf.length / sampleRate) * 1000
          rawTimings.push({ startMs: timeOffset, endMs: timeOffset + durationMs })
          timeOffset += durationMs
          for (let ch = 0; ch < 2; ch++) {
            const srcCh = ch < buf.numberOfChannels ? ch : 0
            combined.getChannelData(ch).set(buf.getChannelData(srcCh), sampleOffset)
          }
          sampleOffset += buf.length
        }
        const totalDurationMs = timeOffset

        // ── Audio analysis ──
        const leadingSilences = decodedBuffers.map(buf => findLeadingSilenceMs(buf))
        const trailingSilences = decodedBuffers.map(buf => findTrailingSilenceMs(buf))
        const sampleRateMs = sampleRate / 1000
        const bufferRecitationDurations = decodedBuffers.map((buf, i) => {
          const totalMs = (buf.length / sampleRateMs)
          return Math.max(0, totalMs - leadingSilences[i] - trailingSilences[i])
        })
        const displayTimings = rawTimings.map((raw, i) => ({
          startMs: raw.startMs + leadingSilences[i],
          endMs: i < rawTimings.length - 1
            ? rawTimings[i + 1].startMs + leadingSilences[i + 1]
            : totalDurationMs,
        }))

        const perBufferPauses = decodedBuffers.map(buf => findInternalPauses(buf))

        perBufferPauses.forEach((pauses, i) => {
          if (pauses.length > 0) {
            console.log(`[sync] Buffer ${i}: ${pauses.length} pause(s):`,
              pauses.map(p => `${p.startMs.toFixed(0)}–${p.endMs.toFixed(0)}ms (${(p.endMs-p.startMs).toFixed(0)}ms)`).join(', '))
          }
        })

        setProgress(35)

        let backgroundImage: HTMLImageElement | null = null

        if (background.type === 'custom' || background.type === 'preset' || background.type === 'image') {
          try {
            const url = typeof background.value === 'string' ? background.value : background.value[0]
            if (url) backgroundImage = await loadImage(url)
          } catch { }
        }

        try { await document.fonts.load('52px "Nabi"') } catch { }
        try { await document.fonts.load('58px "Nabi"') } catch { }
        try { await document.fonts.load('68px "Nabi"') } catch { }
        try { await document.fonts.load('58px "UthmanicHafs"') } catch { }
        try { await document.fonts.load('68px "UthmanicHafs"') } catch { }
        try { await document.fonts.load('32px "Amiri Quran"') } catch { }
        try { await document.fonts.load('58px "Amiri Quran"') } catch { }
        try { await document.fonts.load('32px "Scheherazade New"') } catch { }
        try { await document.fonts.load('58px "Scheherazade New"') } catch { }
        setProgress(40)

        const taawudhIdx = taawudhBuffer ? 0 : -1
        const bismillahIdx = bismillahBuffer ? (taawudhBuffer ? 1 : 0) : -1
        const introOffset = (taawudhBuffer ? 1 : 0) + (bismillahBuffer ? 1 : 0)
        const qdcByVerseKey = new Map(
          qdcVerseTimings.map((v) => [
            v.verse_key,
            {
              segments: v.segments || [],
              timestamp_from: v.timestamp_from,
              timestamp_to: v.timestamp_to,
            },
          ] as const)
        )
        const qdcInfoByDisplayIndex = displayTimings.map((_, i) => {
          const verseArrayIdx = i - introOffset
          if (verseArrayIdx < 0 || verseArrayIdx >= verses.length) return null
          const verseKey = verses[verseArrayIdx]?.verse_key
          return qdcByVerseKey.get(verseKey) || null
        })

        const displaySegments = buildDisplaySegments(
          displayTimings, verses, introOffset, taawudhIdx, bismillahIdx,
          taawudhText, BISMILLAH_TEXT, displayMode, showTranslation,
          perBufferPauses, rawTimings, qdcInfoByDisplayIndex,
          bufferRecitationDurations
        )

        console.log('[sync] Display segments:')
        displaySegments.forEach((seg, idx) => {
          const dur = ((seg.endMs - seg.startMs) / 1000).toFixed(1)
          const label = seg.type === 'intro' ? 'INTRO'
            : `V${seg.verseIndex} "${(seg.chunkText ?? '(full)').slice(0, 25)}…"`
          console.log(`  [${idx}] ${(seg.startMs/1000).toFixed(2)}s–${(seg.endMs/1000).toFixed(2)}s (${dur}s) ${label}`)
        })

        let useMediaRecorder = false
        try {
          const testCanvas = document.createElement('canvas')
          testCanvas.width = 100; testCanvas.height = 100
          testCanvas.getContext('2d', { alpha: false })!.fillRect(0, 0, 100, 100)
          const testRecorder = new MediaRecorder(testCanvas.captureStream(1), { mimeType: 'video/webm' })
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => { testRecorder.stop(); resolve() }, 100)
            testRecorder.onerror = () => { clearTimeout(t); reject(new Error('fail')) }
            try { testRecorder.start() } catch (e) { clearTimeout(t); reject(e) }
          })
          useMediaRecorder = true
        } catch { }

        setProgress(50)

        if (!useMediaRecorder) {
          audioCtx.close()
          await exportVerseImages(ctx, canvas, verses, background, backgroundImage, surahName, showTranslation, displayMode, setProgress)
          setProgress(100); setIsGenerating(false)
          setError('Video recording is not supported in this browser. Downloaded verse images instead.')
          return
        }

        try {
          const audioDest = audioCtx.createMediaStreamDestination()
          const source = audioCtx.createBufferSource()
          source.buffer = combined; source.connect(audioDest)

          const videoStream = canvas.captureStream(30)
          const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()])

          const MP4_TYPES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=h264,aac', 'video/mp4']
          const WEBM_TYPES = ['video/webm;codecs=vp8,opus', 'video/webm']
          const mimeType = [...MP4_TYPES, ...WEBM_TYPES].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
          const isMp4 = mimeType.startsWith('video/mp4')
          const fileExt = isMp4 ? 'mp4' : 'webm'

          const mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 320_000 })
          const chunks: Blob[] = []
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

          const recordingComplete = new Promise<Blob>((resolve, reject) => {
            mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
            mediaRecorder.onerror = (e) => reject(new Error('MediaRecorder: ' + (e as ErrorEvent).message))
          })

          const cleanupAfterGeneration = () => {
            try { canvas.width = 0; canvas.height = 0 } catch { /* noop */ }
          }

          // Draw a cold first frame before recording starts
          const coldSeg = displaySegments[0]
          if (coldSeg) {
            const videoProgress = 0
            if (coldSeg.type === 'intro') {
              drawFrame(ctx, width, height, backgroundImage, background, surahName, undefined, showTranslation, displayMode, coldSeg.introText, 0, undefined, true, true, 1, undefined, videoProgress)
            } else {
              const verse = coldSeg.verseIndex !== undefined ? verses[coldSeg.verseIndex] : undefined
              drawFrame(ctx, width, height, backgroundImage, background, surahName, verse, showTranslation, displayMode, undefined, 0, coldSeg.chunkText, coldSeg.showMarker, coldSeg.showTranslationForChunk, 1, coldSeg.translationChunkText, videoProgress)
            }
          }

          mediaRecorder.start()

          const audioStartTime = audioCtx.currentTime
          source.start(audioStartTime)

          let currentSegmentIndex = 0
          let recordingFinished = false

          const timerBlob = new Blob([`let id;self.onmessage=e=>{if(e.data==="start")id=setInterval(()=>self.postMessage("t"),33);else{clearInterval(id);close()}}`], { type: 'application/javascript' })
          const timerUrl = URL.createObjectURL(timerBlob)
          const timerWorker = new Worker(timerUrl)

          const HALF_FADE = FADE_DURATION_MS / 2

          const drawSegment = (
            seg: DisplaySegment, alpha: number, animTime: number,
            videoProg: number, fullFrame: boolean,
          ) => {
            if (seg.type === 'intro') {
              if (fullFrame) {
                drawFrame(
                  ctx, width, height, backgroundImage, background, surahName,
                  undefined, showTranslation, displayMode, seg.introText,
                  animTime, undefined, true, true, alpha, undefined, videoProg,
                )
              } else {
                drawIntroContentLayer(ctx, width, height, seg.introText ?? '', alpha)
              }
            } else {
              const verse = seg.verseIndex !== undefined ? verses[seg.verseIndex] : undefined
              if (!verse) return
              if (fullFrame) {
                drawFrame(
                  ctx, width, height, backgroundImage, background, surahName,
                  verse, showTranslation, displayMode, undefined, animTime,
                  seg.chunkText, seg.showMarker, seg.showTranslationForChunk,
                  alpha, seg.translationChunkText, videoProg,
                )
              } else {
                drawVerseContentLayer(
                  ctx, width, height, verse, displayMode,
                  showTranslation && seg.showTranslationForChunk,
                  seg.chunkText, seg.showMarker, seg.translationChunkText, alpha,
                )
              }
            }
          }

          const render = () => {
            if (cancelledRef.current || recordingFinished) return
            const elapsedMs = (audioCtx.currentTime - audioStartTime) * 1000

            for (let i = 0; i < displaySegments.length; i++) {
              if (elapsedMs >= displaySegments[i].startMs && elapsedMs < displaySegments[i].endMs) {
                currentSegmentIndex = i; break
              }
            }

            const seg = displaySegments[currentSegmentIndex]
            if (!seg) return

            const videoProgress = Math.min(elapsedMs / totalDurationMs, 1)
            const msIntoSegment = elapsedMs - seg.startMs
            const msBeforeEnd = seg.endMs - elapsedMs

            // ── CROSS-FADE LOGIC ──
            // Cross-fade window of FADE_DURATION_MS centered on each boundary.
            // Within [boundary - HALF_FADE, boundary + HALF_FADE] both the
            // outgoing and incoming segments are drawn with cos²/sin² alphas
            // that sum to 1 — so total brightness never dips. Outside the
            // window only the current segment is drawn at full alpha.
            const next = displaySegments[currentSegmentIndex + 1]
            const prev = displaySegments[currentSegmentIndex - 1]

            let primaryAlpha = 1
            let overlaySeg: DisplaySegment | null = null
            let overlayAlpha = 0

            if (next && msBeforeEnd < HALF_FADE) {
              // We are in the LEAD-UP to the boundary between seg → next.
              // u: 0 at the start of the fade window (boundary - HALF_FADE),
              //    0.5 at the boundary itself.
              const u = (HALF_FADE - msBeforeEnd) / FADE_DURATION_MS
              const c = Math.cos((Math.PI / 2) * u)
              const sn = Math.sin((Math.PI / 2) * u)
              primaryAlpha = c * c
              overlayAlpha = sn * sn
              overlaySeg = next
            } else if (prev && msIntoSegment < HALF_FADE && prev.endMs >= seg.startMs - 1) {
              // We are in the AFTER part of the boundary between prev → seg.
              // u: 0.5 at the boundary itself, 1 at the end of the fade
              //    window (boundary + HALF_FADE).
              const u = 0.5 + msIntoSegment / FADE_DURATION_MS
              const c = Math.cos((Math.PI / 2) * u)
              const sn = Math.sin((Math.PI / 2) * u)
              primaryAlpha = sn * sn
              overlayAlpha = c * c
              overlaySeg = prev
            }

            // Primary segment: full frame (background + chrome + content).
            drawSegment(seg, primaryAlpha, elapsedMs, videoProgress, true)
            // Overlay segment (if cross-fading): content layer only.
            if (overlaySeg) {
              drawSegment(overlaySeg, overlayAlpha, elapsedMs, videoProgress, false)
            }

            setProgress(50 + videoProgress * 48)
            if (elapsedMs >= totalDurationMs || cancelledRef.current) {
              recordingFinished = true
              timerWorker.postMessage('stop'); timerWorker.terminate(); URL.revokeObjectURL(timerUrl)
              setTimeout(() => {
                source.stop(); mediaRecorder.stop(); audioCtx.close()
                cleanupAfterGeneration()
              }, 300)
            }
          }

          timerWorker.onmessage = render
          timerWorker.postMessage('start')

          let videoBlob = await recordingComplete
          if (cancelledRef.current) { cleanupAfterGeneration(); return }

          setProgress(98)
          if (!isMp4) {
            try {
              const mod = await import('fix-webm-duration')
              const fix = mod.default ?? mod
              videoBlob = await fix(videoBlob, totalDurationMs)
            } catch (e) { console.warn('[video] fix-webm-duration failed:', e) }
          }

          setProgress(99)
          const url = URL.createObjectURL(videoBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = `quran-reel-${surahName.replace(/\s+/g, '-')}-${startVerse}-${endVerse}.${fileExt}`
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url)
          setProgress(100); setIsGenerating(false)
          cleanupAfterGeneration()
        } catch (mediaErr) {
          audioCtx.close()
          try { canvas.width = width; canvas.height = height } catch { /* noop */ }
          await exportVerseImages(ctx, canvas, verses, background, backgroundImage, surahName, showTranslation, displayMode, setProgress)
          setProgress(100); setIsGenerating(false)
          setError('Video recording failed. Downloaded verse images instead.')
        }
      } catch (err) {
        console.error('Video generation error:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate video')
        setIsGenerating(false)
      }
    },
    []
  )

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true; setIsGenerating(false); setProgress(0)
  }, [])

  return { isGenerating, progress, error, generateVideo, cancelGeneration }
}