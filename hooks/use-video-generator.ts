'use client'

import { useState, useCallback, useRef } from 'react'
import type { Verse, BackgroundOption } from '@/lib/quran-types'
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

  // No merge step needed. The v3 merge combined close pauses (< 1.5s apart)
  // into one, but this shifted the midpoint and caused wrong boundary
  // assignments. With midpoint transitions (v4), gaps between segments
  // are eliminated anyway, so merging serves no purpose.
  // The position-matching algorithm naturally handles extra pauses by
  // assigning each to its closest boundary and ignoring the rest.

  return rawPauses
}


// ═══════════════════════════════════════════════════════════════════════
// DRAWING (unchanged)
// ═══════════════════════════════════════════════════════════════════════

function drawFrame(
  ctx: CanvasRenderingContext2D, width: number, height: number,
  backgroundImage: HTMLImageElement | null, background: { type: string; value: string },
  surahName: string, verse: Verse | undefined, showTranslation: boolean,
  displayMode: 'minimal' | 'classic', taawudhText?: string, animTimeMs?: number,
  chunkText?: string, showMarker: boolean = true, showTranslationOverride: boolean = true,
  fadeOpacity: number = 1, translationChunkText?: string,
) {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (background.type === 'animated') {
    drawAnimatedBackground(ctx, width, height, animTimeMs ?? 0, background.value)
  } else if (backgroundImage) {
    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height)
    const x = (width - backgroundImage.width * scale) / 2
    const y = (height - backgroundImage.height * scale) / 2
    ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    if (background.value.includes('emerald')) {
      gradient.addColorStop(0, '#0a1a14'); gradient.addColorStop(0.5, '#0d2818'); gradient.addColorStop(1, '#0a1a14')
    } else if (background.value.includes('royal') || background.value.includes('blue')) {
      gradient.addColorStop(0, '#0a0f1a'); gradient.addColorStop(0.5, '#1a2a4a'); gradient.addColorStop(1, '#0a0f1a')
    } else if (background.value.includes('golden')) {
      gradient.addColorStop(0, '#1a1510'); gradient.addColorStop(0.5, '#2a2015'); gradient.addColorStop(1, '#1a1510')
    } else if (background.value.includes('purple')) {
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
    ctx.save()
    ctx.fillStyle = 'white'
    ctx.font = '52px "Nabi", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 18
    ctx.direction = 'rtl'
    ctx.fillText(taawudhText, width / 2, height * 0.44)
    ctx.restore()
    return
  }

  if (displayMode === 'classic') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    roundRect(ctx, width / 2 - 160, 90, 320, 56, 28)
    ctx.fill()
    ctx.fillStyle = 'rgba(212,175,55,0.9)'
    ctx.font = '30px "UthmanicHafs", "Amiri Quran", "Scheherazade New", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(surahName, width / 2, 118)
    ctx.restore()
  }

  if (!verse) return

  ctx.save()
  ctx.globalAlpha = fadeOpacity

  ctx.fillStyle = 'white'
  const arabicFontSize = displayMode === 'minimal' ? 58 : 68
  const nabiFont = `${arabicFontSize}px "Nabi", sans-serif`
  const uthmanicFont = `${arabicFontSize}px "UthmanicHafs", "Amiri Quran", "Scheherazade New", serif`
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = displayMode === 'minimal' ? 18 : 24
  ctx.direction = 'rtl'

  const verseText = chunkText || verse.text_uthmani || verse.words?.map(w => w.text_uthmani).join(' ') || ''
  const verseNumber = parseInt(verse.verse_key.split(':')[1])
  const markerChar = `\u06DD${toArabicNumerals(verseNumber)}`

  ctx.font = uthmanicFont
  const markerWidth = ctx.measureText(markerChar).width

  ctx.font = nabiFont
  const maxWidth = width - 100
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
  const shouldShowTranslation = showTranslation && showTranslationOverride
  const textCenterY = displayMode === 'minimal' ? height * 0.44 : height / 2 - (shouldShowTranslation ? 80 : 0)
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
      const transFontSize = displayMode === 'minimal' ? 28 : 34
      ctx.font = `${transFontSize}px Georgia, serif`
      ctx.textAlign = 'center'; ctx.direction = 'ltr'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12

      const transWords = rawTranslation.split(' ')
      const transLines: string[] = []
      let transLine = ''
      for (const word of transWords) {
        const testLine = transLine ? `${transLine} ${word}` : word
        if (ctx.measureText(testLine).width > width - 160 && transLine) {
          transLines.push(transLine); transLine = word
        } else { transLine = testLine }
      }
      if (transLine) transLines.push(transLine)

      const transLineHeight = transFontSize * 1.5
      const transY = textStartY + totalTextHeight + (displayMode === 'minimal' ? 44 : 70)
      transLines.forEach((line, i) => ctx.fillText(line, width / 2, transY + i * transLineHeight))
    }
  }
  ctx.restore()
}

async function exportVerseImages(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, verses: Verse[],
  background: { type: string; value: string }, backgroundImage: HTMLImageElement | null,
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

/**
 * FIX v3 — POSITION-BASED MATCHING
 *
 * The v2 approach tried to match detected audio pauses to text waqf groups
 * 1:1. This failed because:
 *   - Reciters pause for breathing, emphasis, etc. — not just waqf marks
 *   - Close consecutive pauses created 0.8s segments → blank frames
 *   - "Pick the longest N pauses" didn't guarantee correct positions
 *
 * v3 approach: POSITION MATCHING
 * ─────────────────────────────────────────────────────────────────────
 * 1. Text chunks have cumulative proportional positions:
 *    e.g., 3 chunks → boundaries at 40% and 75% of text
 *
 * 2. These proportions estimate where in the AUDIO the boundary should be:
 *    e.g., 40% of audio duration ≈ first boundary
 *
 * 3. For each estimated boundary, find the NEAREST detected audio pause.
 *    This is more robust than 1:1 matching because:
 *    - Extra pauses (breathing) are harmlessly ignored
 *    - Missing pauses → the estimate is used without correction
 *    - Close pauses → only the one nearest to the text boundary is used
 *
 * 4. Each selected pause is snapped to: no two boundaries use the same
 *    pause, and they stay in chronological order.
 *
 * Result: For An-Nisa v1, the 400ms waqf pause at ~16s is the nearest
 * pause to the ~40% text boundary, and it gets selected. The 240ms
 * breathing pauses at other positions are ignored because they're not
 * nearest to any text boundary.
 */
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
  rawTimings: Array<{ startMs: number; endMs: number }>
): DisplaySegment[] {
  const segments: DisplaySegment[] = []
  const WAQF_BONUS_CHARS = 14

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

    // ── Single chunk → no splitting needed ──
    if (chunks.length === 1) {
      segments.push({
        type: 'verse-chunk', verseIndex: verseArrayIdx, chunkText: undefined,
        showMarker: true, showTranslationForChunk: showTranslation,
        translationChunkText: undefined,
        startMs: timing.startMs, endMs: timing.endMs,
      })
      continue
    }

    // ── Multiple chunks: position-matched audio pauses ──

    const verseDuration = timing.endMs - timing.startMs
    const numBoundaries = chunks.length - 1

    // Compute text-based proportional boundary positions
    const weights = chunks.map(c =>
      c.charCount + (c.endsWithWaqf ? WAQF_BONUS_CHARS : 0)
    )
    const totalWeight = weights.reduce((s, w) => s + w, 0) || 1

    // textBoundaries[k] = the proportional position (0–1) where chunk k ends
    const textBoundaries: number[] = []
    let cumW = 0
    for (let j = 0; j < numBoundaries; j++) {
      cumW += weights[j]
      textBoundaries.push(cumW / totalWeight)
    }

    // Convert buffer-relative pauses → milliseconds from verse display start
    const bufferPauses = perBufferPauses[i] ?? []
    const rawStart = rawTimings[i].startMs

    // Pause midpoints relative to verse display start, as proportions (0–1)
    const pauseProportions = bufferPauses.map(p => {
      const midMs = (p.startMs + p.endMs) / 2
      const relativeMs = (rawStart + midMs) - timing.startMs
      return {
        proportion: Math.max(0, Math.min(1, relativeMs / verseDuration)),
        // Actual timeline positions for building segments
        transitionMs: rawStart + p.startMs,  // text changes at pause start
        resumeMs: rawStart + p.endMs,        // voice resumes at pause end
      }
    })

    if (pauseProportions.length > 0 && numBoundaries > 0) {
      // ═══ OPTIMAL PAUSE-FIRST MATCHING ═══
      //
      // FIX v4: The v3 algorithm was GREEDY in the wrong direction —
      // it iterated boundaries in order and each boundary grabbed the
      // nearest available pause. This caused boundary 0 to steal a
      // pause that was actually closer to boundary 1.
      //
      // Example (An-Nisa verse 2):
      //   Boundary 0 at 25.6%, Boundary 1 at 54.1%
      //   Single pause at 40.9%
      //   Greedy: Boundary 0 grabs it (dist 15.3%) → Boundary 1 gets nothing
      //   Optimal: Pause goes to Boundary 1 (dist 13.2%) → correct!
      //
      // New algorithm: PAUSE-FIRST assignment
      //   1. For each pause, find the boundary it's closest to
      //   2. If two pauses claim the same boundary, keep the closer one
      //   3. Enforce chronological order in a cleanup pass
      //   4. Boundaries without a pause use proportional fallback

      // Step 1+2: Each pause claims its closest boundary
      // pauseToBoundary[pi] = boundary index, or -1 if no boundary is close
      const boundaryAssignment: Array<{ pauseIdx: number; dist: number } | null> =
        new Array(numBoundaries).fill(null)

      for (let pi = 0; pi < pauseProportions.length; pi++) {
        let closestBoundary = -1
        let closestDist = 0.25 // max tolerance: 25% of verse

        for (let k = 0; k < numBoundaries; k++) {
          const dist = Math.abs(pauseProportions[pi].proportion - textBoundaries[k])
          if (dist < closestDist) {
            closestDist = dist
            closestBoundary = k
          }
        }

        if (closestBoundary >= 0) {
          const existing = boundaryAssignment[closestBoundary]
          if (!existing || closestDist < existing.dist) {
            // This pause is closer → replace
            boundaryAssignment[closestBoundary] = { pauseIdx: pi, dist: closestDist }
          }
        }
      }

      // Step 3: Enforce chronological order — if boundary K's pause is
      // earlier than boundary K-1's pause, drop the out-of-order one
      for (let k = 1; k < numBoundaries; k++) {
        const prev = boundaryAssignment[k - 1]
        const curr = boundaryAssignment[k]
        if (prev && curr) {
          if (pauseProportions[curr.pauseIdx].transitionMs <=
              pauseProportions[prev.pauseIdx].resumeMs) {
            // Out of order — drop the one with worse fit
            if (prev.dist > curr.dist) {
              boundaryAssignment[k - 1] = null
            } else {
              boundaryAssignment[k] = null
            }
          }
        }
      }

      // Convert to selectedBoundaries format
      const selectedBoundaries: Array<{ startMs: number; endMs: number } | null> =
        boundaryAssignment.map(a => {
          if (!a) return null
          return {
            startMs: pauseProportions[a.pauseIdx].transitionMs,
            endMs: pauseProportions[a.pauseIdx].resumeMs,
          }
        })

      // Debug: show how pauses were assigned
      console.log(`[sync] V${verseArrayIdx} pause assignment (${pauseProportions.length} pauses, ${numBoundaries} boundaries):`)
      for (let k = 0; k < numBoundaries; k++) {
        const a = boundaryAssignment[k]
        if (a) {
          console.log(`  Boundary ${k} (text@${(textBoundaries[k]*100).toFixed(1)}%) ← Pause@${(pauseProportions[a.pauseIdx].proportion*100).toFixed(1)}% (dist ${(a.dist*100).toFixed(1)}%)`)
        } else {
          console.log(`  Boundary ${k} (text@${(textBoundaries[k]*100).toFixed(1)}%) ← PROPORTIONAL (no close pause)`)
        }
      }

      // ── AUDIO-AWARE CHUNK MERGING (v5) ──────────────────────────────
      // Instead of displaying every text chunk separately (even when the
      // reciter reads through a waqf without stopping), MERGE chunks
      // whose boundary has no matching audio pause.
      //
      // Example (An-Nisa verse 2, 4 text chunks, 3 boundaries):
      //   Boundary 0 → null (reciter doesn't stop at first ۖ)
      //   Boundary 1 → audio pause (reciter stops at second ۖ)
      //   Boundary 2 → audio pause (reciter stops at ۚ)
      //
      //   Merge: [chunk0 + chunk1] [chunk2] [chunk3]
      //   Display: 3 groups with 2 audio-driven transitions
      //
      // This adapts text display to each reciter's reading style:
      //   - Slow reciter who stops at every waqf → all splits kept
      //   - Fast reciter who reads through some → those splits merged
      // ────────────────────────────────────────────────────────────────

      // Group consecutive chunks: split only at boundaries with audio pauses
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
        if (selectedBoundaries[b] !== null) {
          // Reciter paused here → finalize current group, start new one
          const groupChunks = currentGroupIndices.map(ci => chunks[ci])
          const groupText = groupChunks.map(c => c.text).join(' ')
          const groupTranslation = currentGroupIndices.map(ci =>
            translationChunks[chunks[ci].chunkIndex] || ''
          ).join(' ').trim()

          displayGroups.push({
            chunkIndices: [...currentGroupIndices],
            text: groupText,
            isLast: false,
            translationText: groupTranslation,
          })
          activePauses.push(selectedBoundaries[b]!)
          currentGroupIndices = [b + 1]
        } else {
          // Reciter read through this waqf → merge next chunk into group
          currentGroupIndices.push(b + 1)
        }
      }

      // Final group (always includes remaining chunks)
      {
        const groupChunks = currentGroupIndices.map(ci => chunks[ci])
        const groupText = groupChunks.map(c => c.text).join(' ')
        const groupTranslation = currentGroupIndices.map(ci =>
          translationChunks[chunks[ci].chunkIndex] || ''
        ).join(' ').trim()

        displayGroups.push({
          chunkIndices: [...currentGroupIndices],
          text: groupText,
          isLast: true,
          translationText: groupTranslation,
        })
      }

      // Debug
      console.log(`[sync] V${verseArrayIdx} audio-aware merge: ${chunks.length} text chunks → ${displayGroups.length} display groups`)
      displayGroups.forEach((g, gi) => {
        console.log(`  Group ${gi}: chunks [${g.chunkIndices.join(',')}] "${g.text.slice(0, 30)}…"`)
      })

      // Build segments: each group boundary = one audio pause midpoint
      for (let g = 0; g < displayGroups.length; g++) {
        const group = displayGroups[g]

        const startMs = g === 0
          ? timing.startMs
          : (activePauses[g - 1].startMs + activePauses[g - 1].endMs) / 2

        const endMs = g === displayGroups.length - 1
          ? timing.endMs
          : (activePauses[g].startMs + activePauses[g].endMs) / 2

        // If the group contains ALL chunks, don't set chunkText (shows full verse)
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
      // ═══ FALLBACK: proportional timing ═══
      let cumWeight = 0
      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const pStart = cumWeight / totalWeight
        cumWeight += weights[j]
        const pEnd = cumWeight / totalWeight

        segments.push({
          type: 'verse-chunk', verseIndex: verseArrayIdx,
          chunkText: chunk.text, showMarker: chunk.isLastChunk,
          showTranslationForChunk: showTranslation,
          translationChunkText: translationChunks[chunk.chunkIndex] || '',
          startMs: timing.startMs + pStart * verseDuration,
          endMs: j === chunks.length - 1
            ? timing.endMs
            : timing.startMs + pEnd * verseDuration,
        })
      }
    }
  }

  return segments
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════

const FADE_DURATION_MS = 150

export function useVideoGenerator(): UseVideoGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const generateVideo = useCallback(
    async (options: VideoGeneratorOptions) => {
      const {
        verses, background, showTranslation, surahName,
        reciterFolder, surahId, startVerse, endVerse,
        displayMode = 'minimal'
      } = options

      if (verses.length === 0) { setError('No verses to generate video from'); return }

      setIsGenerating(true)
      setProgress(0)
      setError(null)
      cancelledRef.current = false

      try {
        const width = 1080
        const height = 1920
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')!

        setProgress(5)
        const audioCtx = new AudioContext({ sampleRate: 48000 })
        const decodedBuffers: AudioBuffer[] = []

        const taawudhText = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ'
        const BISMILLAH_TEXT = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

        let taawudhBuffer: AudioBuffer | null = null
        try {
          const resp = await fetch('/audio/taawwudh.mp3')
          if (resp.ok) { taawudhBuffer = await audioCtx.decodeAudioData(await resp.arrayBuffer()) }
        } catch { }

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
        const displayTimings = rawTimings.map((raw, i) => ({
          startMs: raw.startMs + leadingSilences[i],
          endMs: i < rawTimings.length - 1
            ? rawTimings[i + 1].startMs + leadingSilences[i + 1]
            : totalDurationMs,
        }))

        // ── Internal pause detection (v3: higher threshold + merged) ──
        const perBufferPauses = decodedBuffers.map(buf => findInternalPauses(buf))

        perBufferPauses.forEach((pauses, i) => {
          if (pauses.length > 0) {
            console.log(`[sync] Buffer ${i}: ${pauses.length} pause(s):`,
              pauses.map(p => `${p.startMs.toFixed(0)}–${p.endMs.toFixed(0)}ms (${(p.endMs-p.startMs).toFixed(0)}ms)`).join(', '))
          }
        })

        setProgress(35)

        let backgroundImage: HTMLImageElement | null = null
        if (background.type === 'custom' || background.type === 'preset') {
          try { backgroundImage = await loadImage(background.value) } catch { }
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

        const displaySegments = buildDisplaySegments(
          displayTimings, verses, introOffset, taawudhIdx, bismillahIdx,
          taawudhText, BISMILLAH_TEXT, displayMode, showTranslation,
          perBufferPauses, rawTimings
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
          testCanvas.getContext('2d')!.fillRect(0, 0, 100, 100)
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

          const mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 320_000 })
          const chunks: Blob[] = []
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

          const recordingComplete = new Promise<Blob>((resolve, reject) => {
            mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
            mediaRecorder.onerror = (e) => reject(new Error('MediaRecorder: ' + (e as ErrorEvent).message))
          })

          mediaRecorder.start()
          const audioStartTime = audioCtx.currentTime
          source.start(audioStartTime)

          let currentSegmentIndex = 0
          let recordingFinished = false

          const timerBlob = new Blob([`let id;self.onmessage=e=>{if(e.data==="start")id=setInterval(()=>self.postMessage("t"),33);else{clearInterval(id);close()}}`], { type: 'application/javascript' })
          const timerUrl = URL.createObjectURL(timerBlob)
          const timerWorker = new Worker(timerUrl)

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
            let fadeOpacity = 1
            const msIntoSegment = elapsedMs - seg.startMs
            const msBeforeEnd = seg.endMs - elapsedMs
            if (msIntoSegment < FADE_DURATION_MS) {
              fadeOpacity = Math.min(1, msIntoSegment / FADE_DURATION_MS)
            } else if (msBeforeEnd < FADE_DURATION_MS && currentSegmentIndex < displaySegments.length - 1) {
              fadeOpacity = Math.max(0, msBeforeEnd / FADE_DURATION_MS)
            }

            if (seg.type === 'intro') {
              drawFrame(ctx, width, height, backgroundImage, background, surahName, undefined, showTranslation, displayMode, seg.introText, elapsedMs)
            } else {
              const verse = seg.verseIndex !== undefined ? verses[seg.verseIndex] : undefined
              drawFrame(ctx, width, height, backgroundImage, background, surahName, verse, showTranslation, displayMode, undefined, elapsedMs, seg.chunkText, seg.showMarker, seg.showTranslationForChunk, fadeOpacity, seg.translationChunkText)
            }

            setProgress(50 + videoProgress * 48)
            if (elapsedMs >= totalDurationMs || cancelledRef.current) {
              recordingFinished = true
              timerWorker.postMessage('stop'); timerWorker.terminate(); URL.revokeObjectURL(timerUrl)
              setTimeout(() => { source.stop(); mediaRecorder.stop(); audioCtx.close() }, 300)
            }
          }

          timerWorker.onmessage = render
          timerWorker.postMessage('start')

          let videoBlob = await recordingComplete
          if (cancelledRef.current) return

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
        } catch (mediaErr) {
          audioCtx.close()
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