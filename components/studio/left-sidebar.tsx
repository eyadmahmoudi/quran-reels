'use client'

import type { ReactNode } from 'react'
import {
  BookMarked,
  Image as ImageIcon,
  Languages,
  LayoutTemplate,
  Mic,
  Tag,
} from 'lucide-react'
import { SurahSelector } from '@/components/quran/surah-selector'
import { VerseSelector } from '@/components/quran/verse-selector'
import { ReciterSelector } from '@/components/quran/reciter-selector'
import { BackgroundSelector } from '@/components/quran/background-selector'
import { TranslationSettings } from '@/components/quran/translation-settings'
import { DisplayModeSelector } from '@/components/quran/display-mode-selector'
import { WatermarkInput } from './watermark-input'

interface SidebarSectionProps {
  title: string
  icon: ReactNode
  children: ReactNode
  description?: string
}

function SidebarSection({ title, icon, description, children }: SidebarSectionProps) {
  return (
    <section className="border-b border-zinc-200 px-4 py-5 last:border-b-0">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-700">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[10px] text-zinc-500">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}

export function LeftSidebar() {
  return (
    <aside className="flex w-full min-h-0 shrink-0 flex-col border-b border-zinc-200 bg-white lg:w-[350px] lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
        <h1 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Studio Controls
        </h1>
        <p className="mt-0.5 text-[10px] text-zinc-400">
          Configure, preview &amp; export your Quran reel
        </p>
      </div>

      {/* Independent scroll. Extra bottom padding on mobile to clear the sticky action bar. */}
      <div className="sidebar-scroll flex-1 overflow-y-auto pb-24 lg:pb-6">
        <SidebarSection
          title="Source"
          icon={<BookMarked className="h-3.5 w-3.5" strokeWidth={2.25} />}
          description="Select Surah & verse range"
        >
          <div className="flex flex-col gap-4">
            <SurahSelector />
            <VerseSelector />
          </div>
        </SidebarSection>

        <SidebarSection
          title="Reciter"
          icon={<Mic className="h-3.5 w-3.5" strokeWidth={2.25} />}
          description="Pick a voice"
        >
          <ReciterSelector />
        </SidebarSection>

        <SidebarSection
          title="Background"
          icon={<ImageIcon className="h-3.5 w-3.5" strokeWidth={2.25} />}
          description="Upload or choose a preset"
        >
          <BackgroundSelector />
        </SidebarSection>

        <SidebarSection
          title="Translation"
          icon={<Languages className="h-3.5 w-3.5" strokeWidth={2.25} />}
        >
          <TranslationSettings />
        </SidebarSection>

        <SidebarSection
          title="Display"
          icon={<LayoutTemplate className="h-3.5 w-3.5" strokeWidth={2.25} />}
        >
          <DisplayModeSelector />
        </SidebarSection>

        <SidebarSection
          title="Watermark"
          icon={<Tag className="h-3.5 w-3.5" strokeWidth={2.25} />}
          description="Add your handle to the preview"
        >
          <WatermarkInput />
        </SidebarSection>
      </div>
    </aside>
  )
}
