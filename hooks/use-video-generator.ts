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
        lines.push(currentLine)
        lines.push('') 
      } else {
        lines.push(currentLine)
      }
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
      ctx.font = nabiFont
      ctx.textAlign = 'center'
      ctx.fillText(line, width / 2, y)
    } else if (line === '') {
      ctx.font = uthmanicFont
      ctx.textAlign = 'center'
      ctx.fillText(markerChar, width / 2, y)
    } else {
      ctx.font = nabiFont
      const lineW = ctx.measureText(line).width
      const spaceW = ctx.measureText(' ').width
      ctx.font = uthmanicFont
      const mw = ctx.measureText(markerChar).width
      const totalW = lineW + spaceW + mw
      const rightEdge = width / 2 + totalW / 2
      const leftEdge = width / 2 - totalW / 2

      ctx.font = nabiFont
      ctx.textAlign = 'right'
      ctx.fillText(line, rightEdge, y)

      ctx.font = uthmanicFont
      ctx.textAlign = 'left'
      ctx.fillText(markerChar, leftEdge, y)
    }
  })
  ctx.shadowBlur = 0

  if (shouldShowTranslation) {
    const rawTranslation = translationChunkText || (verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? '')
    if (rawTranslation) {
      ctx.fillStyle = displayMode === 'minimal' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)'
      const transFontSize = displayMode === 'minimal' ? 28 : 34
      ctx.font = `${transFontSize}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.direction = 'ltr'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 12

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

function buildDisplaySegments(
  verseTimings: Array<{ startMs: number; endMs: number }>,
  verses: Verse[], introOffset: number, taawudhIdx: number, bismillahIdx: number,
  taawudhText: string, bismillahText: string, displayMode: 'minimal' | 'classic',
  showTranslation: boolean
): DisplaySegment[] {
  const segments: DisplaySegment[] = []

  for (let i = 0; i < verseTimings.length; i++) {
    const timing = verseTimings[i]

    if (i === taawudhIdx) {
      segments.push({ type: 'intro', introText: taawudhText, showMarker: false, showTranslationForChunk: false, startMs: timing.startMs, endMs: timing.endMs })
    } else if (i === bismillahIdx) {
      segments.push({ type: 'intro', introText: bismillahText, showMarker: false, showTranslationForChunk: false, startMs: timing.startMs, endMs: timing.endMs })
    } else {
      const verseArrayIdx = i - introOffset
      if (verseArrayIdx < 0 || verseArrayIdx >= verses.length) continue
      const verse = verses[verseArrayIdx]
      const verseText = verse.text_uthmani || ''
      const maxChars = displayMode === 'minimal' ? 80 : 90
      
      const chunks = splitVerseByWordTimings(verseText, null, maxChars)
      const fullTranslation = verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? ''
      const translationChunks = splitTranslation(fullTranslation, chunks)

      if (chunks.length === 1) {
        segments.push({ type: 'verse-chunk', verseIndex: verseArrayIdx, chunkText: undefined, showMarker: true, showTranslationForChunk: showTranslation, translationChunkText: undefined, startMs: timing.startMs, endMs: timing.endMs })
      } else {
        const actualVerseDuration = timing.endMs - timing.startMs

        // Each chunk's weight = its base chars + a pause bonus if it ends on a waqf mark.
        // WAQF_PAUSE_CHARS is the equivalent "character cost" of a natural recitation pause.
        const WAQF_PAUSE_CHARS = 12

        const weights = chunks.map(c => c.charCount + (c.endsWithWaqf ? WAQF_PAUSE_CHARS : 0))
        const totalWeight = weights.reduce((s, w) => s + w, 0) || 1

        let cumulativeWeight = 0

        for (let j = 0; j < chunks.length; j++) {
          const chunk = chunks[j];
          const proportionStart = cumulativeWeight / totalWeight;
          cumulativeWeight += weights[j];
          const proportionEnd = cumulativeWeight / totalWeight;
          
          let calcStartMs = proportionStart * actualVerseDuration;
          let calcEndMs = proportionEnd * actualVerseDuration;

          segments.push({
            type: 'verse-chunk', verseIndex: verseArrayIdx, chunkText: chunk.text,
            showMarker: chunk.isLastChunk, showTranslationForChunk: showTranslation,
            translationChunkText: translationChunks[chunk.chunkIndex] || '',
            startMs: timing.startMs + calcStartMs,
            endMs: timing.startMs + calcEndMs, 
          })
        }
      }
    }
  }

  return segments
}

const FADE_DURATION_MS = 180

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
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        setProgress(5)
        const audioCtx = new AudioContext({ sampleRate: 48000 })
        const decodedBuffers: AudioBuffer[] = []
        const verseTimings: Array<{ startMs: number; endMs: number }> = []

        const taawudhText = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ'
        const BISMILLAH_TEXT = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

        let taawudhBuffer: AudioBuffer | null = null
        try {
          const resp = await fetch('/audio/taawwudh.mp3')
          if (resp.ok) {
            const ab = await resp.arrayBuffer()
            taawudhBuffer = await audioCtx.decodeAudioData(ab)
          }
        } catch { }

        const needsBismillah = startVerse === 1 && surahId !== 1 && surahId !== 9
        let bismillahBuffer: AudioBuffer | null = null
        if (needsBismillah) {
          try {
            const originalUrl = `https://everyayah.com/data/${reciterFolder}/001001.mp3`;
            const bUrl = `/api/audio?url=${encodeURIComponent(originalUrl)}`
            const resp = await fetch(bUrl)
            if (resp.ok) {
              const ab = await resp.arrayBuffer()
              bismillahBuffer = await audioCtx.decodeAudioData(ab)
            }
          } catch { }
        }

        for (let i = startVerse; i <= endVerse; i++) {
          if (cancelledRef.current) { audioCtx.close(); return }

          const filename = `${surahId.toString().padStart(3, '0')}${i.toString().padStart(3, '0')}.mp3`
          const originalUrl = `https://everyayah.com/data/${reciterFolder}/${filename}`
          
          const proxyUrl = `/api/audio?url=${encodeURIComponent(originalUrl)}`

          const resp = await fetch(proxyUrl)
          if (!resp.ok) throw new Error(`Failed to fetch audio for verse ${i}`)
          const arrayBuf = await resp.arrayBuffer()
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
          decodedBuffers.push(audioBuf)

          setProgress(5 + ((i - startVerse + 1) / (endVerse - startVerse + 1)) * 25)
        }

        if (bismillahBuffer) { decodedBuffers.unshift(bismillahBuffer); }
        if (taawudhBuffer) { decodedBuffers.unshift(taawudhBuffer); }

        if (cancelledRef.current) { audioCtx.close(); return }

        const sampleRate = audioCtx.sampleRate
        const totalSamples = decodedBuffers.reduce((s, b) => s + b.length, 0)
        const combined = audioCtx.createBuffer(2, totalSamples, sampleRate)
        let sampleOffset = 0
        let timeOffset = 0
        for (const buf of decodedBuffers) {
          const durationMs = (buf.length / sampleRate) * 1000
          verseTimings.push({ startMs: timeOffset, endMs: timeOffset + durationMs })
          timeOffset += durationMs
          for (let ch = 0; ch < 2; ch++) {
            const srcCh = ch < buf.numberOfChannels ? ch : 0
            combined.getChannelData(ch).set(buf.getChannelData(srcCh), sampleOffset)
          }
          sampleOffset += buf.length
        }
        const totalDurationMs = timeOffset
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
          verseTimings, verses, introOffset, taawudhIdx, bismillahIdx,
          taawudhText, BISMILLAH_TEXT, displayMode, showTranslation
        )

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
          source.buffer = combined
          source.connect(audioDest)

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
                currentSegmentIndex = i
                break
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
          setProgress(100)
          setIsGenerating(false)
        } catch (mediaErr) {
          audioCtx.close()
          console.log('[video] MediaRecorder failed, falling back to images:', mediaErr)
          await exportVerseImages(ctx, canvas, verses, background, backgroundImage, surahName, showTranslation, displayMode, setProgress)
          setProgress(100)
          setIsGenerating(false)
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
    cancelledRef.current = true
    setIsGenerating(false)
    setProgress(0)
  }, [])

  return { isGenerating, progress, error, generateVideo, cancelGeneration }
}