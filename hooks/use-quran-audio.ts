'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchAudioSegments, fetchChapterAudio } from '@/lib/quran-api'
import type { Verse } from '@/lib/quran-types'

interface VerseTimingInfo {
  verseKey: string
  verseNumber: number
  startTime: number
  endTime: number
  audioUrl: string
}

interface UseQuranAudioProps {
  qdcRecitationId: number | null
  reciterFolder: string
  surahId: number
  startVerse: number
  endVerse: number
  verses: Verse[]
  onVerseChange?: (verseIndex: number) => void
  onComplete?: () => void
}

interface UseQuranAudioReturn {
  isLoading: boolean
  isPlaying: boolean
  currentVerseIndex: number
  progress: number
  duration: number
  currentTime: number
  error: string | null
  verseTimings: VerseTimingInfo[]
  verseSegments: number[][][]
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  seekToVerse: (verseIndex: number) => void
}

export function useQuranAudio({
  qdcRecitationId,
  reciterFolder,
  surahId,
  startVerse,
  endVerse,
  verses,
  onVerseChange,
  onComplete,
}: UseQuranAudioProps): UseQuranAudioReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<AudioBuffer[]>([])
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const verseTimingsRef = useRef<VerseTimingInfo[]>([])
  const verseSegmentsRef = useRef<number[][][]>([])
  const animationFrameRef = useRef<number | null>(null)
  const audioElementsRef = useRef<HTMLAudioElement[]>([])
  const currentAudioIndexRef = useRef(0)

  // Build fallback audio URL using everyayah.com CDN
  const buildAudioUrl = useCallback(
    (surahId: number, verseNumber: number): string => {
      const filename = `${surahId.toString().padStart(3, '0')}${verseNumber.toString().padStart(3, '0')}.mp3`
      return `https://everyayah.com/data/${reciterFolder}/${filename}`
    },
    [reciterFolder]
  )

  // Load audio files using HTML5 Audio for seamless playback
  const loadAudio = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const audioElements: HTMLAudioElement[] = []
      const timings: VerseTimingInfo[] = []
      const matchedSegments: number[][][] = []
      let cumulativeTime = 0

      const segmentsData = qdcRecitationId
        ? await fetchAudioSegments(qdcRecitationId, surahId, startVerse, endVerse).catch(() => [])
        : []

      // Create audio elements for each verse
      for (let i = startVerse; i <= endVerse; i++) {
        const segmentInfo = segmentsData.find((s: any) => s.verse_key === `${surahId}:${i}`)
        matchedSegments.push(segmentInfo?.segments || [])

        // Prefer QDC Audio URL if available, otherwise fallback to EveryAyah
        let originalUrl = ''
        if (segmentInfo && segmentInfo.url) {
          originalUrl = segmentInfo.url.startsWith('http') 
            ? segmentInfo.url 
            : `https://audio.qurancdn.com/${segmentInfo.url}`
        } else {
          originalUrl = buildAudioUrl(surahId, i)
        }

        // Use proxy to avoid CORS issues
        const audioUrl = `/api/audio?url=${encodeURIComponent(originalUrl)}`

        const audio = new Audio()
        audio.preload = 'auto'
        audio.src = audioUrl

        // Wait for metadata to get duration
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout loading audio for verse ${i}`))
          }, 10000)

          audio.onloadedmetadata = () => {
            clearTimeout(timeout)
            resolve()
          }
          audio.onerror = () => {
            clearTimeout(timeout)
            reject(new Error(`Failed to load audio for verse ${i}`))
          }
          audio.load()
        })

        const audioDuration = audio.duration * 1000 // Convert to ms

        timings.push({
          verseKey: `${surahId}:${i}`,
          verseNumber: i,
          startTime: cumulativeTime,
          endTime: cumulativeTime + audioDuration,
          audioUrl,
        })

        cumulativeTime += audioDuration
        audioElements.push(audio)
      }

      audioElementsRef.current = audioElements
      verseTimingsRef.current = timings
      verseSegmentsRef.current = matchedSegments
      setDuration(cumulativeTime)
      setIsLoading(false)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio')
      setIsLoading(false)
      return false
    }
  }, [qdcRecitationId, surahId, startVerse, endVerse, buildAudioUrl])

  // Play audio sequentially
  const playAudioSequence = useCallback(
    async (startIndex: number = 0) => {
      const audioElements = audioElementsRef.current
      if (audioElements.length === 0) return

      currentAudioIndexRef.current = startIndex
      setCurrentVerseIndex(startIndex)
      onVerseChange?.(startIndex)

      const playNext = async (index: number) => {
        if (index >= audioElements.length) {
          setIsPlaying(false)
          onComplete?.()
          return
        }

        const audio = audioElements[index]
        currentAudioIndexRef.current = index
        setCurrentVerseIndex(index)
        onVerseChange?.(index)

        // Update progress tracking
        const updateProgress = () => {
          if (!audioElements[index]) return
          const timing = verseTimingsRef.current[index]
          if (timing) {
            const elapsed = timing.startTime + audio.currentTime * 1000
            setCurrentTime(elapsed)
            setProgress((elapsed / duration) * 100)
          }
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateProgress)
          }
        }

        audio.onended = () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
          }
          playNext(index + 1)
        }

        audio.ontimeupdate = () => {
          const timing = verseTimingsRef.current[index]
          if (timing) {
            const elapsed = timing.startTime + audio.currentTime * 1000
            setCurrentTime(elapsed)
            setProgress((elapsed / duration) * 100)
          }
        }

        try {
          await audio.play()
          animationFrameRef.current = requestAnimationFrame(updateProgress)
        } catch (err) {
          console.error('Failed to play audio:', err)
          setError('Failed to play audio')
          setIsPlaying(false)
        }
      }

      await playNext(startIndex)
    },
    [duration, onVerseChange, onComplete]
  )

  const play = useCallback(async () => {
    // Load audio if not loaded
    if (audioElementsRef.current.length === 0) {
      const loaded = await loadAudio()
      if (!loaded) return
    }

    setIsPlaying(true)
    await playAudioSequence(currentAudioIndexRef.current)
  }, [loadAudio, playAudioSequence])

  const pause = useCallback(() => {
    const currentAudio = audioElementsRef.current[currentAudioIndexRef.current]
    if (currentAudio) {
      currentAudio.pause()
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    // Stop all audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    currentAudioIndexRef.current = 0
    setIsPlaying(false)
    setCurrentVerseIndex(0)
    setProgress(0)
    setCurrentTime(0)
  }, [])

  const seekToVerse = useCallback(
    async (verseIndex: number) => {
      if (verseIndex < 0 || verseIndex >= audioElementsRef.current.length) return

      // Stop current playback
      const currentAudio = audioElementsRef.current[currentAudioIndexRef.current]
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }

      currentAudioIndexRef.current = verseIndex
      setCurrentVerseIndex(verseIndex)

      // Update progress
      const timing = verseTimingsRef.current[verseIndex]
      if (timing) {
        setCurrentTime(timing.startTime)
        setProgress((timing.startTime / duration) * 100)
      }

      // If was playing, continue from new position
      if (isPlaying) {
        await playAudioSequence(verseIndex)
      }
    },
    [duration, isPlaying, playAudioSequence]
  )

  // Cleanup
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Reload audio when config changes
  useEffect(() => {
    stop()
    audioElementsRef.current = []
    verseTimingsRef.current = []
    verseSegmentsRef.current = []
    setDuration(0)
  }, [qdcRecitationId, reciterFolder, surahId, startVerse, endVerse, stop])

  return {
    isLoading,
    isPlaying,
    currentVerseIndex,
    progress,
    duration,
    currentTime,
    error,
    verseTimings: verseTimingsRef.current,
    verseSegments: verseSegmentsRef.current,
    play,
    pause,
    stop,
    seekToVerse,
  }
}