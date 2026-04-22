'use client'

import { BookOpen } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-100 via-slate-50 to-white p-8 text-center dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <BookOpen className="h-10 w-10 text-emerald-600/80 dark:text-emerald-400/80" strokeWidth={1.5} />
          <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 dark:ring-white/5" />
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="font-arabic text-2xl text-amber-600/90 dark:text-amber-500/90"
          style={{ direction: 'rtl' }}
        >
          ٱقْرَأْ بِٱسْمِ رَبِّكَ
        </p>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Your Reel Preview
        </h3>
        <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
          Configure your settings in the sidebar to preview your Reel.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-zinc-300 dark:to-zinc-700" />
        Start with a Surah
        <span className="h-px w-6 bg-gradient-to-l from-transparent to-zinc-300 dark:to-zinc-700" />
      </div>
    </div>
  )
}
