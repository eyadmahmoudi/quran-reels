'use client'

import { AlertCircle } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { useGenerator } from './generator-context'
import { PreviewCanvas } from './preview-canvas'
import { EmptyState } from './empty-state'
import { LoadingOverlay } from './loading-overlay'
import { IslamicPatternBg } from './islamic-pattern-bg'

export function MainStage() {
  const { config, verses } = useReel()
  const { isGenerating, progress, error } = useGenerator()

  const hasSurah = !!config.surah
  const firstVerse = verses[0]
  const showPreview = hasSurah && !!firstVerse

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-canvas px-4 py-6 sm:px-6 sm:py-8">
      <IslamicPatternBg />

      {/* Warm ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(31,78,61,0.05),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_100%,rgba(184,137,58,0.04),transparent)]"
        aria-hidden
      />

      {/* Canvas frame — 9:16 aspect. Constrained so controls remain reachable. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[280px] items-center justify-center sm:max-w-[320px] lg:h-full lg:max-w-[min(100%,calc(100vh*0.5625))]">
        <div className="relative aspect-[9/16] w-full lg:h-full lg:max-h-[min(720px,calc(100vh-200px))] lg:w-auto">
          <div
            className="relative h-full w-full overflow-hidden rounded-[18px] bg-black shadow-canvas"
            style={{
              boxShadow:
                '0 32px 64px -16px rgba(26,23,20,0.18), 0 16px 32px -8px rgba(26,23,20,0.12), inset 0 0 0 1px rgba(255,255,255,0.6)',
            }}
          >
            {showPreview ? (
              <PreviewCanvas
                background={config.background}
                verse={firstVerse}
                showTranslation={config.showTranslation}
                displayMode={config.displayMode ?? 'minimal'}
                surahName={config.surah?.name_arabic ?? ''}
                watermark={config.watermark}
                calligraphyStyle={config.calligraphyStyle ?? 'nabi'}
                showHijriDate={config.showHijriDate}
                showTafsir={config.showTafsir}
                showJuzProgress={config.showJuzProgress}
              />
            ) : (
              <EmptyState />
            )}

            {isGenerating && <LoadingOverlay progress={progress} />}
          </div>

          {/* Meta line under canvas */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-ink-tertiary">
            <span className="font-mono tabular-nums">1080 × 1920 · 9:16</span>
            {hasSurah ? (
              <span className="tabular-nums">
                <span className="text-ink-secondary">
                  {config.surah?.name_simple}
                </span>
                <span className="mx-1.5 text-border-default">·</span>
                {config.startVerse}–{config.endVerse}
              </span>
            ) : (
              <span className="text-ink-tertiary" dir="rtl">لم يتم اختيار سورة</span>
            )}
          </div>

          {error && (
            <div className="absolute -bottom-12 left-0 right-0 mx-auto flex w-fit items-center gap-2 rounded-[8px] border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
