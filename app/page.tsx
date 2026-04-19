'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, type ReactNode } from 'react'
import { ReelProvider } from '@/lib/reel-context'
import { SurahSelector } from '@/components/quran/surah-selector'
import { VerseSelector } from '@/components/quran/verse-selector'
import { ReciterSelector } from '@/components/quran/reciter-selector'
import { BackgroundSelector } from '@/components/quran/background-selector'
import { TranslationSettings } from '@/components/quran/translation-settings'
import { DisplayModeSelector } from '@/components/quran/display-mode-selector'
import { DownloadButton } from '@/components/video/download-button'

const GOLD = '#c9a84c'
const GOLD_DARK = '#a07830'

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />

  const isDark = resolvedTheme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle light/dark mode"
      className="flex w-9 h-9 rounded-full items-center justify-center flex-shrink-0 cursor-pointer border border-stone-300 bg-white shadow-sm transition-colors duration-300 hover:bg-stone-50 dark:border-slate-600/80 dark:bg-slate-800/80 dark:shadow-none dark:hover:bg-slate-700/80"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.8"/>
        {isDark ? (
          <path d="M14 6.3A7 7 0 1 0 14 17.7A5 5 0 1 1 14 6.3Z" fill={GOLD} />
        ) : (
          <circle cx="12" cy="12" r="4" fill={GOLD} />
        )}
      </svg>
    </button>
  )
}

/** Subtle divider between studio sections */
function StudioDivider() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-stone-300/70 to-transparent dark:via-slate-600/50" />
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-slate-500">
      {children}
    </h2>
  )
}

export default function QuranReelsGenerator() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = !mounted || resolvedTheme === 'dark'
  const footerTextColor = isDark ? `${GOLD}50` : `${GOLD_DARK}90`
  const footerLinkColor = isDark ? 'rgba(150,150,160,0.45)' : 'rgba(100,90,70,0.6)'

  return (
    <ReelProvider>
      <div className="min-h-screen bg-gradient-to-b from-stone-100 via-amber-50/40 to-stone-200/80 text-stone-900 dark:from-slate-950 dark:via-[#0c1222] dark:to-[#070b14] dark:text-slate-100">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]"
          aria-hidden
        />

        <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-white/90 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-950/85">
          <div className="mx-auto w-full max-w-3xl xl:max-w-4xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <ThemeToggleButton />
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg font-bold leading-tight gold-shimmer-text">
                  Quran Reels Generator
                </h1>
                <p className="mt-0.5 text-[10px] font-arabic leading-none text-amber-800/70 sm:text-xs dark:text-amber-200/50">
                  مولد مقاطع القرآن الكريم
                </p>
              </div>
              <p
                className="font-nabi hidden shrink-0 text-sm text-amber-900/85 sm:block sm:text-lg dark:text-amber-200/70"
                style={{ direction: 'rtl' }}
              >
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
              </p>
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-3xl xl:max-w-4xl px-4 sm:px-6 py-8 lg:py-10">
          <div className="mx-auto min-w-0">
            <div className="max-h-[calc(100vh-5.5rem)] overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="space-y-0">
                <section className="pb-8">
                  <SectionTitle>Source</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SurahSelector />
                    <VerseSelector />
                  </div>
                </section>

                <StudioDivider />

                <section className="py-8">
                  <SectionTitle>Reciter</SectionTitle>
                  <ReciterSelector />
                </section>

                <StudioDivider />

                <section className="py-8">
                  <SectionTitle>Background</SectionTitle>
                  <BackgroundSelector />
                </section>

                <StudioDivider />

                <section className="py-8">
                  <SectionTitle>Translation &amp; display</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <TranslationSettings />
                    <DisplayModeSelector />
                  </div>
                </section>

                <StudioDivider />

                <section className="pt-8 pb-2">
                  <SectionTitle>Export</SectionTitle>
                  <DownloadButton />
                </section>
              </div>

              <div className="mt-12 pb-8 text-center lg:pb-10">
                <p
                  className="mb-2 font-arabic text-base leading-loose text-amber-900/90 sm:text-lg dark:text-amber-200/85 dark:[text-shadow:0_0_24px_rgba(201,168,76,0.15)]"
                  style={{ direction: 'rtl' }}
                >
                  لا تنسونا من صالح دعائكم
                </p>
                <p className="text-xs" style={{ color: footerTextColor }}>
                  Audio ·{' '}
                  <a
                    href="https://everyayah.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors duration-200 hover:text-amber-700 dark:hover:text-amber-400/90"
                    style={{ color: footerLinkColor }}
                  >
                    EveryAyah.com
                  </a>
                  {' · '}
                  <a
                    href="https://quran.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors duration-200 hover:text-amber-700 dark:hover:text-amber-400/90"
                    style={{ color: footerLinkColor }}
                  >
                    Quran.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-stone-400/35 to-transparent dark:via-slate-700/40" />
      </div>
    </ReelProvider>
  )
}
