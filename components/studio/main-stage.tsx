'use client'

import { AlertCircle } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { useGenerator } from './generator-context'
import { PreviewCanvas } from './preview-canvas'
import { EmptyState } from './empty-state'
import { LoadingOverlay } from './loading-overlay'

export function MainStage() {
  const { config, verses } = useReel()
  const { isGenerating, progress, error } = useGenerator()

  const hasSurah = !!config.surah
  const firstVerse = verses[0]
  const showPreview = hasSurah && !!firstVerse

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      {/* Ambient accent glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(16,185,129,0.06),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_100%,rgba(245,158,11,0.04),transparent)]"
        aria-hidden
      />

      {/* Canvas frame — 9:16 aspect. Constrained on mobile so controls below remain reachable. */}
      <div className="relative mx-auto flex w-full max-w-[280px] items-center justify-center sm:max-w-[320px] lg:h-full lg:max-w-[min(100%,calc(100vh*0.5625))]">
        <div className="relative aspect-[9/16] w-full lg:h-full lg:max-h-full lg:w-auto">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-2xl shadow-emerald-900/10">
            {showPreview ? (
              <PreviewCanvas
                background={config.background}
                verse={firstVerse}
                showTranslation={config.showTranslation}
                displayMode={config.displayMode ?? 'minimal'}
                surahName={config.surah?.name_arabic ?? ''}
                watermark={config.watermark}
              />
            ) : (
              <EmptyState />
            )}

            {isGenerating && <LoadingOverlay progress={progress} />}
          </div>

          {/* Meta line under canvas */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="tabular-nums">1080 × 1920 · 9:16</span>
            {hasSurah ? (
              <span>
                <span className="text-zinc-700">
                  {config.surah?.name_simple}
                </span>
                <span className="mx-1.5 text-zinc-300">·</span>
                {config.startVerse}–{config.endVerse}
              </span>
            ) : (
              <span className="text-zinc-400">No surah selected</span>
            )}
          </div>

          {error && (
            <div className="absolute -bottom-12 left-0 right-0 mx-auto flex w-fit items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
