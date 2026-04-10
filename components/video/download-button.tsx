'use client'

import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { useVideoGenerator } from '@/hooks/use-video-generator'

export function DownloadButton() {
  const { config, verses, isConfigValid } = useReel()
  const { isGenerating, progress, error, generateVideo, cancelGeneration } = useVideoGenerator()

  const handleGenerate = async () => {
    if (!config.surah || !config.background) return
    await generateVideo({
      verses,
      background: config.background,
      showTranslation: config.showTranslation,
      surahName: config.surah.name_arabic,
      reciterFolder: config.reciterFolder || 'Alafasy_128kbps',
      surahId: config.surah.id,
      startVerse: config.startVerse,
      endVerse: config.endVerse,
      displayMode: config.displayMode ?? 'minimal',
    })
  }

  if (isGenerating) {
    const stage =
      progress < 30 ? 'Loading audio files…' :
      progress < 50 ? 'Processing audio…' :
      progress < 95 ? 'Rendering frames…' :
      'Finalizing…'

    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Stage label + cancel */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{stage}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{Math.round(progress)}% complete</p>
          </div>
          <button
            onClick={cancelGeneration}
            className="flex items-center justify-center w-8 h-8 rounded-full border transition-colors hover:bg-destructive/10"
            style={{ borderColor: 'rgba(201,168,76,0.25)' }}
            title="Cancel"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="relative h-2 w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(201,168,76,0.12)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c)',
              backgroundSize: '200% 100%',
              boxShadow: '0 0 12px rgba(201,168,76,0.5)',
            }}
          />
        </div>

        {/* Pulsing dots */}
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                background: '#c9a84c',
                opacity: 0.6,
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const canGenerate = isConfigValid && verses.length > 0

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="relative w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
        style={
          canGenerate
            ? {
                background: 'linear-gradient(135deg, #b8922a 0%, #f0d080 40%, #c9a84c 70%, #b8922a 100%)',
                backgroundSize: '200% 100%',
                color: '#0d1117',
                boxShadow: '0 4px 28px rgba(201,168,76,0.40), 0 1px 0 rgba(255,255,255,0.15) inset',
              }
            : {
                background: 'rgba(201,168,76,0.12)',
                color: 'rgba(201,168,76,0.4)',
                border: '1px solid rgba(201,168,76,0.2)',
              }
        }
      >
        {canGenerate && (
          <span
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #f5e08a 50%, #c9a84c 100%)' }}
            aria-hidden
          />
        )}
        <span className="relative flex items-center gap-2.5">
          <Download className="h-5 w-5 flex-shrink-0" />
          Generate &amp; Download Video
        </span>
      </button>

      {/* Error */}
      {error && (
        <div
          className="text-xs text-center px-3 py-2 rounded-lg border"
          style={{
            color: '#f87171',
            background: 'rgba(248,113,113,0.08)',
            borderColor: 'rgba(248,113,113,0.2)',
          }}
        >
          {error}
        </div>
      )}

      {/* Helper text */}
      {!isConfigValid && (
        <p className="text-xs text-muted-foreground text-center">
          Complete all selections above to generate your video
        </p>
      )}
      {isConfigValid && verses.length === 0 && (
        <p className="text-xs text-center" style={{ color: 'rgba(201,168,76,0.55)' }}>
          Loading verses…
        </p>
      )}
    </div>
  )
}
