'use client'

import { BookOpen } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-canvas via-surface to-canvas p-8 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-[18px] bg-accent-primary/10 blur-2xl" aria-hidden />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-[14px] bg-subtle">
          <BookOpen className="h-6 w-6 text-ink-secondary" strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-3">
        <p
          className="font-arabic text-[32px] leading-none text-gold"
          style={{ direction: 'rtl' }}
        >
          ٱقْرَأْ بِٱسْمِ رَبِّكَ
        </p>
        <h3 className="font-display text-[18px] font-medium text-ink-primary">
          Your Reel Preview
        </h3>
        <p className="mx-auto max-w-[280px] text-[13px] leading-relaxed text-ink-tertiary">
          Configure your settings in the sidebar to preview your Reel.
        </p>
      </div>

      <div
        className="flex items-center gap-3 text-caption text-ink-tertiary"
        aria-hidden
      >
        <span className="h-px w-8 bg-border-default" />
        <span className="text-[12px] leading-none text-gold">۞</span>
        <span className="h-px w-8 bg-border-default" />
      </div>
      <p className="-mt-3 text-caption text-ink-tertiary">Start with a Surah</p>
    </div>
  )
}
