'use client'

import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  progress: number
}

export function LoadingOverlay({ progress }: LoadingOverlayProps) {
  const stage =
    progress < 30 ? 'تحميل الملفات الصوتية...' :
    progress < 50 ? 'معالجة الصوت...' :
    progress < 95 ? 'تصيير الإطارات...' :
    'المرحلة النهائية...'

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-zinc-200 bg-white/95 px-8 py-6 shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" aria-hidden />
          <Loader2 className="relative h-10 w-10 animate-spin text-emerald-600" strokeWidth={2.25} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-zinc-900" dir="rtl">جارٍ إنشاء المقطع</p>
          <p className="text-xs text-zinc-600">{stage}</p>
        </div>
        <div className="relative h-1.5 w-56 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-500"
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
        <p className="text-[11px] font-medium tabular-nums text-emerald-600">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}
