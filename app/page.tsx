'use client'

import { ReelProvider } from '@/lib/reel-context'
import { SurahSelector } from '@/components/quran/surah-selector'
import { VerseSelector } from '@/components/quran/verse-selector'
import { ReciterSelector } from '@/components/quran/reciter-selector'
import { BackgroundSelector } from '@/components/quran/background-selector'
import { TranslationSettings } from '@/components/quran/translation-settings'
import { DisplayModeSelector } from '@/components/quran/display-mode-selector'
import { DownloadButton } from '@/components/video/download-button'

function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.45))' }} />
      <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 16 }}>✦</span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, rgba(201,168,76,0.45))' }} />
    </div>
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
    <div className="quran-card p-4 sm:p-5 group transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #f0d080)',
            color: '#0d1117',
          }}
        >
          {step}
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-none">{title}</h3>
          <p className="text-xs mt-0.5 font-arabic" style={{ color: 'rgba(201,168,76,0.65)' }}>{arabicTitle}</p>
        </div>
        <div className="h-px flex-1 max-w-16 sm:max-w-24" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

export default function QuranReelsGenerator() {
  return (
    <ReelProvider>
      <div
        className="min-h-screen"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #1c2035 0%, #0f1320 40%, #090d16 100%)' }}
      >
        {/* Top gold accent line */}
        <div
          className="h-[3px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #c9a84c 30%, #f0d080 50%, #c9a84c 70%, transparent 100%)' }}
        />

        {/* Header */}
        <header
          className="sticky top-0 z-50 border-b"
          style={{
            background: 'rgba(9,13,22,0.93)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(201,168,76,0.18)',
          }}
        >
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Crescent icon */}
                <div
                  className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center flex-shrink-0 border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.05))',
                    borderColor: 'rgba(201,168,76,0.28)',
                  }}
                >
                  <span style={{ color: '#c9a84c', fontSize: 18, lineHeight: 1 }}>☽</span>
                </div>
                <div>
                  <h1
                    className="text-base sm:text-xl font-bold leading-tight"
                    style={{
                      background: 'linear-gradient(135deg, #f0d080 0%, #c9a84c 60%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Quran Reels Generator
                  </h1>
                  <p className="text-xs font-arabic leading-none mt-0.5" style={{ color: 'rgba(201,168,76,0.6)' }}>
                    مولد مقاطع القرآن الكريم
                  </p>
                </div>
              </div>
              <div
                className="hidden sm:inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full border font-semibold"
                style={{
                  color: 'rgba(201,168,76,0.75)',
                  borderColor: 'rgba(201,168,76,0.2)',
                  background: 'rgba(201,168,76,0.06)',
                }}
              >
                <span>✦</span>
                <span>Uthmani Script</span>
                <span>✦</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="max-w-2xl mx-auto">

            {/* Hero Bismillah */}
            <div className="text-center mb-8 sm:mb-10">
              <div
                className="inline-block px-6 py-4 rounded-2xl mb-3 border"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03))',
                  borderColor: 'rgba(201,168,76,0.2)',
                  boxShadow: '0 0 40px rgba(201,168,76,0.08)',
                }}
              >
                <p
                  className="font-uthmani text-2xl sm:text-3xl leading-relaxed"
                  style={{
                    color: '#c9a84c',
                    direction: 'rtl',
                    textShadow: '0 0 30px rgba(201,168,76,0.4)',
                  }}
                >
                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Create beautiful Quranic reels with authentic Uthmani script &amp; professional reciters
              </p>
            </div>

            {/* Settings cards */}
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

              <GoldDivider />

              {/* Generate section */}
              <div
                className="quran-card p-4 sm:p-6"
                style={{ boxShadow: '0 8px 40px rgba(201,168,76,0.12)' }}
              >
                <DownloadButton />
              </div>

            </div>

            {/* Footer */}
            <div className="text-center mt-8 pb-4 space-y-1">
              <p className="text-xs" style={{ color: 'rgba(201,168,76,0.4)' }}>✦ &nbsp; Built with respect for the Holy Quran &nbsp; ✦</p>
              <p className="text-xs text-muted-foreground/50">
                Audio ·{' '}
                <a href="https://everyayah.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#c9a84c] transition-colors">
                  EveryAyah.com
                </a>
                {' · '}
                <a href="https://quran.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#c9a84c] transition-colors">
                  Quran.com
                </a>
              </p>
            </div>
          </div>
        </main>

        {/* Bottom accent line */}
        <div
          className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)' }}
        />
      </div>
    </ReelProvider>
  )
}
