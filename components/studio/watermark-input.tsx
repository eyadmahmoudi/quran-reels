'use client'

import { AtSign } from 'lucide-react'
import { useReel } from '@/lib/reel-context'

export function WatermarkInput() {
  const { config, setConfig } = useReel()

  return (
    <div className="group relative">
      <AtSign
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary transition-colors group-focus-within:text-accent-primary"
        strokeWidth={2}
      />
      <input
        type="text"
        value={config.watermark}
        onChange={(e) => setConfig({ watermark: e.target.value.slice(0, 32) })}
        placeholder="yourhandle"
        spellCheck={false}
        autoComplete="off"
        className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface pl-9 pr-14 text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none transition-all duration-150 ease-out hover:border-border-default focus-visible:border-accent-primary focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]"
      />
      {config.watermark && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-accent-primary">
          Live
        </span>
      )}
    </div>
  )
}
