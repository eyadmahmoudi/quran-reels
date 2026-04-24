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
      includeIstiadha: config.includeIstiadha,
    })
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-surface px-4 py-3 lg:hidden"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {isGenerating ? (
        <div className="flex items-center gap-2">
          <div className="relative h-11 flex-1 overflow-hidden rounded-[10px] border border-border-subtle bg-canvas">
            <div
              className="absolute inset-y-0 left-0 bg-accent-primary/90 transition-[width] duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
            <div className="relative flex h-full items-center justify-center gap-2 text-[13px] font-medium text-ink-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="font-mono tabular-nums">
                Rendering · {Math.round(progress)}%
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelGeneration}
            aria-label="Cancel generation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-border-subtle bg-canvas text-ink-tertiary transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
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
            'flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium transition-all duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
            canGenerate
              ? 'bg-accent-primary text-white shadow-sm active:scale-[0.99]'
              : 'cursor-not-allowed bg-muted-bg text-ink-disabled',
          )}
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          Generate &amp; Export
        </button>
      )}
    </div>
  )
}
