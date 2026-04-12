'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ReelProvider } from '@/lib/reel-context'
import { SurahSelector } from '@/components/quran/surah-selector'
import { VerseSelector } from '@/components/quran/verse-selector'
import { ReciterSelector } from '@/components/quran/reciter-selector'
import { BackgroundSelector } from '@/components/quran/background-selector'
import { TranslationSettings } from '@/components/quran/translation-settings'
import { DisplayModeSelector } from '@/components/quran/display-mode-selector'
import { DownloadButton } from '@/components/video/download-button'

const GOLD = '#c9a84c'
const GOLD_LIGHT = '#f0d080'
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
      className="flex w-9 h-9 rounded-full items-center justify-center border flex-shrink-0 transition-colors duration-300 cursor-pointer"
      style={{
        background: isDark
          ? `radial-gradient(circle, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.05) 100%)`
          : `radial-gradient(circle, rgba(201,168,76,0.35) 0%, rgba(201,168,76,0.12) 100%)`,
        borderColor: `rgba(201,168,76,0.3)`,
      }}
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

/** Thin gold line between sections inside the panel */
function Divider() {
  return (
    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)` }} />
  )
}

export default function QuranReelsGenerator() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = !mounted || resolvedTheme === 'dark'

  const pageBg = isDark
    ? `
        radial-gradient(ellipse at 20% 0%, rgba(40,32,10,0.7) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 0%, rgba(20,30,50,0.6) 0%, transparent 55%),
        radial-gradient(ellipse at 50% 100%, rgba(20,15,5,0.5) 0%, transparent 60%),
        linear-gradient(180deg, #0a0d18 0%, #080b14 50%, #06080f 100%)
      `
    : `
        radial-gradient(ellipse at 20% 0%, rgba(255,240,180,0.4) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 0%, rgba(200,220,255,0.3) 0%, transparent 55%),
        radial-gradient(ellipse at 50% 100%, rgba(240,230,200,0.3) 0%, transparent 60%),
        linear-gradient(180deg, #f5f0e4 0%, #f0ead8 50%, #ede6d0 100%)
      `

  const headerBg = isDark ? 'rgb(6,8,15)' : 'rgb(245,240,228)'
  const headerBorder = isDark ? `rgba(201,168,76,0.14)` : `rgba(160,120,48,0.2)`
  const footerTextColor = isDark ? `${GOLD}50` : `${GOLD_DARK}90`
  const footerLinkColor = isDark ? 'rgba(150,150,160,0.45)' : 'rgba(100,90,70,0.6)'

  return (
    <ReelProvider>
      <div className="min-h-screen geo-pattern" style={{ background: pageBg }}>

        {/* ── Top accent bar ── */}
        <div
          className="h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD_DARK}, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_LIGHT}, ${GOLD_DARK}, transparent)` }}
        />

        {/* ── Header ── */}
        <header
          className="sticky top-0 z-50 border-b"
          style={{ background: headerBg, borderColor: headerBorder, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <div className="container mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
            <div className="flex items-center gap-3">
              <ThemeToggleButton />
              <div className="flex-1">
                <h1 className="text-sm sm:text-lg font-bold leading-tight gold-shimmer-text">
                  Quran Reels Generator
                </h1>
                <p className="text-[10px] sm:text-xs font-arabic leading-none mt-0.5" style={{ color: `${GOLD}80` }}>
                  مولد مقاطع القرآن الكريم
                </p>
              </div>
              {/* Bismillah in header instead of hero */}
              <p
                className="font-nabi text-sm sm:text-lg hidden sm:block"
                style={{ color: `${GOLD}cc`, direction: 'rtl' }}
              >
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
              </p>
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="max-w-2xl mx-auto">

            {/* ── Single panel: all settings ── */}
            <div className="quran-card">

              {/* Surah + Verse Range — grouped together */}
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <SurahSelector />
                  </div>
                  <div>
                    <VerseSelector />
                  </div>
                </div>
              </div>

              <Divider />

              {/* Reciter */}
              <div className="p-4 sm:p-5">
                <ReciterSelector />
              </div>

              <Divider />

              {/* Background */}
              <div className="p-4 sm:p-5">
                <BackgroundSelector />
              </div>

              <Divider />

              {/* Translation + Display — grouped together */}
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <TranslationSettings />
                  </div>
                  <div>
                    <DisplayModeSelector />
                  </div>
                </div>
              </div>

              <Divider />

              {/* Generate button — part of the panel, not a separate card */}
              <div className="p-4 sm:p-5">
                <DownloadButton />
              </div>

            </div>

            {/* ── Footer ── */}
            <div className="text-center mt-8 pb-6">
              <p
                className="font-arabic text-base sm:text-lg mb-2 leading-loose"
                style={{
                  direction: 'rtl',
                  color: isDark ? `${GOLD}cc` : `${GOLD_DARK}dd`,
                  textShadow: isDark ? `0 0 20px rgba(201,168,76,0.25)` : 'none',
                }}
              >
                لا تنسونا من صالح دعائكم
              </p>
              <p className="text-xs" style={{ color: footerTextColor }}>
                Audio ·{' '}
                <a
                  href="https://everyayah.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: footerLinkColor }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = footerLinkColor)}
                >
                  EveryAyah.com
                </a>
                {' · '}
                <a
                  href="https://quran.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: footerLinkColor }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = footerLinkColor)}
                >
                  Quran.com
                </a>
              </p>
            </div>

          </div>
        </main>

        <div
          className="h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)` }}
        />
      </div>
    </ReelProvider>
  )
}
