'use client'

import { Download, Loader2, Sparkles, X } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { useGenerator } from './generator-context'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'

export function TopBar() {
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
    <header
      className={cn(
        'relative z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-md sm:px-5',
        'border-zinc-200 bg-white/80',
        'dark:border-zinc-800 dark:bg-zinc-950/80',
      )}
    >
      {/* Brand */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_2px_12px_rgba(16,185,129,0.35)]">
          <Sparkles className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
          <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Quran Reels <span className="text-emerald-600 dark:text-emerald-400">Studio</span>
          </span>
          <span
            className="hidden font-arabic text-[10px] text-amber-600/80 dark:text-amber-500/80 sm:inline"
            style={{ direction: 'rtl' }}
          >
            مولد مقاطع القرآن الكريم
          </span>
        </div>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Desktop-only Generate/Progress (mobile uses MobileActionBar) */}
        {isGenerating ? (
          <div className="hidden items-center gap-3 lg:flex">
            <div
              className={cn(
                'relative h-9 w-56 overflow-hidden rounded-lg border',
                'border-zinc-200 bg-white',
                'dark:border-zinc-800 dark:bg-zinc-900',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
              <div className="relative flex h-full items-center justify-center gap-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Rendering · {Math.round(progress)}%
              </div>
            </div>
            <button
              type="button"
              onClick={cancelGeneration}
              title="Cancel"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                'border-zinc-200 bg-white text-zinc-500 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500',
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-red-400',
              )}
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
              'group relative hidden h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-200 lg:inline-flex',
              canGenerate
                ? 'bg-emerald-600 text-white shadow-[0_2px_14px_rgba(16,185,129,0.35)] hover:bg-emerald-500 hover:shadow-[0_2px_18px_rgba(16,185,129,0.5)] active:scale-[0.98]'
                : 'cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
            )}
          >
            <Download className="h-4 w-4" />
            <span>Generate &amp; Export</span>
          </button>
        )}
      </div>
    </header>
  )
}
