const VIDEO_WIDTH = 1080
const MAX_TEXT_WIDTH = VIDEO_WIDTH - 100 

export interface VerseChunk {
  text: string
  isLastChunk: boolean
  chunkIndex: number
  totalChunks: number
  wordCount: number
  charCount: number
  endsWithWaqf: boolean
}

function countWords(text: string): number {
  return text.split(' ').filter((w) => w.length > 0).length
}

function countBaseChars(text: string): number {
  const stripped = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\s]/g, '')
  return stripped.length
}

const waqfMarks = ['ۖ', 'ۗ', 'ۚ', 'ۛ', 'ۙ', 'مۘ', '۩']

export function splitVerseForPreview(verseText: string, maxCharsPerChunk: number = 80): VerseChunk[] {
  if (!verseText || verseText.length <= maxCharsPerChunk) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: countWords(verseText || ''), charCount: countBaseChars(verseText || ''), endsWithWaqf: false }]
  }

  const words = verseText.split(' ').filter((w) => w.length > 0)
  if (words.length <= 2) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: countBaseChars(verseText), endsWithWaqf: false }]
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
      endsWithWaqf: waqfMarks.some(mark => chunkStr.includes(mark))
    })
  }
  return balanced
}

export function splitTranslation(translationText: string, arabicChunks: VerseChunk[]): string[] {
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

/**
 * GRAMMAR & MEANING ALGORITHM (No QDC Timestamps)
 * Splits on Quranic stop marks, prevents splitting on "ولا", 
 * and relies on proportional audio duration.
 */
export function splitVerseByWordTimings(
  verseText: string,
  segments: any | null, // Ignored entirely
  maxChars = 90
): VerseChunk[] {
  if (!verseText || verseText.trim().length === 0) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: 0, charCount: 0, endsWithWaqf: false }]
  }

  const words = verseText.split(' ').filter(w => w.trim().length > 0)

  if (words.length <= 2) {
    return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: words.length, charCount: countBaseChars(verseText), endsWithWaqf: false }]
  }

  const baseChunks: string[] = []
  let currentChunkWords: string[] = []
  let currentChars = 0
  
  // GRAMMAR GUARD: Never split after these words
  const dontSplitAfter = ['و', 'ف', 'ب', 'ك', 'ل', 'ولا', 'لا', 'ما', 'يا', 'إن', 'أن', 'هل', 'في', 'من', 'عن', 'على', 'إلى', 'حتى', 'أو', 'ثم', 'إنما', 'إلا', 'فلا']

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    currentChunkWords.push(word)
    currentChars += countBaseChars(word)

    const cleanWord = word.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF]/g, '')
    const hasWaqf = waqfMarks.some(mark => word.includes(mark))
    const isForbiddenEnd = dontSplitAfter.includes(cleanWord)
    const isTooLong = currentChars >= maxChars

    if (i === words.length - 1) {
      baseChunks.push(currentChunkWords.join(' '))
      break
    }

    // Split if we hit a Stop Mark, or if it's getting too long, BUT NEVER if it's a forbidden word like "ولا"
    if ((hasWaqf || isTooLong) && !isForbiddenEnd) {
      if (currentChars >= 25 || hasWaqf) {
        baseChunks.push(currentChunkWords.join(' '))
        currentChunkWords = []
        currentChars = 0
      }
    }
  }

  // ORPHAN PROTECTION
  if (baseChunks.length > 1) {
    const lastChunk = baseChunks[baseChunks.length - 1]
    if (countWords(lastChunk) <= 2) {
      baseChunks[baseChunks.length - 2] += ' ' + lastChunk
      baseChunks.pop()
    }
  }

  return baseChunks.map((text, idx) => ({
    text,
    isLastChunk: idx === baseChunks.length - 1,
    chunkIndex: idx,
    totalChunks: baseChunks.length,
    wordCount: countWords(text),
    charCount: countBaseChars(text),
    endsWithWaqf: waqfMarks.some(mark => text.includes(mark)),
  }))
}