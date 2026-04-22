'use client'

import { BookOpen } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-8 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <BookOpen className="h-10 w-10 text-emerald-400/80" strokeWidth={1.5} />
          <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="font-arabic text-2xl text-amber-500/90"
          style={{ direction: 'rtl' }}
        >
          ٱقْرَأْ بِٱسْمِ رَبِّكَ
        </p>
        <h3 className="text-base font-semibold text-zinc-100">
          Your Reel Preview
        </h3>
        <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-zinc-500">
          Configure your settings in the sidebar to preview your Reel.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-zinc-700" />
        Start with a Surah
        <span className="h-px w-6 bg-gradient-to-l from-transparent to-zinc-700" />
      </div>
    </div>
  )
}
