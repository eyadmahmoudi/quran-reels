'use client'

import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { useVideoGenerator } from '@/hooks/use-video-generator'

export function DownloadButton() {
  const { config, verses, isConfigValid } = useReel()
  const { isGenerating, progress, error, generateVideo, cancelGeneration } = useVideoGenerator(config)

  const handleGenerate = async () => {
    if (!config.surah || !config.background) return
    await generateVideo({
      verses,
      background: config.background,
      showTranslation: config.showTranslation,
      surahName: config.surah.name_arabic,
      reciterFolder: config.reciterFolder || 'Abdul_Basit_Mujawwad_128kbps',
      qdcRecitationId: config.qdcRecitationId ?? null,
      surahId: config.surah.id,
      startVerse: config.startVerse,
      endVerse: config.endVerse,
      displayMode: config.displayMode ?? 'minimal',
      includeIstiadha: config.includeIstiadha,
      calligraphyStyle: config.calligraphyStyle ?? 'nabi',
      showHijriDate: config.showHijriDate,
      showTafsir: config.showTafsir,
      showJuzProgress: config.showJuzProgress,
    })
  }

  if (isGenerating) {
    const stage =
      progress < 30 ? 'Loading audio files…' :
      progress < 50 ? 'Processing audio…' :
      progress < 95 ? 'Rendering frames…' :
      'Finalizing…'

    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Progress bar with percentage label inside */}
        <div className="relative h-7 w-full rounded-full overflow-hidden" style={{ background: 'rgba(201,168,76,0.1)' }}>
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: `${Math.max(progress, 2)}%`,
              background: 'linear-gradient(90deg, #a07830, #c9a84c, #f0d080)',
              boxShadow: '2px 0 12px rgba(201,168,76,0.6)',
            }}
          />
          {/* Percentage text — always centered over the full bar */}
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold"
            style={{ color: progress > 48 ? '#0d1117' : '#c9a84c', zIndex: 1 }}
          >
            {Math.round(progress)}%
          </span>
        </div>

        {/* Stage + cancel */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{stage}</p>
          <button
            onClick={cancelGeneration}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border transition-colors hover:border-red-500/50 hover:bg-red-500/10"
            style={{ borderColor: 'rgba(201,168,76,0.2)' }}
            title="Cancel"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
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
