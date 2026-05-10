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
    tafsirId?: number
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
  if (options?.tafsirId) {
    // Tafsir comes through the same translations param as a comma-separated list
    const existing = params.get('translations') || ''
    params.set('translations', existing ? `${existing},${options.tafsirId}` : String(options.tafsirId))
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

/**
 * Fetch QDC's per-verse audio URLs for a chapter range.
 *
 * QDC's `/recitations/{id}/by_chapter/{surah}` endpoint returns relative
 * paths like "Sudais/mp3/002255.mp3"; the full URL is hosted on
 * `verses.quran.com` (already on the audio-proxy allowlist). The audio
 * at these URLs is the same recording as QDC's chapter MP3, sliced per
 * verse — so it matches the QDC segment timestamps exactly. This is
 * critical for sync precision: everyayah.com files for the same reciter
 * are often a DIFFERENT recording with different pacing, which causes
 * progressive drift when their audio is paired with QDC word timings.
 */
export async function fetchQDCVerseAudioUrls(
  recitationId: number,
  surahId: number,
  verseStart: number,
  verseEnd: number,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await fetch(
      `${API_BASE}/recitations/${recitationId}/by_chapter/${surahId}?per_page=300`
    )
    if (!res.ok) return map
    const data = await res.json()
    for (const af of (data.audio_files || []) as Array<{ verse_key?: string; url?: string }>) {
      if (!af.verse_key || !af.url) continue
      const verseNum = parseInt(af.verse_key.split(':')[1])
      if (verseNum < verseStart || verseNum > verseEnd) continue
      const fullUrl = af.url.startsWith('http')
        ? af.url
        : `https://verses.quran.com/${af.url}`
      map.set(af.verse_key, fullUrl)
    }
  } catch (err) {
    console.warn('fetchQDCVerseAudioUrls failed:', err)
  }
  return map
}

/**
 * Local pre-computed segment data for reciters not in QDC.
 *
 * For reciters that QDC does not publish word timings for (e.g. Maher
 * Al-Muaiqly, Muhammad Ayyoub, Nasser Al-Qatami, Husary Mujawwad), we
 * generate the same segment data offline using forced alignment
 * (WhisperX) and ship the JSON files in `public/segments/{folder}/`.
 *
 * The JSON shape matches `verse_timings` from the QDC API so the rest
 * of the rendering pipeline can consume it identically:
 *
 *   {
 *     "verse_timings": [
 *       {
 *         "verse_key": "2:255",
 *         "timestamp_from": 0,           // verse-relative (always 0)
 *         "timestamp_to": 49893,         // verse-relative duration
 *         "segments": [[1, 0, 410], [2, 410, 980], ...]
 *       },
 *       ...
 *     ]
 *   }
 *
 * Returns [] when no local file exists, so the caller falls back to the
 * existing heuristic pause-detection path with no further code change.
 */
export async function fetchLocalSegments(
  reciterFolder: string,
  surahId: number,
  verseStart: number,
  verseEnd: number,
): Promise<
  Array<{
    verse_key: string
    timestamp_from: number
    timestamp_to: number
    segments: number[][]
  }>
> {
  try {
    const res = await fetch(`/segments/${reciterFolder}/${surahId}.json`)
    if (!res.ok) return []
    const data = await res.json()
    const timings = (data.verse_timings || []) as Array<{
      verse_key: string
      timestamp_from: number
      timestamp_to: number
      segments: number[][]
    }>
    return timings.filter((t) => {
      const verseNum = parseInt(t.verse_key.split(':')[1])
      return verseNum >= verseStart && verseNum <= verseEnd
    })
  } catch {
    return []
  }
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

export async function searchAyahs(query: string) {
  if (!query || query.trim() === '') return []
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
    if (!res.ok) throw new Error('Search failed')
    const data = await res.json()
    return data.results || []
  } catch (err) {
    console.error('Search error:', err)
    return []
  }
}

// Concept / semantic search lives in `lib/concept-search.ts` — it runs
// entirely in the browser using transformers.js + pre-computed verse
// embeddings, with no server endpoint and no API key. Import it
// directly from client components.