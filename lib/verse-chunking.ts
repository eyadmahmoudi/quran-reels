/**
 * Verse Chunking Utility
 *
 * Splits long Quran verses into display chunks so they fit comfortably
 * on screen (max N lines per page). Chunks are timed proportionally
 * to word count for better audio sync.
 */

const VIDEO_WIDTH = 1080
const MAX_TEXT_WIDTH = VIDEO_WIDTH - 100 // 980px — matches drawFrame padding

export interface VerseChunk {
  /** The Arabic text for this chunk */
  text: string
  /** Whether this is the last chunk (ayah marker shown here) */
  isLastChunk: boolean
  /** Zero-based chunk index */
  chunkIndex: number
  /** Total number of chunks for this verse */
  totalChunks: number
  /** Number of Arabic words in this chunk (for proportional audio timing) */
  wordCount: number
  /** Number of Arabic base characters excluding diacritics (better audio-proportional weight) */
  charCount: number
  /** Associated audio timing boundaries (optional for simple usage) */
  startMs?: number
  endMs?: number
}

/**
 * Word-wrap text for the video canvas and return the wrapped lines.
 * Uses an offscreen canvas to measure Arabic text at the specified font size.
 */
function measureLines(
  text: string,
  fontSize: number,
  maxWidth: number = MAX_TEXT_WIDTH,
): string[] {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(VIDEO_WIDTH, 100)
      : document.createElement('canvas')
  ;(canvas as HTMLCanvasElement).width = VIDEO_WIDTH
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  if (!ctx) return [text]

  ctx.font = `${fontSize}px "Nabi", sans-serif`
  // Note: OffscreenCanvas doesn't support ctx.direction but measurement
  // is still accurate for width calculations.

  const words = text.split(' ').filter((w) => w.length > 0)
  if (words.length === 0) return [text]

  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function countWords(text: string): number {
  return text.split(' ').filter((w) => w.length > 0).length
}

/**
 * Count Arabic base characters, stripping tashkeel (diacritics) and spaces.
 * This correlates better with spoken duration than word count:
 * diacritical marks don't add pronunciation time, but more base
 * letters generally mean longer recitation.
 */
function countBaseChars(text: string): number {
  // Unicode ranges for Arabic tashkeel / diacritics
  const stripped = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\s]/g, '')
  return stripped.length
}

/**
 * Split verse text into display chunks.
 *
 * @param verseText       Full Arabic text of the verse
 * @param fontSize        Font size used for rendering (default 58 for 'minimal')
 * @param maxLinesPerChunk Max visible lines before splitting (default 2)
 * @returns Array of VerseChunk objects
 */
export function splitVerseIntoChunks(
  verseText: string,
  fontSize: number = 58,
  maxLinesPerChunk: number = 2,
): VerseChunk[] {
  if (!verseText || verseText.trim().length === 0) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: countWords(verseText || ''), charCount: countBaseChars(verseText || '') }]
  }

  const lines = measureLines(verseText, fontSize)

  // Fits in one page — no splitting
  if (lines.length <= maxLinesPerChunk) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: countWords(verseText), charCount: countBaseChars(verseText) }]
  }

  // Determine number of chunks & distribute lines as evenly as possible
  const numChunks = Math.ceil(lines.length / maxLinesPerChunk)
  const linesPerChunk = Math.ceil(lines.length / numChunks)

  const chunks: VerseChunk[] = []
  for (let i = 0; i < numChunks; i++) {
    const startLine = i * linesPerChunk
    const endLine = Math.min((i + 1) * linesPerChunk, lines.length)
    const chunkText = lines.slice(startLine, endLine).join(' ')
    chunks.push({
      text: chunkText,
      isLastChunk: i === numChunks - 1,
      chunkIndex: i,
      totalChunks: numChunks,
      wordCount: countWords(chunkText),
      charCount: countBaseChars(chunkText),
    })
  }

  return chunks
}

/**
 * Split a translation string into the same number of chunks
 * as the Arabic text, proportionally by Arabic word ratio.
 *
 * @param translationText  Full English/other translation text
 * @param arabicChunks     The Arabic VerseChunk[] for this verse
 * @returns Array of translation strings, one per chunk
 */
export function splitTranslation(
  translationText: string,
  arabicChunks: VerseChunk[],
): string[] {
  if (!translationText || arabicChunks.length <= 1) {
    return [translationText]
  }

  // Strip HTML tags from translation
  const clean = translationText.replace(/<[^>]+>/g, '')
  const transWords = clean.split(' ').filter((w) => w.length > 0)
  if (transWords.length === 0) return arabicChunks.map(() => '')

  // Distribute translation words proportionally to Arabic word counts
  const totalArabicWords = arabicChunks.reduce((s, c) => s + c.wordCount, 0)
  if (totalArabicWords === 0) return [clean]

  const result: string[] = []
  let wordIdx = 0
  for (let i = 0; i < arabicChunks.length; i++) {
    const ratio = arabicChunks[i].wordCount / totalArabicWords
    // How many translation words this chunk gets
    let count: number
    if (i === arabicChunks.length - 1) {
      // Last chunk gets all remaining words
      count = transWords.length - wordIdx
    } else {
      count = Math.max(1, Math.round(ratio * transWords.length))
    }
    const end = Math.min(wordIdx + count, transWords.length)
    result.push(transWords.slice(wordIdx, end).join(' '))
    wordIdx = end
  }

  // If we ran out of translation words early, fill empties
  while (result.length < arabicChunks.length) {
    result.push('')
  }

  return result
}

/**
 * Simple word-count based splitting for the live preview
 * (where canvas measurement isn't worth the overhead).
 * Uses a rough character-count heuristic.
 *
 * @param verseText  Full Arabic text
 * @param maxCharsPerChunk  Approximate max characters per chunk (default 80)
 * @returns Array of VerseChunk objects
 */
export function splitVerseForPreview(
  verseText: string,
  maxCharsPerChunk: number = 80,
): VerseChunk[] {
  if (!verseText || verseText.length <= maxCharsPerChunk) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: countWords(verseText || ''), charCount: countBaseChars(verseText || '') }]
  }

  const words = verseText.split(' ').filter((w) => w.length > 0)
  if (words.length <= 2) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: countBaseChars(verseText) }]
  }

  // Build chunks by accumulating words until we exceed maxCharsPerChunk
  const chunks: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxCharsPerChunk && current) {
      chunks.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) chunks.push(current)

  // If only one chunk resulted, no split needed
  if (chunks.length <= 1) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: countBaseChars(verseText) }]
  }

  // Re-balance: try to make chunks roughly equal length
  const numChunks = chunks.length
  const totalWords = words.length
  const wordsPerChunk = Math.ceil(totalWords / numChunks)
  const balanced: VerseChunk[] = []
  for (let i = 0; i < numChunks; i++) {
    const start = i * wordsPerChunk
    const end = Math.min((i + 1) * wordsPerChunk, totalWords)
    const chunkWords = words.slice(start, end)
    const chunkStr = chunkWords.join(' ')
    balanced.push({
      text: chunkStr,
      isLastChunk: i === numChunks - 1,
      chunkIndex: i,
      totalChunks: numChunks,
      wordCount: chunkWords.length,
      charCount: countBaseChars(chunkStr),
    })
  }
  return balanced
}

/**
 * Detect silences (pauses/breaths) in an AudioBuffer.
 * Returns an array of silence midpoints in ms.
 */
function detectSilences(buffer: AudioBuffer, minSilenceMs = 400, threshold = 0.035): number[] {
  const data = buffer.getChannelData(0)
  const sr = buffer.sampleRate
  const minSilenceSamples = (minSilenceMs / 1000) * sr
  const windowSize = Math.floor(sr * 0.05) // 50ms windows

  const silences: number[] = []
  let silenceLen = 0
  let startSilence = -1

  for (let i = 0; i < data.length; i += windowSize) {
    const end = Math.min(i + windowSize, data.length)
    let maxAmp = 0
    for (let j = i; j < end; j++) {
      const abs = Math.abs(data[j])
      if (abs > maxAmp) maxAmp = abs
    }

    if (maxAmp < threshold) {
      if (silenceLen === 0) startSilence = i
      silenceLen += (end - i)
    } else {
      if (silenceLen >= minSilenceSamples) {
        // Find midpoint of the silence
        const midPoint = startSilence + (silenceLen / 2)
        silences.push((midPoint / sr) * 1000)
      }
      silenceLen = 0
    }
  }
  return silences
}

/**
 * Splits verse text precisely according to detected silences (breaths) 
 * in the corresponding audio. Gives perfect word-audio matching.
 * Falls back to proportional splitting if the verse has no breaths or sections are too long.
 */
export function splitVerseWithAudioSilences(
  verseText: string,
  audioBuffer: AudioBuffer | null,
  maxChars = 90
): VerseChunk[] {
  const audioDurationMs = audioBuffer ? audioBuffer.duration * 1000 : 5000

  if (!verseText || verseText.trim().length === 0) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: 0, charCount: 0, startMs: 0, endMs: audioDurationMs }]
  }

  const totalChars = countBaseChars(verseText)
  const words = verseText.split(' ').filter(w => w.trim().length > 0)

  if (words.length <= 2) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: totalChars, startMs: 0, endMs: audioDurationMs }]
  }

  // Find audio pauses
  const silences = audioBuffer ? detectSilences(audioBuffer) : []

  // Create duration segments between silences
  const audioSegments: Array<{ startMs: number; endMs: number; duration: number }> = []
  let lastT = 0
  for (const s of silences) {
    audioSegments.push({ startMs: lastT, endMs: s, duration: s - lastT })
    lastT = s
  }
  audioSegments.push({ startMs: lastT, endMs: audioDurationMs, duration: audioDurationMs - lastT })

  // Distribute text to audio segments proportionally by character count
  // This correctly maps continuous text boundaries to natural audio breath boundaries
  const baseChunks: Array<{ text: string; startMs: number; endMs: number }> = []
  let currentWordIdx = 0

  for (let i = 0; i < audioSegments.length; i++) {
    const seg = audioSegments[i]
    if (seg.duration <= 0) continue

    const targetSegChars = totalChars * (seg.duration / audioDurationMs)
    const segWords: string[] = []
    let segChars = 0

    if (i === audioSegments.length - 1) {
      // Last segment guarantees we swallow remaining words
      while (currentWordIdx < words.length) {
        segWords.push(words[currentWordIdx++])
      }
    } else {
      // Add words until we're closest to the expected split boundary
      while (currentWordIdx < words.length) {
        const w = words[currentWordIdx]
        const c = countBaseChars(w)
        if (segChars + c > targetSegChars && segWords.length > 0) {
          const diffWithout = Math.abs(segChars - targetSegChars)
          const diffWith = Math.abs((segChars + c) - targetSegChars)
          if (diffWith < diffWithout) {
            segWords.push(w)
            segChars += c
            currentWordIdx++
          }
          break // Reached boundary block
        }
        segWords.push(w)
        segChars += c
        currentWordIdx++
      }
    }

    const segText = segWords.join(' ')
    if (segText.trim().length === 0) continue

    // If an audio segment is visually too long (reciter didn't pause for a long time), sub-divide it proportional to char count
    if (segText.length > maxChars * 1.3) {
      const subChunks = splitVerseForPreview(segText, maxChars)
      const subTotalChars = subChunks.reduce((a, b) => a + b.charCount, 0)
      let currentSubMs = seg.startMs

      for (let j = 0; j < subChunks.length; j++) {
        const subC = subChunks[j]
        const subRatio = subTotalChars > 0 ? subC.charCount / subTotalChars : 1 / subChunks.length
        const subDur = seg.duration * subRatio
        baseChunks.push({
          text: subC.text,
          startMs: currentSubMs,
          endMs: currentSubMs + subDur
        })
        currentSubMs += subDur
      }
    } else {
      baseChunks.push({
        text: segText,
        startMs: seg.startMs,
        endMs: seg.endMs
      })
    }
  }

  const finalChunks = baseChunks.length > 0 ? baseChunks : [{ text: verseText, startMs: 0, endMs: audioDurationMs }]
  
  return finalChunks.map((c, idx) => ({
    text: c.text,
    isLastChunk: idx === finalChunks.length - 1,
    chunkIndex: idx,
    totalChunks: finalChunks.length,
    wordCount: countWords(c.text),
    charCount: countBaseChars(c.text),
    startMs: c.startMs,
    endMs: c.endMs,
  }))
}
