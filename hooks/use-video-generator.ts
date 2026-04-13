'use client'

import { useState, useCallback, useRef } from 'react'
import type { Verse, BackgroundOption } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'
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
    const img = new Image()
    // Don't set crossOrigin for blob/data URLs — it breaks loading
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
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage: HTMLImageElement | null,
  background: { type: string; value: string },
  surahName: string,
  verse: Verse | undefined,
  showTranslation: boolean,
  displayMode: 'minimal' | 'classic',
  taawudhText?: string,
  animTimeMs?: number,
) {
  // ── Rendering quality ──────────────────────────────────────────────────────
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // ── Background ─────────────────────────────────────────────────────────────
  if (background.type === 'animated') {
    drawAnimatedBackground(ctx, width, height, animTimeMs ?? 0, background.value)
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

  // Dark overlay
  const hasRichBg = background.type === 'animated' || !!backgroundImage
  if (displayMode === 'minimal') {
    ctx.fillStyle = hasRichBg ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.20)'
  } else {
    ctx.fillStyle = hasRichBg ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)'
  }
  ctx.fillRect(0, 0, width, height)

  // ── Ta'awwudh / Bismillah frame: draw intro text when taawudhText is provided and no verse ──
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

  // ── Classic mode: Surah name header ────────────────────────────────────────
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

  // ── Arabic verse text ───────────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = 'white'

  // Minimal matches reference style (smaller, elegant). Classic keeps larger size.
  const arabicFontSize = displayMode === 'minimal' ? 58 : 68
  const nabiFont = `${arabicFontSize}px "Nabi", sans-serif`
  const uthmanicFont = `${arabicFontSize}px "UthmanicHafs", "Amiri Quran", "Scheherazade New", serif`
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = displayMode === 'minimal' ? 18 : 24
  ctx.direction = 'rtl'

  const verseText = verse.text_uthmani || verse.words?.map(w => w.text_uthmani).join(' ') || ''

  // Ayah marker: Arabic-Indic numerals with U+06DD — canvas lacks font-feature-settings
  // so we must use Eastern Arabic digits for UthmanicHafs to render the circle glyph
  const verseNumber = parseInt(verse.verse_key.split(':')[1])
  const markerChar = `\u06DD${toArabicNumerals(verseNumber)}`

  // Measure marker width in UthmanicHafs
  ctx.font = uthmanicFont
  const markerWidth = ctx.measureText(markerChar).width

  // Word-wrap verse text using Nabi font (marker handled separately)
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
  // Check if marker fits on the last line, otherwise give it its own line
  if (currentLine) {
    const lastLineWidth = ctx.measureText(currentLine).width
    const spaceW = ctx.measureText(' ').width
    if (lastLineWidth + spaceW + markerWidth > maxWidth) {
      lines.push(currentLine)
      lines.push('') // marker-only line
    } else {
      lines.push(currentLine)
    }
  }

  const lineHeight = arabicFontSize * 1.6
  const totalTextHeight = lines.length * lineHeight

  // Minimal: slightly above center to give room for translation below (matches reference)
  const textCenterY = displayMode === 'minimal'
    ? height * 0.44
    : height / 2 - (showTranslation ? 80 : 0)
  const textStartY = textCenterY - totalTextHeight / 2

  lines.forEach((line, i) => {
    const y = textStartY + i * lineHeight
    const isLastLine = i === lines.length - 1

    if (!isLastLine) {
      // Regular verse line — Nabi font, centered
      ctx.font = nabiFont
      ctx.textAlign = 'center'
      ctx.fillText(line, width / 2, y)
    } else if (line === '') {
      // Marker-only line — UthmanicHafs, centered
      ctx.font = uthmanicFont
      ctx.textAlign = 'center'
      ctx.fillText(markerChar, width / 2, y)
    } else {
      // Last line with verse text + marker — two fonts, positioned as a centered block
      ctx.font = nabiFont
      const lineW = ctx.measureText(line).width
      const spaceW = ctx.measureText(' ').width
      ctx.font = uthmanicFont
      const mw = ctx.measureText(markerChar).width
      const totalW = lineW + spaceW + mw
      // RTL: verse text on the right, marker on the left
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
  surahName: string, showTranslation: boolean,
  displayMode: 'minimal' | 'classic',
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

        // ── Intro sequence ────────────────────────────────────────────────
        // 1. Ta'awwudh: Al-Husary saying أعوذ بالله من الشيطان الرجيم (served locally)
        // 2. Bismillah from selected reciter: only when startVerse===1,
        //    surah≠1 (Fatiha already has it as v1) and surah≠9 (At-Tawbah)
        const taawudhText = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ'
        const BISMILLAH_TEXT = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

        let taawudhBuffer: AudioBuffer | null = null
        try {
          const resp = await fetch('/audio/taawwudh.mp3')
          if (resp.ok) {
            const ab = await resp.arrayBuffer()
            taawudhBuffer = await audioCtx.decodeAudioData(ab)
          }
        } catch { /* skip if fails */ }

        // Bismillah: fetched from the selected reciter's 001001.mp3
        const needsBismillah = startVerse === 1 && surahId !== 1 && surahId !== 9
        let bismillahBuffer: AudioBuffer | null = null
        if (needsBismillah) {
          try {
            const bUrl = `/api/audio?url=${encodeURIComponent(`https://everyayah.com/data/${reciterFolder}/001001.mp3`)}`
            const resp = await fetch(bUrl)
            if (resp.ok) {
              const ab = await resp.arrayBuffer()
              bismillahBuffer = await audioCtx.decodeAudioData(ab)
            }
          } catch { /* skip if fails */ }
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

        // Prepend intro buffers: [ta'awwudh?, bismillah?, ...verses]
        if (bismillahBuffer) decodedBuffers.unshift(bismillahBuffer)
        if (taawudhBuffer) decodedBuffers.unshift(taawudhBuffer)

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

        // ── 2. Load background image (animated backgrounds need no asset) ──
        let backgroundImage: HTMLImageElement | null = null

        if (background.type === 'custom' || background.type === 'preset') {
          try { backgroundImage = await loadImage(background.value) } catch { /* use gradient */ }
        }

        try { await document.fonts.load('52px "Nabi"') } catch { /* optional */ }
        try { await document.fonts.load('58px "Nabi"') } catch { /* optional */ }
        try { await document.fonts.load('68px "Nabi"') } catch { /* optional */ }
        try { await document.fonts.load('58px "UthmanicHafs"') } catch { /* optional */ }
        try { await document.fonts.load('68px "UthmanicHafs"') } catch { /* optional */ }
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
          await exportVerseImages(ctx, canvas, verses, background, backgroundImage, surahName, showTranslation, displayMode, setProgress)
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

          // Prefer MP4 (H.264+AAC) — plays natively in phone galleries.
          // Chrome 130+ on Windows/Android supports this via hardware encoding.
          // Fall back to WebM if MP4 is unavailable.
          const MP4_TYPES = [
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4;codecs=h264,aac',
            'video/mp4',
          ]
          const WEBM_TYPES = [
            'video/webm;codecs=vp8,opus',
            'video/webm',
          ]
          const mimeType =
            [...MP4_TYPES, ...WEBM_TYPES].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
          const isMp4 = mimeType.startsWith('video/mp4')
          const fileExt = isMp4 ? 'mp4' : 'webm'

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

          // No timeslice — record as a single blob so the container header
          // gets the correct total duration.  Using start(1000) wrote duration
          // from only the first 1-second chunk, which made phones/stories show
          // the video as ~3 s even though it plays longer.
          mediaRecorder.start()

          // Start audio and capture the audio-clock start time.
          // We use audioCtx.currentTime (not performance.now()) as the timing
          // source so the canvas render loop stays perfectly in sync with the
          // audio — the two clocks can drift apart over longer recordings.
          const audioStartTime = audioCtx.currentTime
          source.start(audioStartTime)

          let currentVerseIndex = 0
          let recordingFinished = false

          // Compute intro slot indices
          const taawudhIdx = taawudhBuffer ? 0 : -1
          const bismillahIdx = bismillahBuffer ? (taawudhBuffer ? 1 : 0) : -1
          const introOffset = (taawudhBuffer ? 1 : 0) + (bismillahBuffer ? 1 : 0)

          // Use a Web Worker timer instead of requestAnimationFrame.
          // rAF is paused when the tab is in the background, which freezes
          // the canvas while audio keeps playing — corrupting the recording.
          // Web Worker setInterval runs unthrottled regardless of tab focus.
          const timerBlob = new Blob([
            `let id;self.onmessage=e=>{if(e.data==="start")id=setInterval(()=>self.postMessage("t"),33);else{clearInterval(id);close()}}`
          ], { type: 'application/javascript' })
          const timerUrl = URL.createObjectURL(timerBlob)
          const timerWorker = new Worker(timerUrl)

          const render = () => {
            if (cancelledRef.current || recordingFinished) return
            // Elapsed time in ms, locked to the audio clock
            const elapsedMs = (audioCtx.currentTime - audioStartTime) * 1000

            for (let i = 0; i < verseTimings.length; i++) {
              if (elapsedMs >= verseTimings[i].startMs && elapsedMs < verseTimings[i].endMs) {
                currentVerseIndex = i
                break
              }
            }

            const videoProgress = Math.min(elapsedMs / totalDurationMs, 1)

            if (currentVerseIndex === taawudhIdx) {
              drawFrame(ctx, width, height, backgroundImage, background, surahName, undefined, showTranslation, displayMode, taawudhText, elapsedMs)
            } else if (currentVerseIndex === bismillahIdx) {
              drawFrame(ctx, width, height, backgroundImage, background, surahName, undefined, showTranslation, displayMode, BISMILLAH_TEXT, elapsedMs)
            } else {
              const verseArrayIndex = currentVerseIndex - introOffset
              drawFrame(ctx, width, height, backgroundImage, background, surahName, verses[verseArrayIndex], showTranslation, displayMode, undefined, elapsedMs)
            }

            setProgress(50 + videoProgress * 48)

            if (elapsedMs >= totalDurationMs || cancelledRef.current) {
              recordingFinished = true
              timerWorker.postMessage('stop')
              timerWorker.terminate()
              URL.revokeObjectURL(timerUrl)
              setTimeout(() => {
                source.stop()
                mediaRecorder.stop()
                audioCtx.close()
              }, 300)
            }
          }

          timerWorker.onmessage = render
          timerWorker.postMessage('start')

          let videoBlob = await recordingComplete
          if (cancelledRef.current) return

          // Patch WebM duration metadata (only needed for WebM, not MP4)
          setProgress(98)
          if (!isMp4) {
            try {
              const mod = await import('fix-webm-duration')
              const fix = mod.default ?? mod
              videoBlob = await fix(videoBlob, totalDurationMs)
            } catch (e) {
              console.warn('[video] fix-webm-duration failed:', e)
            }
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
