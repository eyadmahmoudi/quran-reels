'use client'

import { ReelProvider } from '@/lib/reel-context'
import { SurahSelector } from '@/components/quran/surah-selector'
import { VerseSelector } from '@/components/quran/verse-selector'
import { ReciterSelector } from '@/components/quran/reciter-selector'
import { BackgroundSelector } from '@/components/quran/background-selector'
import { TranslationSettings } from '@/components/quran/translation-settings'
import { DisplayModeSelector } from '@/components/quran/display-mode-selector'
import { DownloadButton } from '@/components/video/download-button'
import { Separator } from '@/components/ui/separator'

export default function QuranReelsGenerator() {
  return (
    <ReelProvider>
      <div className="min-h-screen bg-background">

        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base sm:text-xl font-semibold text-foreground leading-tight">
                  Quran Reels Generator
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-arabic">
                  مولد مقاطع القرآن الكريم
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded hidden sm:inline">
                Uthmani Script
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col gap-6 items-center">

            {/* Controls */}
            <div className="w-full max-w-2xl mx-auto">
              <h2 className="text-sm sm:text-lg font-medium mb-3">
                Settings / الإعدادات
              </h2>

              <div className="flex flex-col gap-4">

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <SurahSelector />
                </section>

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <VerseSelector />
                </section>

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <ReciterSelector />
                </section>

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <BackgroundSelector />
                </section>

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <TranslationSettings />
                </section>

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <DisplayModeSelector />
                </section>

                <Separator className="my-1" />

                <section className="bg-card rounded-lg border border-border p-3 sm:p-4">
                  <DownloadButton />
                </section>

                <p className="text-xs text-muted-foreground text-center pb-4">
                  Audio from{' '}
                  <a href="https://everyayah.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    EveryAyah.com
                  </a>
                  {' '}· Text from{' '}
                  <a href="https://quran.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Quran.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-border py-3 mt-4">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-muted-foreground">
              Built with respect for the Holy Quran ❤️
            </p>
          </div>
        </footer>
      </div>
    </ReelProvider>
  )
}
