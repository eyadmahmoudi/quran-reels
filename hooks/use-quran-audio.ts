'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchAudioSegments } from '@/lib/quran-api'
import type { Verse } from '@/lib/quran-types'

interface VerseTimingInfo {
  verseKey: string; verseNumber: number; startTime: number; endTime: number; audioUrl: string
}

interface UseQuranAudioProps {
  qdcRecitationId: number | null; reciterFolder: string; surahId: number; startVerse: number; endVerse: number; verses: Verse[]; onVerseChange?: (verseIndex: number) => void; onComplete?: () => void
}

function normalizeQdcUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `https://verses.quran.foundation${url}`;
  return `https://verses.quran.foundation/${url}`;
}

export function useQuranAudio({ qdcRecitationId, reciterFolder, surahId, startVerse, endVerse, verses, onVerseChange, onComplete }: UseQuranAudioProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioElementsRef = useRef<HTMLAudioElement[]>([])
  const currentAudioIndexRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const verseTimingsRef = useRef<VerseTimingInfo[]>([])
  const verseSegmentsRef = useRef<number[][][]>([])

  const loadAudio = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const audioElements: HTMLAudioElement[] = []; const timings: VerseTimingInfo[] = []; const matchedSegments: number[][][] = [];
      let cumulativeTime = 0

      const segmentsData = qdcRecitationId ? await fetchAudioSegments(qdcRecitationId, surahId, startVerse, endVerse).catch(() => []) : []

      let qdcAudioFiles: any[] = [];
      if (qdcRecitationId) {
        try {
          const res = await fetch(`https://api.quran.com/api/v4/recitations/${qdcRecitationId}/by_chapter/${surahId}`);
          if (res.ok) { const data = await res.json(); qdcAudioFiles = data.audio_files || []; }
        } catch (e) { console.warn('Failed to fetch QDC audio URLs'); }
      }

      for (let i = startVerse; i <= endVerse; i++) {
        const verseKey = `${surahId}:${i}`
        const urlsToTry: string[] = []

        if (qdcRecitationId) {
          const qdcFile = qdcAudioFiles.find((a: any) => a.verse_key === verseKey);
          if (qdcFile && qdcFile.url) urlsToTry.push(normalizeQdcUrl(qdcFile.url));
        }
        if (reciterFolder) {
          urlsToTry.push(`https://everyayah.com/data/${reciterFolder}/${surahId.toString().padStart(3, '0')}${i.toString().padStart(3, '0')}.mp3`);
        }

        let loaded = false; let audioDuration = 0; let finalUrl = ''; let loadedAudio = new Audio();
        
        for (const url of urlsToTry) {
          try {
            const proxyUrl = `/api/audio?url=${encodeURIComponent(url)}`
            loadedAudio = new Audio(); loadedAudio.preload = 'auto'; loadedAudio.src = proxyUrl;
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Timeout')), 10000)
              loadedAudio.onloadedmetadata = () => { clearTimeout(timeout); resolve() }
              loadedAudio.onerror = () => { clearTimeout(timeout); reject(new Error('Failed')) }
              loadedAudio.load()
            })
            audioDuration = loadedAudio.duration * 1000; finalUrl = proxyUrl; loaded = true; break;
          } catch (e) { continue; }
        }

        if (!loaded) throw new Error(`Failed to load audio for verse ${i}`)

        const segmentInfo = segmentsData.find(s => s.verse_key === verseKey)
        matchedSegments.push(segmentInfo?.segments || [])
        timings.push({ verseKey, verseNumber: i, startTime: cumulativeTime, endTime: cumulativeTime + audioDuration, audioUrl: finalUrl })
        cumulativeTime += audioDuration; audioElements.push(loadedAudio)
      }

      audioElementsRef.current = audioElements; verseTimingsRef.current = timings; verseSegmentsRef.current = matchedSegments;
      setDuration(cumulativeTime); setIsLoading(false); return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio'); setIsLoading(false); return false
    }
  }, [qdcRecitationId, surahId, startVerse, endVerse, reciterFolder])

  const playAudioSequence = useCallback(async (startIndex: number = 0) => {
      const audioElements = audioElementsRef.current
      if (audioElements.length === 0) return
      currentAudioIndexRef.current = startIndex; setCurrentVerseIndex(startIndex); onVerseChange?.(startIndex)

      const playNext = async (index: number) => {
        if (index >= audioElements.length) { setIsPlaying(false); onComplete?.(); return }
        const audio = audioElements[index]
        currentAudioIndexRef.current = index; setCurrentVerseIndex(index); onVerseChange?.(index)

        const updateProgress = () => {
          if (!audioElements[index]) return
          const timing = verseTimingsRef.current[index]
          if (timing) {
            const elapsed = timing.startTime + audio.currentTime * 1000
            setCurrentTime(elapsed); setProgress((elapsed / duration) * 100)
          }
          if (isPlaying) animationFrameRef.current = requestAnimationFrame(updateProgress)
        }

        audio.onended = () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); playNext(index + 1) }
        audio.ontimeupdate = () => {
          const timing = verseTimingsRef.current[index]
          if (timing) {
            const elapsed = timing.startTime + audio.currentTime * 1000
            setCurrentTime(elapsed); setProgress((elapsed / duration) * 100)
          }
        }
        try { await audio.play(); animationFrameRef.current = requestAnimationFrame(updateProgress) } 
        catch (err) { setError('Failed to play audio'); setIsPlaying(false) }
      }
      await playNext(startIndex)
    }, [duration, onVerseChange, onComplete]
  )

  const play = useCallback(async () => {
    if (audioElementsRef.current.length === 0) { const loaded = await loadAudio(); if (!loaded) return; }
    setIsPlaying(true); await playAudioSequence(currentAudioIndexRef.current)
  }, [loadAudio, playAudioSequence])

  const pause = useCallback(() => {
    const currentAudio = audioElementsRef.current[currentAudioIndexRef.current]
    if (currentAudio) currentAudio.pause()
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    audioElementsRef.current.forEach((audio) => { audio.pause(); audio.currentTime = 0 })
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    currentAudioIndexRef.current = 0; setIsPlaying(false); setCurrentVerseIndex(0); setProgress(0); setCurrentTime(0)
  }, [])

  const seekToVerse = useCallback(async (verseIndex: number) => {
      if (verseIndex < 0 || verseIndex >= audioElementsRef.current.length) return
      const currentAudio = audioElementsRef.current[currentAudioIndexRef.current]
      if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0 }
      currentAudioIndexRef.current = verseIndex; setCurrentVerseIndex(verseIndex)
      const timing = verseTimingsRef.current[verseIndex]
      if (timing) { setCurrentTime(timing.startTime); setProgress((timing.startTime / duration) * 100) }
      if (isPlaying) await playAudioSequence(verseIndex)
    }, [duration, isPlaying, playAudioSequence]
  )

  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audio) => { audio.pause(); audio.src = '' })
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  useEffect(() => { stop(); audioElementsRef.current = []; verseTimingsRef.current = []; verseSegmentsRef.current = []; setDuration(0) }, [qdcRecitationId, reciterFolder, surahId, startVerse, endVerse, stop])

  return { isLoading, isPlaying, currentVerseIndex, progress, duration, currentTime, error, verseTimings: verseTimingsRef.current, verseSegments: verseSegmentsRef.current, play, pause, stop, seekToVerse }
}