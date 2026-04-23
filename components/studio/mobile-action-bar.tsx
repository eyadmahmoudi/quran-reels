'use client'

import { Download, Loader2, X } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { useGenerator } from './generator-context'
import { cn } from '@/lib/utils'

export function MobileActionBar() {
  const { config, verses, isConfigValid } = useReel()
  const { isGenerating, progress, generateVideo, cancelGeneration } = useGenerator()

  const canGenerate = isConfigValid && verses.length > 0 && !isGenerating

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
    })
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t p-3 backdrop-blur-md lg:hidden',
        'border-zinc-200 bg-background/85',
      )}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {isGenerating ? (
        <div className="flex items-center gap-2">
          <div className="relative h-11 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
            <div className="relative flex h-full items-center justify-center gap-2 text-xs font-medium text-zinc-900">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Rendering · {Math.round(progress)}%
            </div>
          </div>
          <button
            type="button"
            onClick={cancelGeneration}
            aria-label="Cancel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200',
            canGenerate
              ? 'bg-emerald-600 text-white shadow-[0_2px_14px_rgba(16,185,129,0.35)] hover:bg-emerald-500 active:scale-[0.99]'
              : 'cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400',
          )}
        >
          <Download className="h-4 w-4" />
          Generate &amp; Export
        </button>
      )}
    </div>
  )
}
