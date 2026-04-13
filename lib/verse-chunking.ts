/**
 * Verse Chunking Utility
 *
 * Splits long Quran verses into display chunks so they fit comfortably
 * on screen (max N lines per page). Chunks are timed proportionally
 * to the verse's total audio duration.
 */

const VIDEO_WIDTH = 1080
const MAX_TEXT_WIDTH = VIDEO_WIDTH - 100 // 980px — matches drawFrame padding

export interface VerseChunk {
  /** The Arabic text for this chunk */
  text: string
  /** Whether this is the last chunk (ayah marker + translation shown here) */
  isLastChunk: boolean
  /** Zero-based chunk index */
  chunkIndex: number
  /** Total number of chunks for this verse */
  totalChunks: number
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
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1 }]
  }

  const lines = measureLines(verseText, fontSize)

  // Fits in one page — no splitting
  if (lines.length <= maxLinesPerChunk) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1 }]
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
    })
  }

  return chunks
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
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1 }]
  }

  const words = verseText.split(' ').filter((w) => w.length > 0)
  if (words.length <= 2) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1 }]
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
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1 }]
  }

  // Re-balance: try to make chunks roughly equal length
  const numChunks = chunks.length
  const totalWords = words.length
  const wordsPerChunk = Math.ceil(totalWords / numChunks)
  const balanced: VerseChunk[] = []
  for (let i = 0; i < numChunks; i++) {
    const start = i * wordsPerChunk
    const end = Math.min((i + 1) * wordsPerChunk, totalWords)
    balanced.push({
      text: words.slice(start, end).join(' '),
      isLastChunk: i === numChunks - 1,
      chunkIndex: i,
      totalChunks: numChunks,
    })
  }
  return balanced
}
