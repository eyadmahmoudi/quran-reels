'use client'

import { useState, useEffect, useMemo } from 'react'
import { Play, Pause, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { useQuranAudio } from '@/hooks/use-quran-audio'
import { fetchVerses } from '@/lib/quran-api'
import { formatTime } from '@/lib/quran-api'
import { splitVerseByWordTimings, splitTranslation, type VerseChunk } from '@/lib/verse-chunking'

// FORMATTER: Gives standard English numbers to the Uthmani font so it converts them into Arabic numerals INSIDE the circle
function formatAyahNumber(verseKey: string | number) {
  const numStr = verseKey.toString().includes(':') ? verseKey.toString().split(':')[1] : verseKey.toString();
  return `\u06DD${numStr}`; 
}

export function VideoPreview() {
  const {
    config,
    verses,
    setVerses,
    currentVerseIndex,
    setCurrentVerseIndex,
  } = useReel()

  const [isPlaying, setIsPlaying] = useState(false)

  const [isLoadingVerses, setIsLoadingVerses] = useState(false)

  useEffect(() => {
    async function loadVerses() {
      if (!config.surah) return

      setIsLoadingVerses(true)
      try {
        const loadedVerses = await fetchVerses(config.surah.id, {
          startVerse: config.startVerse,
          endVerse: config.endVerse,
          translationId: config.showTranslation ? config.translationId ?? undefined : undefined,
        })
        setVerses(loadedVerses)
      } catch (error) {
        console.error('Failed to load verses:', error)
      } finally {
        setIsLoadingVerses(false)
      }
    }

    loadVerses()
  }, [
    config.surah,
    config.startVerse,
    config.endVerse,
    config.showTranslation,
    config.translationId,
    setVerses,
  ])

  const {
    isLoading: isAudioLoading,
    isPlaying: audioIsPlaying,
    currentVerseIndex: audioVerseIndex,
    progress,
    duration,
    currentTime,
    error: audioError,
    verseTimings,
    verseSegments,
    play,
    pause,
    stop,
  } = useQuranAudio({
    qdcRecitationId: config.qdcRecitationId ?? null,
    reciterFolder: config.reciterFolder || 'Alafasy_128kbps',
    surahId: config.surah?.id || 1,
    startVerse: config.startVerse,
    endVerse: config.endVerse,
    verses,
    onVerseChange: setCurrentVerseIndex,
    onComplete: () => setIsPlaying(false),
  })

  useEffect(() => {
    setIsPlaying(audioIsPlaying)
  }, [audioIsPlaying, setIsPlaying])

  const handlePlayPause = async () => {
    if (audioIsPlaying) {
      pause()
    } else {
      await play()
    }
  }

  const handleReset = () => {
    stop()
    setCurrentVerseIndex(0)
  }

  const currentVerse = verses[audioVerseIndex]

  // ── Verse chunking for the preview ──
  const chunks = useMemo<VerseChunk[]>(() => {
    if (!currentVerse?.text_uthmani) return []
    const segments = verseSegments[audioVerseIndex]
    return splitVerseByWordTimings(currentVerse.text_uthmani, segments || null, 80)
  }, [currentVerse?.text_uthmani, verseSegments, audioVerseIndex])

  // Split translation to match Arabic chunks
  const translationChunks = useMemo<string[]>(() => {
    if (!currentVerse?.translations?.[0]?.text || chunks.length <= 1) {
      return [currentVerse?.translations?.[0]?.text || '']
    }
    return splitTranslation(currentVerse.translations[0].text, chunks)
  }, [currentVerse?.translations, chunks])

  // Build per-chunk time boundaries from actual verse audio duration
  const chunkTimeBoundaries = useMemo<Array<{ startMs: number; endMs: number }>>(() => {
    if (chunks.length <= 1) return []
    return chunks.map(c => ({
      startMs: c.startMs || 0,
      endMs: c.endMs || c.startMs || 0
    }))
  }, [chunks])

  // Determine current chunk from audio currentTime (synced to recitation)
  const currentChunkIndex = useMemo(() => {
    if (chunks.length <= 1 || chunkTimeBoundaries.length === 0) return 0
    // Compute time elapsed within the current verse
    const timing = verseTimings[audioVerseIndex]
    if (!timing) return 0
    const elapsedInVerse = currentTime - timing.startTime
    // Find which chunk boundary we're in
    for (let i = 0; i < chunkTimeBoundaries.length; i++) {
      if (elapsedInVerse < chunkTimeBoundaries[i].endMs) return i
    }
    return chunks.length - 1 // past end → show last chunk
  }, [chunks.length, chunkTimeBoundaries, verseTimings, audioVerseIndex, currentTime])

  // Determine which chunk to show
  const activeChunk = chunks.length > 0 ? chunks[Math.min(currentChunkIndex, chunks.length - 1)] : null
  const displayText = activeChunk?.text || currentVerse?.text_uthmani || ''
  const showMarker = !activeChunk || activeChunk.isLastChunk
  // Show translation on every chunk (with the matching split portion)
  const showTranslation = config.showTranslation
  const currentTranslationText = translationChunks[Math.min(currentChunkIndex, translationChunks.length - 1)] || ''

  const backgroundStyle =
    config.background?.type === 'gradient'
      ? { background: config.background.value }
      : config.background?.type === 'custom' || config.background?.type === 'preset'
        ? {
            backgroundImage: `url(${config.background.value})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
        : { background: 'linear-gradient(180deg, #0c1220 0%, #1a2744 50%, #0c1220 100%)' }

  if (!config.surah) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div
          className="relative w-full max-w-[280px] aspect-[9/16] rounded-3xl overflow-hidden border-4 border-border shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, #0c1220 0%, #1a2744 50%, #0c1220 100%)',
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <p className="text-white/80 text-sm">
              Select a surah and verses to preview your reel
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative w-full max-w-[280px] aspect-[9/16] rounded-3xl overflow-hidden border-4 border-border shadow-2xl"
        style={backgroundStyle}
      >
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative h-full flex flex-col p-4">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white/90 text-sm font-arabic">
                {config.surah.name_arabic}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-2">
            {isLoadingVerses ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : currentVerse ? (
              <div className="text-center space-y-6">
                
                {/* EXACT FONT SPLIT USING STRICT CSS CLASSES */}
                <p
                  className="text-[#c9a84c] text-3xl leading-loose text-center transition-opacity duration-300"
                  dir="rtl"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
                >
                  {/* VERSE TEXT (chunk or full) */}
                  <span className="font-nabi">
                    {displayText}
                  </span>
                  
                  {/* NUMBER: Only shown on last chunk */}
                  {showMarker && (
                    <span className="font-uthmani text-[2.5rem] mr-2 align-middle text-white/90">
                      {formatAyahNumber(currentVerse.verse_key)}
                    </span>
                  )}
                </p>

                {showTranslation && currentTranslationText && (
                  <p className="text-white/80 text-sm leading-relaxed font-sans" dir="ltr">
                    {currentTranslationText.replace(/<[^>]+>/g, '')}
                  </p>
                )}

                <div className="flex items-center justify-center gap-2">
                  <span className="text-primary text-xs bg-primary/20 px-3 py-1 rounded-full">
                    {currentVerse.verse_key}
                    {chunks.length > 1 && (
                      <span className="ml-1 opacity-70">
                        ({currentChunkIndex + 1}/{chunks.length})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm">No verse to display</p>
            )}
          </div>

          <div className="mt-auto">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>
                Verse {audioVerseIndex + 1} of {verses.length}
              </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          disabled={isAudioLoading}
          className="h-10 w-10"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          onClick={handlePlayPause}
          disabled={isAudioLoading || verses.length === 0}
          className="h-12 w-12 rounded-full"
        >
          {isAudioLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : audioIsPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        <div className="w-10" />
      </div>

      {audioError && (
        <p className="text-destructive text-sm text-center">{audioError}</p>
      )}

      {isAudioLoading && (
        <p className="text-muted-foreground text-sm">Loading audio files...</p>
      )}
    </div>
  )
}