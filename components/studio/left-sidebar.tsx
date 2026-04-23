'use client'

import type { ReactNode } from 'react'
import {
  BookOpen,
  Image as ImageIcon,
  Languages,
  LayoutTemplate,
  Mic,
  AtSign,
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
    <section className="px-5 py-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-subtle text-ink-tertiary">
          {icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-caption text-ink-primary">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12px] leading-tight text-ink-tertiary">
              {description}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}

function OrnamentDivider() {
  return (
    <div className="flex items-center gap-3 px-5" aria-hidden="true">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-[12px] leading-none text-gold">۞</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  )
}

function Hairline() {
  return <div className="mx-5 h-px bg-border-subtle" aria-hidden="true" />
}

export function LeftSidebar() {
  return (
    <aside className="flex w-full min-h-0 shrink-0 flex-col bg-surface lg:w-[300px] lg:border-r lg:border-border-subtle xl:w-[340px]">
      {/* ── Sidebar heading ─────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-5 pb-4">
        <h1 className="text-caption text-ink-primary">Studio Controls</h1>
        <p className="mt-1 text-[13px] leading-snug text-ink-tertiary">
          Configure, preview &amp; export your Quran reel
        </p>
      </div>
      <OrnamentDivider />

      {/* ── Scrollable sections ─────────────────────────────── */}
      <div className="sidebar-scroll flex-1 overflow-y-auto pb-24 lg:pb-4">
        <SidebarSection
          title="Source"
          icon={<BookOpen className="h-4 w-4" strokeWidth={1.75} />}
          description="Select Surah & verse range"
        >
          <div className="flex flex-col gap-3">
            <SurahSelector />
            <VerseSelector />
          </div>
        </SidebarSection>

        <Hairline />

        <SidebarSection
          title="Reciter"
          icon={<Mic className="h-4 w-4" strokeWidth={1.75} />}
          description="Pick a voice"
        >
          <ReciterSelector />
        </SidebarSection>

        <OrnamentDivider />

        <SidebarSection
          title="Background"
          icon={<ImageIcon className="h-4 w-4" strokeWidth={1.75} />}
          description="Upload or choose a preset"
        >
          <BackgroundSelector />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          title="Translation"
          icon={<Languages className="h-4 w-4" strokeWidth={1.75} />}
          description="Show translation under the verse"
        >
          <TranslationSettings />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          title="Display"
          icon={<LayoutTemplate className="h-4 w-4" strokeWidth={1.75} />}
          description="Choose a layout style"
        >
          <DisplayModeSelector />
        </SidebarSection>

        <OrnamentDivider />

        <SidebarSection
          title="Watermark"
          icon={<AtSign className="h-4 w-4" strokeWidth={1.75} />}
          description="Add your handle to the preview"
        >
          <WatermarkInput />
        </SidebarSection>
      </div>
    </aside>
  )
}
