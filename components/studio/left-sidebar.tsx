'use client'

import type { ReactNode } from 'react'
import {
  BookOpen,
  Image as ImageIcon,
  Languages,
  LayoutTemplate,
  Mic,
  AtSign,
  ShieldCheck,
  PenTool,
  Sparkles,
  Moon,
} from 'lucide-react'
import { AyahSearch } from '@/components/quran/ayah-search'
import { SurahSelector } from '@/components/quran/surah-selector'
import { VerseSelector } from '@/components/quran/verse-selector'
import { ReciterSelector } from '@/components/quran/reciter-selector'
import { BackgroundSelector } from '@/components/quran/background-selector'
import { TranslationSettings } from '@/components/quran/translation-settings'
import { DisplayModeSelector } from '@/components/quran/display-mode-selector'
import { IstiadhaToggle } from '@/components/quran/istiadha-toggle'
import { CalligraphySelector } from '@/components/quran/calligraphy-selector'
import { DailyVerseCard } from '@/components/quran/daily-verse'
import { OverlayToggles } from '@/components/quran/overlay-toggles'
import { WatermarkInput } from './watermark-input'

interface SidebarSectionProps {
  titleAr: string
  titleEn: string
  icon: ReactNode
  children: ReactNode
  descriptionAr?: string
  descriptionEn?: string
}

function SidebarSection({ titleAr, titleEn, icon, children, descriptionAr, descriptionEn }: SidebarSectionProps) {
  return (
    <section className="px-5 py-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-subtle text-ink-tertiary">
          {icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-caption text-ink-primary" dir="rtl">{titleAr}</h2>
          {titleEn && (
            <p className="mt-0.5 text-[11px] leading-tight text-ink-tertiary">{titleEn}</p>
          )}
          {descriptionAr && (
            <p className="mt-0.5 text-[12px] leading-tight text-ink-tertiary" dir="rtl">
              {descriptionAr}
            </p>
          )}
          {!descriptionAr && descriptionEn && (
            <p className="mt-0.5 text-[12px] leading-tight text-ink-tertiary">
              {descriptionEn}
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
    <aside className="flex h-full w-full min-h-0 flex-col bg-surface lg:w-[300px] lg:shrink-0 lg:border-l lg:border-border-subtle xl:w-[340px]">
      {/* ── Sidebar heading ─────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-5 pb-4">
        <h1 className="font-arabic-ui text-[16px] font-medium text-ink-primary" dir="rtl">
          إعدادات الاستوديو
        </h1>
        <p className="mt-1 text-[13px] leading-snug text-ink-tertiary">
          Studio Controls
        </p>
      </div>
      <OrnamentDivider />

      {/* ── Scrollable sections ─────────────────────────────── */}
      <div className="sidebar-scroll flex-1 overflow-y-auto pb-24 lg:pb-4">
        <SidebarSection
          titleAr="المصدر"
          titleEn="Source"
          icon={<BookOpen className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="اختر السورة ونطاق الآيات"
        >
          <div className="flex flex-col gap-3">
            <AyahSearch />
            <SurahSelector />
            <VerseSelector />
          </div>
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="القارئ"
          titleEn="Reciter"
          icon={<Mic className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="اختر صوت التلاوة"
        >
          <ReciterSelector />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="الاستعاذة"
          titleEn="Isti'ādha"
          icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="أعوذ بالله من الشيطان الرجيم"
        >
          <IstiadhaToggle />
        </SidebarSection>

        <OrnamentDivider />

        <SidebarSection
          titleAr="الخلفية"
          titleEn="Background"
          icon={<ImageIcon className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="ارفع أو اختر خلفية"
        >
          <BackgroundSelector />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="الترجمة"
          titleEn="Translation"
          icon={<Languages className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="عرض الترجمة تحت الآية"
        >
          <TranslationSettings />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="الخط"
          titleEn="Calligraphy"
          icon={<PenTool className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="اختر نمط الخط العربي"
        >
          <CalligraphySelector />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="التخطيط"
          titleEn="Display"
          icon={<LayoutTemplate className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="اختر نمط العرض"
        >
          <DisplayModeSelector />
        </SidebarSection>

        <OrnamentDivider />

        <SidebarSection
          titleAr="الطبقات"
          titleEn="Overlays"
          icon={<Moon className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="التاريخ الهجري والتفسير والموضع"
        >
          <OverlayToggles />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="آية اليوم"
          titleEn="Daily Verse"
          icon={<Sparkles className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="الآية المميزة لليوم"
        >
          <DailyVerseCard />
        </SidebarSection>

        <Hairline />

        <SidebarSection
          titleAr="العلامة المائية"
          titleEn="Watermark"
          icon={<AtSign className="h-4 w-4" strokeWidth={1.75} />}
          descriptionAr="أضف اسمك على المعاينة"
        >
          <WatermarkInput />
        </SidebarSection>
      </div>
    </aside>
  )
}
