'use client'

import { AtSign } from 'lucide-react'
import { useReel } from '@/lib/reel-context'

export function WatermarkInput() {
  const { config, setConfig } = useReel()

  return (
    <div className="group relative">
      <AtSign
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-emerald-600 dark:text-zinc-500 dark:group-focus-within:text-emerald-400"
        strokeWidth={2.25}
      />
      <input
        type="text"
        value={config.watermark}
        onChange={(e) => setConfig({ watermark: e.target.value.slice(0, 32) })}
        placeholder="yourhandle"
        spellCheck={false}
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all focus:border-emerald-500/60 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:bg-zinc-900"
      />
      {config.watermark && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/70">
          Live
        </span>
      )}
    </div>
  )
}
