'use client'

import { useState, useCallback, useRef } from 'react'
import type { Verse, BackgroundOption } from '@/lib/quran-types'
// fix-webm-duration imported dynamically below

interface VideoGeneratorOptions {
  verses: Verse[]
  background: BackgroundOption
  showTranslation: boolean
  surahName: string
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

/** Convert a number to Arabic-Indic (Eastern Arabic) numerals */
function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

/** Load an HTMLImageElement from a URL */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img); img.onerror = reject; img.src = src
  })
}

/** Load an HTMLVideoElement from a URL and wait until it can play */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = src
    video.oncanplaythrough = () => resolve(video)
    video.onerror = reject
    video.load()
    // Fallback — some browsers fire canplay instead
    video.oncanplay = () => resolve(video)
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
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage: HTMLImageElement | null,
  backgroundVideo: HTMLVideoElement | null,
  background: { type: string; value: string },
  surahName: string,
  verse: Verse | undefined,
  showTranslation: boolean,
  displayMode: 'minimal' | 'classic',
) {
  // ── Background ─────────────────────────────────────────────────────────────
  if (backgroundVideo) {
    // Draw current video frame — cover-fit
    const vw = backgroundVideo.videoWidth || width
    const vh = backgroundVideo.videoHeight || height
    const scale = Math.max(width / vw, height / vh)
    const x = (width - vw * scale) / 2
    const y = (height - vh * scale) / 2
    ctx.drawImage(backgroundVideo, x, y, vw * scale, vh * scale)
  } else if (backgroundImage) {
    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height)
    const x = (width - backgroundImage.width * scale) / 2
    const y = (height - backgroundImage.height * scale) / 2
    ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale)
  } else {
    // Gradient fallback
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

  // Dark overlay — lighter in minimal mode so background video shows through nicely
  if (displayMode === 'minimal') {
    ctx.fillStyle = backgroundVideo ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.20)'
  } else {
    ctx.fillStyle = backgroundImage || backgroundVideo ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)'
  }
  ctx.fillRect(0, 0, width, height)

  // ── Classic mode: Surah name header ────────────────────────────────────────
  if (displayMode === 'classic') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    roundRect(ctx, width / 2 - 160, 90, 320, 56, 28)
    ctx.fill()
    ctx.fillStyle = 'rgba(212,175,55,0.9)'
    ctx.font = '30px "Amiri Quran", "Scheherazade New", Amiri, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(surahName, width / 2, 118)
    ctx.restore()
  }

  if (!verse) return

  // ── Arabic verse text ───────────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = 'white'

  // Minimal matches reference style (smaller, elegant). Classic keeps larger size.
  const arabicFontSize = displayMode === 'minimal' ? 58 : 68
  ctx.font = `${arabicFontSize}px "Amiri Quran", "Scheherazade New", Amiri, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = displayMode === 'minimal' ? 18 : 24
  ctx.direction = 'rtl'

  const verseText = verse.text_uthmani || verse.words?.map(w => w.text_uthmani).join(' ') || ''

  // Always include the verse-end medallion ۝ (U+06DD) with Arabic numeral — matches reference
  const verseNumber = parseInt(verse.verse_key.split(':')[1])
  const markerChar = `\u06DD${toArabicNumerals(verseNumber)}`
  const fullText = `${verseText} ${markerChar}`

  const maxWidth = width - 100
  const words = fullText.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine); currentLine = word
    } else { currentLine = testLine }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = arabicFontSize * 1.6
  const totalTextHeight = lines.length * lineHeight

  // Minimal: slightly above center to give room for translation below (matches reference)
  const textCenterY = displayMode === 'minimal'
    ? height * 0.44
    : height / 2 - (showTranslation ? 80 : 0)
  const textStartY = textCenterY - totalTextHeight / 2

  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, textStartY + i * lineHeight)
  })
  ctx.shadowBlur = 0
  ctx.restore()

  // ── Translation ─────────────────────────────────────────────────────────────
  if (showTranslation && verse.translations?.[0]) {
    ctx.save()
    const rawTranslation = verse.translations[0].text.replace(/<[^>]+>/g, '')
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
    ctx.restore()
  }
}

async function exportVerseImages(
  ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, verses: Verse[],
  background: { type: string; value: string },
  backgroundImage: HTMLImageElement | null,
  backgroundVideo: HTMLVideoElement | null,
  surahName: string, showTranslation: boolean,
  displayMode: 'minimal' | 'classic',
  setProgress: (n: number) => void
) {
  for (let i = 0; i < verses.length; i++) {
    drawFrame(ctx, canvas.width, canvas.height, backgroundImage, backgroundVideo, background, surahName, verses[i], showTranslation, displayMode)
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
        displayMode = 'minimal',
      } = options

      if (verses.length === 0) {
        setError('No verses to generate video from')
        return
      }

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

        // ── 1. Fetch + decode all audio ────────────────────────────────────
        setProgress(5)
        const audioCtx = new AudioContext({ sampleRate: 48000 })
        const decodedBuffers: AudioBuffer[] = []
        const verseTimings: Array<{ startMs: number; endMs: number }> = []

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

        if (cancelledRef.current) { audioCtx.close(); return }

        // Concatenate all decoded PCM buffers into one seamless AudioBuffer
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

        // ── 2. Load background asset ───────────────────────────────────────
        let backgroundImage: HTMLImageElement | null = null
        let backgroundVideo: HTMLVideoElement | null = null

        if (background.type === 'video') {
          try {
            backgroundVideo = await loadVideo(background.value)
            // Start playing so frames are available to draw
            await backgroundVideo.play()
          } catch (e) {
            console.warn('[video] Could not load background video:', e)
          }
        } else if (background.type === 'custom' || background.type === 'preset') {
          try { backgroundImage = await loadImage(background.value) } catch { /* use gradient */ }
        }

        try { await document.fonts.load('32px "Amiri Quran"') } catch { /* optional */ }
        try { await document.fonts.load('58px "Amiri Quran"') } catch { /* optional */ }
        try { await document.fonts.load('32px "Scheherazade New"') } catch { /* optional */ }
        try { await document.fonts.load('58px "Scheherazade New"') } catch { /* optional */ }
        setProgress(40)

        // ── 3. Test MediaRecorder ──────────────────────────────────────────
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
        } catch { /* fallback to images */ }

        setProgress(50)

        // ── 4a. IMAGE FALLBACK ─────────────────────────────────────────────
        if (!useMediaRecorder) {
          audioCtx.close()
          if (backgroundVideo) backgroundVideo.pause()
          await exportVerseImages(ctx, canvas, verses, background, backgroundImage, backgroundVideo, surahName, showTranslation, displayMode, setProgress)
          setProgress(100)
          setIsGenerating(false)
          setError('Video recording is not supported in this browser. Downloaded verse images instead.')
          return
        }

        // ── 4b. RECORD: canvas video + seamless decoded audio ──────────────
        try {
          const audioDest = audioCtx.createMediaStreamDestination()
          const source = audioCtx.createBufferSource()
          source.buffer = combined
          source.connect(audioDest)

          const videoStream = canvas.captureStream(30)
          const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks(),
          ])

          const mimeType =
            MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
            'video/webm'

          const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond: 8_000_000,
            audioBitsPerSecond: 320_000,
          })
          const chunks: Blob[] = []
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

          const recordingComplete = new Promise<Blob>((resolve, reject) => {
            mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
            mediaRecorder.onerror = (e) => reject(new Error('MediaRecorder: ' + (e as ErrorEvent).message))
          })

          mediaRecorder.start(1000)

          const startTime = audioCtx.currentTime
          source.start(startTime)

          const wallStart = performance.now()
          let currentVerseIndex = 0
          let recordingFinished = false

          const render = () => {
            if (cancelledRef.current || recordingFinished) return
            const elapsedMs = performance.now() - wallStart

            for (let i = 0; i < verseTimings.length; i++) {
              if (elapsedMs >= verseTimings[i].startMs && elapsedMs < verseTimings[i].endMs) {
                currentVerseIndex = i
                break
              }
            }

            const videoProgress = Math.min(elapsedMs / totalDurationMs, 1)
            drawFrame(ctx, width, height, backgroundImage, backgroundVideo, background, surahName, verses[currentVerseIndex], showTranslation, displayMode)
            setProgress(50 + videoProgress * 48)

            if (elapsedMs < totalDurationMs && !cancelledRef.current) {
              requestAnimationFrame(render)
            } else {
              recordingFinished = true
              setTimeout(() => {
                source.stop()
                mediaRecorder.stop()
                audioCtx.close()
                if (backgroundVideo) backgroundVideo.pause()
              }, 300)
            }
          }

          render()

          let videoBlob = await recordingComplete
          if (cancelledRef.current) return

          // Patch WebM duration metadata
          setProgress(98)
          try {
            const mod = await import('fix-webm-duration')
            const fix = mod.default ?? mod
            videoBlob = await fix(videoBlob, totalDurationMs)
          } catch { /* use original blob if patch fails */ }

          setProgress(99)
          const url = URL.createObjectURL(videoBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = `quran-reel-${surahName.replace(/\s+/g, '-')}-${startVerse}-${endVerse}.webm`
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url)
          setProgress(100)
          setIsGenerating(false)
        } catch (mediaErr) {
          audioCtx.close()
          if (backgroundVideo) backgroundVideo.pause()
          console.log('[video] MediaRecorder failed, falling back to images:', mediaErr)
          await exportVerseImages(ctx, canvas, verses, background, backgroundImage, backgroundVideo, surahName, showTranslation, displayMode, setProgress)
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
