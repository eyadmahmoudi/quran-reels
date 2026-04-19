import type {
  Surah,
  Verse,
  Reciter,
  RecitationInfo,
  VerseTimings,
  TranslationResource,
} from './quran-types'

const API_BASE = 'https://api.quran.com/api/v4'

// Fetch all surahs
export async function fetchSurahs(): Promise<Surah[]> {
  const res = await fetch(`${API_BASE}/chapters?language=en`)
  if (!res.ok) throw new Error('Failed to fetch surahs')
  const data = await res.json()
  return data.chapters
}

// Fetch single surah info
export async function fetchSurah(surahId: number): Promise<Surah> {
  const res = await fetch(`${API_BASE}/chapters/${surahId}?language=en`)
  if (!res.ok) throw new Error('Failed to fetch surah')
  const data = await res.json()
  return data.chapter
}

// Fetch verses with Uthmani text
export async function fetchVerses(
  surahId: number,
  options?: {
    startVerse?: number
    endVerse?: number
    translationId?: number
    perPage?: number
  }
): Promise<Verse[]> {
  const params = new URLSearchParams({
    words: 'true',
    word_fields: 'text_uthmani,text_indopak',
    fields: 'text_uthmani,text_imlaei,verse_key,verse_number,juz_number,page_number',
    per_page: String(options?.perPage || 286),
  })

  if (options?.translationId) {
    params.set('translations', String(options.translationId))
  }

  const res = await fetch(`${API_BASE}/verses/by_chapter/${surahId}?${params}`)
  if (!res.ok) throw new Error('Failed to fetch verses')
  const data = await res.json()

  let verses: Verse[] = data.verses

  // Filter by verse range if specified
  if (options?.startVerse || options?.endVerse) {
    const start = options.startVerse || 1
    const end = options.endVerse || verses.length
    verses = verses.filter(
      (v) => v.verse_number >= start && v.verse_number <= end
    )
  }

  return verses
}

// Fetch available recitations
export async function fetchRecitations(): Promise<RecitationInfo[]> {
  const res = await fetch(`${API_BASE}/resources/recitations?language=en`)
  if (!res.ok) throw new Error('Failed to fetch recitations')
  const data = await res.json()
  return data.recitations
}

// Fetch verse timings for a recitation
export async function fetchVerseTimings(
  recitationId: number,
  surahId: number
): Promise<VerseTimings[]> {
  const res = await fetch(
    `${API_BASE}/recitations/${recitationId}/by_chapter/${surahId}`
  )
  if (!res.ok) throw new Error('Failed to fetch verse timings')
  const data = await res.json()
  return data.audio_files || []
}

// Get audio URL for a specific verse
export function getVerseAudioUrl(
  recitationId: number,
  verseKey: string
): string {
  // Legacy CDN paths use reciter folder names under verses.quran.com; URLs come from the API.
  // But we'll use the API to get the correct URL
  return `${API_BASE}/recitations/${recitationId}/by_ayah/${verseKey}`
}

// Fetch chapter audio (full surah)
export async function fetchChapterAudio(
  recitationId: number,
  surahId: number
): Promise<{ audio_url: string; duration?: number }> {
  const res = await fetch(
    `${API_BASE}/chapter_recitations/${recitationId}/${surahId}`
  )
  if (!res.ok) throw new Error('Failed to fetch chapter audio')
  const data = await res.json()
  return {
    audio_url: data.audio_file?.audio_url,
    duration: data.audio_file?.duration,
  }
}

// Fetch available translations
export async function fetchTranslations(): Promise<TranslationResource[]> {
  const res = await fetch(`${API_BASE}/resources/translations?language=en`)
  if (!res.ok) throw new Error('Failed to fetch translations')
  const data = await res.json()
  return data.translations
}

// Helper to get verse audio segments for timing
export async function fetchAudioSegments(
  recitationId: number,
  surahId: number,
  verseStart: number,
  verseEnd: number
): Promise<
  Array<{
    verse_key: string
    timestamp_from: number
    timestamp_to: number
    segments: number[][]
  }>
> {
  const res = await fetch(
    `https://api.qurancdn.com/api/qdc/audio/reciters/${recitationId}/audio_files?chapter=${surahId}&segments=true`
  )
  if (!res.ok) {
    console.warn('Failed to fetch audio segments from QDC API')
    return []
  }
  const data = await res.json()

  // Filter to selected verse range
  const audioFiles = data.audio_files?.[0]?.verse_timings || []
  return audioFiles.filter((af: { verse_key: string }) => {
    const verseNum = parseInt(af.verse_key.split(':')[1])
    return verseNum >= verseStart && verseNum <= verseEnd
  })
}

// Get reciter info by ID
export async function fetchReciterInfo(
  recitationId: number
): Promise<RecitationInfo | null> {
  const recitations = await fetchRecitations()
  return recitations.find((r) => r.id === recitationId) || null
}

// Convert milliseconds to formatted time
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Calculate total duration from verse timings
export function calculateTotalDuration(
  timings: Array<{ timestamp_from: number; timestamp_to: number }>
): number {
  if (timings.length === 0) return 0
  const last = timings[timings.length - 1]
  const first = timings[0]
  return last.timestamp_to - first.timestamp_from
}
