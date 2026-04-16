const VIDEO_WIDTH = 1080
const MAX_TEXT_WIDTH = VIDEO_WIDTH - 100 

export interface VerseChunk {
  text: string
  isLastChunk: boolean
  chunkIndex: number
  totalChunks: number
  wordCount: number
  charCount: number
  startMs?: number
  endMs?: number
}

function countWords(text: string): number {
  return text.split(' ').filter((w) => w.length > 0).length
}

function countBaseChars(text: string): number {
  const stripped = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\s]/g, '')
  return stripped.length
}

export function splitVerseForPreview(verseText: string, maxCharsPerChunk: number = 80): VerseChunk[] {
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
    if (test.length > maxCharsPerChunk && current) { chunks.push(current); current = word } else { current = test }
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
    balanced.push({ text: chunkStr, isLastChunk: i === numChunks - 1, chunkIndex: i, totalChunks: numChunks, wordCount: chunkWords.length, charCount: countBaseChars(chunkStr) })
  }
  return balanced
}

export function splitTranslation(translationText: string, arabicChunks: VerseChunk[]): string[] {
  if (!translationText || arabicChunks.length <= 1) return [translationText]
  const clean = translationText.replace(/<[^>]+>/g, '')
  const transWords = clean.split(' ').filter((w) => w.length > 0)
  if (transWords.length === 0) return arabicChunks.map(() => '')
  const totalArabicWords = arabicChunks.reduce((s, c) => s + c.wordCount, 0)
  if (totalArabicWords === 0) return [clean]

  const result: string[] = []
  let wordIdx = 0
  for (let i = 0; i < arabicChunks.length; i++) {
    const ratio = arabicChunks[i].wordCount / totalArabicWords
    let count = i === arabicChunks.length - 1 ? transWords.length - wordIdx : Math.max(1, Math.round(ratio * transWords.length))
    const end = Math.min(wordIdx + count, transWords.length)
    result.push(transWords.slice(wordIdx, end).join(' '))
    wordIdx = end
  }
  while (result.length < arabicChunks.length) result.push('')
  return result
}

export function splitVerseByWordTimings(
  verseText: string,
  segments: number[][] | null,
  maxChars = 90,
  surahNumber: number = 0,
  verseNumber: number = 0
): VerseChunk[] {
  if (!verseText || verseText.trim().length === 0) return [{ text: verseText, isLastChunk: true, chunkIndex: 0, totalChunks: 1, wordCount: 0, charCount: 0, startMs: 0, endMs: 0 }]
  const words = verseText.split(' ').filter(w => w.trim().length > 0)

  if (!segments || segments.length === 0 || words.length <= 2) return splitVerseForPreview(verseText, maxChars)

  let alignedSegments = segments
  if (verseNumber === 1 && surahNumber !== 9 && alignedSegments.length > words.length) {
    alignedSegments = alignedSegments.slice(alignedSegments.length - words.length);
  }

  const baseMs = alignedSegments[0][1]
  const baseChunks: Array<{ text: string; startMs: number; endMs: number }> = []

  let currentWords: string[] = []
  let chunkChars = 0
  let chunkStartMs = Math.max(0, alignedSegments[0][1] - baseMs)

  const PAUSE_THRESHOLD_MS = 350; 
  const dontSplitAfter = ['و', 'ف', 'ب', 'ك', 'ل', 'ولا', 'لا', 'ما', 'يا', 'إن', 'أن', 'هل', 'في', 'من', 'عن', 'على', 'إلى', 'حتى', 'أو', 'ثم', 'إنما', 'فلا']

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const wordBaseChars = countBaseChars(word)

    const currentSegment = i < alignedSegments.length ? alignedSegments[i] : alignedSegments[alignedSegments.length - 1]
    const prevSegment = i > 0 ? (i - 1 < alignedSegments.length ? alignedSegments[i - 1] : alignedSegments[alignedSegments.length - 1]) : currentSegment;

    let isBreathPause = false;
    if (i > 0 && (currentSegment[1] - prevSegment[2]) >= PAUSE_THRESHOLD_MS) isBreathPause = true;

    const cleanLastWord = currentWords.length > 0 ? currentWords[currentWords.length - 1].replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF]/g, '') : '';
    const isProtectedGrammar = dontSplitAfter.includes(cleanLastWord);

    const isTooLong = (chunkChars + wordBaseChars) > maxChars;
    const isNaturalBreak = isBreathPause && (chunkChars >= 20);

    if (currentWords.length > 0 && (isTooLong || isNaturalBreak) && !isProtectedGrammar) {
      baseChunks.push({ text: currentWords.join(' '), startMs: chunkStartMs, endMs: Math.max(0, prevSegment[2] - baseMs) })
      currentWords = [word]
      chunkChars = wordBaseChars
      chunkStartMs = Math.max(0, currentSegment[1] - baseMs)
    } else {
      currentWords.push(word)
      chunkChars += wordBaseChars
    }
  }

  if (currentWords.length > 0) {
    const lastSegment = (words.length - 1) < alignedSegments.length ? alignedSegments[words.length - 1] : alignedSegments[alignedSegments.length - 1]
    baseChunks.push({ text: currentWords.join(' '), startMs: chunkStartMs, endMs: Math.max(0, lastSegment[2] - baseMs) })
  }

  if (baseChunks.length > 1) {
      const lastChunk = baseChunks[baseChunks.length - 1];
      if (lastChunk.text.split(' ').length <= 2) {
         baseChunks[baseChunks.length - 2].text += ' ' + lastChunk.text;
         baseChunks[baseChunks.length - 2].endMs = lastChunk.endMs;
         baseChunks.pop(); 
      }
  }

  return baseChunks.map((c, idx) => ({
    text: c.text, isLastChunk: idx === baseChunks.length - 1, chunkIndex: idx, totalChunks: baseChunks.length,
    wordCount: countWords(c.text), charCount: countBaseChars(c.text), startMs: c.startMs, endMs: c.endMs,
  }))
}