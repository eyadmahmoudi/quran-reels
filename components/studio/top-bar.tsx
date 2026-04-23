'use client'

import { Download, Loader2, X } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { useGenerator } from './generator-context'
import { cn } from '@/lib/utils'
import { MobileSidebarSheet } from './mobile-sidebar-sheet'

function StarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M32 8 L40 24 L56 24 L44 36 L48 52 L32 44 L16 52 L20 36 L8 24 L24 24 Z" />
      <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

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
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-canvas px-4 sm:px-6 lg:h-16">
      {/* ── Brand ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border-subtle bg-surface text-accent-primary shadow-sm lg:h-[36px] lg:w-[36px]">
          <StarMark className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-display text-[18px] font-medium tracking-tight text-ink-primary">
            Quran Reels{' '}
            <span className="italic font-medium text-accent-primary">Studio</span>
          </span>
          <span
            className="hidden font-arabic-ui text-[11px] leading-tight text-ink-tertiary sm:inline"
            style={{ direction: 'rtl' }}
          >
            مولد مقاطع القرآن الكريم
          </span>
        </div>
      </div>

      {/* ── Right actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <MobileSidebarSheet />
        {isGenerating ? (
          <div className="hidden items-center gap-2 lg:flex">
            <div className="relative h-10 w-60 overflow-hidden rounded-[10px] border border-border-subtle bg-surface">
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
              title="Cancel"
              aria-label="Cancel generation"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border-subtle bg-surface text-ink-tertiary transition-all duration-150 ease-out hover:border-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]"
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
              'group relative hidden h-10 items-center gap-2 rounded-[10px] px-5 text-[14px] font-medium transition-all duration-150 ease-out lg:inline-flex',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent-ring)] focus-visible:ring-offset-canvas',
              canGenerate
                ? 'bg-accent-primary text-white shadow-sm hover:-translate-y-[1px] hover:bg-accent-hover hover:shadow-md active:translate-y-0 active:shadow-sm'
                : 'cursor-not-allowed bg-muted-bg text-ink-disabled',
            )}
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            <span>Generate &amp; Export</span>
          </button>
        )}
      </div>
    </header>
  )
}
