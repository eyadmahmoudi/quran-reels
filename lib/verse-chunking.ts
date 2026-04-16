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
 */
function countBaseChars(text: string): number {
  const stripped = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\s]/g, '')
  return stripped.length
}

export function splitVerseIntoChunks(
  verseText: string,
  fontSize: number = 58,
  maxLinesPerChunk: number = 2,
): VerseChunk[] {
  if (!verseText || verseText.trim().length === 0) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: countWords(verseText || ''), charCount: countBaseChars(verseText || '') }]
  }

  const lines = measureLines(verseText, fontSize)

  if (lines.length <= maxLinesPerChunk) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: countWords(verseText), charCount: countBaseChars(verseText) }]
  }

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

export function splitTranslation(
  translationText: string,
  arabicChunks: VerseChunk[],
): string[] {
  if (!translationText || arabicChunks.length <= 1) {
    return [translationText]
  }

  const clean = translationText.replace(/<[^>]+>/g, '')
  const transWords = clean.split(' ').filter((w) => w.length > 0)
  if (transWords.length === 0) return arabicChunks.map(() => '')

  const totalArabicWords = arabicChunks.reduce((s, c) => s + c.wordCount, 0)
  if (totalArabicWords === 0) return [clean]

  const result: string[] = []
  let wordIdx = 0
  for (let i = 0; i < arabicChunks.length; i++) {
    const ratio = arabicChunks[i].wordCount / totalArabicWords
    let count: number
    if (i === arabicChunks.length - 1) {
      count = transWords.length - wordIdx
    } else {
      count = Math.max(1, Math.round(ratio * transWords.length))
    }
    const end = Math.min(wordIdx + count, transWords.length)
    result.push(transWords.slice(wordIdx, end).join(' '))
    wordIdx = end
  }

  while (result.length < arabicChunks.length) {
    result.push('')
  }

  return result
}

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

  if (chunks.length <= 1) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: countBaseChars(verseText) }]
  }

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
 * INTELLIGENT BALANCING ALGORITHM
 * Completely ignores unreliable API timestamps. 
 * Mathematically groups words into equal chunks and protects against orphans.
 */
export function splitVerseByWordTimings(
  verseText: string,
  segments: number[][] | null, // Kept to not break other files
  maxChars = 90,
  surahNumber: number = 0,
  verseNumber: number = 0
): VerseChunk[] {
  if (!verseText || verseText.trim().length === 0) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: 0, charCount: 0 }]
  }

  const words = verseText.split(' ').filter(w => w.trim().length > 0)

  if (words.length <= 2) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: countBaseChars(verseText) }]
  }

  // 1. Determine exactly how many screens we need
  const totalChars = countBaseChars(verseText)
  let numChunks = Math.ceil(totalChars / maxChars)
  if (numChunks <= 0) numChunks = 1

  // 2. Divide the words perfectly evenly across the screens
  const wordsPerChunk = Math.ceil(words.length / numChunks)
  
  const baseChunks: Array<{ text: string }> = []
  let currentChunkWords: string[] = []
  
  for (let i = 0; i < words.length; i++) {
    currentChunkWords.push(words[i])
    
    // Create a cut when we hit the target word count, or reach the end of the verse
    if (currentChunkWords.length >= wordsPerChunk || i === words.length - 1) {
      baseChunks.push({ text: currentChunkWords.join(' ') })
      currentChunkWords = []
    }
  }

  // 3. ABSOLUTE ORPHAN PROTECTION: Never leave 1 or 2 words stranded alone
  if (baseChunks.length > 1) {
    const lastChunk = baseChunks[baseChunks.length - 1]
    const lastChunkWordCount = countWords(lastChunk.text)
    
    if (lastChunkWordCount <= 2) {
      // Merge it with the previous screen
      const prevChunk = baseChunks[baseChunks.length - 2]
      prevChunk.text += ' ' + lastChunk.text
      baseChunks.pop() // Delete the orphan chunk completely
    }
  }

  // 4. Return the chunks. 
  // Notice we purposely DO NOT set startMs or endMs here! 
  // This triggers the bulletproof proportional math fallback in use-video-generator.ts
  return baseChunks.map((c, idx) => ({
    text: c.text,
    isLastChunk: idx === baseChunks.length - 1,
    chunkIndex: idx,
    totalChunks: baseChunks.length,
    wordCount: countWords(c.text),
    charCount: countBaseChars(c.text),
  }))
}