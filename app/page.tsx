'use client'

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

function StepBadge({ n }: { n: number }) {
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD_LIGHT})`,
        color: '#0d1117',
        boxShadow: `0 2px 12px rgba(201,168,76,0.4)`,
      }}
    >
      {n}
    </span>
  )
}

function SectionCard({
  step,
  title,
  arabicTitle,
  children,
}: {
  step: number
  title: string
  arabicTitle: string
  children: React.ReactNode
}) {
  return (
    <div className="quran-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <StepBadge n={step} />
        <div>
          <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">{title}</h3>
          <p className="text-xs mt-0.5 font-arabic" style={{ color: `${GOLD}99` }}>{arabicTitle}</p>
        </div>
        <div className="flex-1 ml-2 h-px" style={{ background: `linear-gradient(90deg, rgba(201,168,76,0.35), transparent)` }} />
      </div>
      {children}
    </div>
  )
}

function OrnamentDivider() {
  return (
    <div className="ornament-divider my-2">
      <span style={{ color: `${GOLD}80`, fontSize: 20, userSelect: 'none' }}>✦</span>
    </div>
  )
}

export default function QuranReelsGenerator() {
  return (
    <ReelProvider>
      {/* Page wrapper — deep space background with geo pattern */}
      <div
        className="min-h-screen geo-pattern"
        style={{
          background: `
            radial-gradient(ellipse at 20% 0%, rgba(40,32,10,0.7) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 0%, rgba(20,30,50,0.6) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 100%, rgba(20,15,5,0.5) 0%, transparent 60%),
            linear-gradient(180deg, #0a0d18 0%, #080b14 50%, #06080f 100%)
          `,
        }}
      >
        {/* ── Top gold bar ───────────────────────────────────────────────── */}
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD_DARK}, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_LIGHT}, ${GOLD_DARK}, transparent)` }}
        />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 border-b"
          style={{
            background: 'rgba(6,8,15,0.88)',
            backdropFilter: 'blur(20px)',
            borderColor: `rgba(201,168,76,0.14)`,
            boxShadow: '0 1px 0 rgba(201,168,76,0.06), 0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div
                  className="animate-glow hidden sm:flex w-11 h-11 rounded-full items-center justify-center border flex-shrink-0"
                  style={{
                    background: `radial-gradient(circle, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.05) 100%)`,
                    borderColor: `rgba(201,168,76,0.3)`,
                  }}
                >
                  <span style={{ fontSize: 22, color: GOLD }}>☽</span>
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-bold leading-tight gold-shimmer-text">
                    Quran Reels Generator
                  </h1>
                  <p className="text-[11px] sm:text-xs font-arabic leading-none mt-0.5" style={{ color: `${GOLD}90` }}>
                    مولد مقاطع القرآن الكريم
                  </p>
                </div>
              </div>

              {/* Badge */}
              <div
                className="hidden sm:flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold px-3 py-1.5 rounded-full border"
                style={{
                  color: `${GOLD}cc`,
                  borderColor: `rgba(201,168,76,0.22)`,
                  background: `rgba(201,168,76,0.07)`,
                  boxShadow: `0 0 16px rgba(201,168,76,0.06)`,
                }}
              >
                <span style={{ color: GOLD }}>✦</span>
                <span>Uthmanic Script</span>
                <span style={{ color: GOLD }}>✦</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto">

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <div className="text-center mb-10 sm:mb-14">
              {/* Bismillah card */}
              <div
                className="animate-float inline-block px-6 sm:px-10 py-5 rounded-2xl mb-5 border relative overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.04) 100%)`,
                  borderColor: `rgba(201,168,76,0.25)`,
                  boxShadow: `0 8px 48px rgba(201,168,76,0.12), 0 0 0 1px rgba(201,168,76,0.06) inset`,
                }}
              >
                {/* Top shine */}
                <div
                  className="absolute top-0 left-1/4 right-1/4 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)` }}
                />
                <p
                  className="font-uthmani text-2xl sm:text-4xl leading-loose"
                  style={{
                    color: GOLD_LIGHT,
                    direction: 'rtl',
                    textShadow: `0 0 40px rgba(201,168,76,0.5), 0 2px 4px rgba(0,0,0,0.8)`,
                  }}
                >
                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>

              {/* Subtitle */}
              <h2
                className="text-sm sm:text-base font-semibold tracking-wide mb-2"
                style={{ color: `${GOLD}bb` }}
              >
                ✦ &nbsp; Professional Quran Video Reels &nbsp; ✦
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Authentic Uthmani script · Professional reciters · Cinematic video backgrounds
              </p>
            </div>

            {/* ── Settings cards ─────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:gap-4">

              <SectionCard step={1} title="Surah" arabicTitle="اختيار السورة">
                <SurahSelector />
              </SectionCard>

              <SectionCard step={2} title="Verse Range" arabicTitle="نطاق الآيات">
                <VerseSelector />
              </SectionCard>

              <SectionCard step={3} title="Reciter" arabicTitle="اختيار القارئ">
                <ReciterSelector />
              </SectionCard>

              <SectionCard step={4} title="Background" arabicTitle="الخلفية">
                <BackgroundSelector />
              </SectionCard>

              <SectionCard step={5} title="Translation" arabicTitle="الترجمة">
                <TranslationSettings />
              </SectionCard>

              <SectionCard step={6} title="Display Style" arabicTitle="نمط العرض">
                <DisplayModeSelector />
              </SectionCard>

              <OrnamentDivider />

              {/* ── Generate ─────────────────────────────────────────── */}
              <div
                className="quran-card p-5 sm:p-7"
                style={{ boxShadow: `0 8px 48px rgba(201,168,76,0.15), 0 0 0 1px rgba(201,168,76,0.12)` }}
              >
                <div className="text-center mb-4">
                  <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: `${GOLD}80` }}>
                    ✦ &nbsp; Ready to Generate &nbsp; ✦
                  </p>
                </div>
                <DownloadButton />
              </div>

            </div>

            {/* ── Footer ───────────────────────────────────────────── */}
            <div className="text-center mt-10 pb-6">
              <div className="ornament-divider mb-4">
                <span style={{ color: `${GOLD}50`, fontSize: 14 }}>✦</span>
              </div>
              <p className="text-xs mb-1" style={{ color: `${GOLD}50` }}>
                Built with respect for the Holy Quran
              </p>
              <p className="text-xs" style={{ color: 'rgba(150,150,160,0.45)' }}>
                Audio ·{' '}
                <a
                  href="https://everyayah.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: 'rgba(150,150,160,0.45)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(150,150,160,0.45)')}
                >
                  EveryAyah.com
                </a>
                {' · '}
                <a
                  href="https://quran.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: 'rgba(150,150,160,0.45)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(150,150,160,0.45)')}
                >
                  Quran.com
                </a>
              </p>
            </div>

          </div>
        </main>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div
          className="h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)` }}
        />
      </div>
    </ReelProvider>
  )
}
