'use client'

import { PenTool } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReel } from '@/lib/reel-context'
import { CALLIGRAPHY_STYLES } from '@/lib/quran-types'

export function CalligraphySelector() {
  const { config, setConfig } = useReel()
  const selected = config.calligraphyStyle ?? 'nabi'

  return (
    <div className="flex flex-col gap-2">
      {CALLIGRAPHY_STYLES.map((style) => {
        const active = selected === style.id
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => setConfig({ calligraphyStyle: style.id })}
            className={cn(
              'group flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-all duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
              active
                ? 'border-accent-primary/40 bg-accent-soft'
                : 'border-border-subtle bg-surface hover:border-border-default hover:bg-subtle',
            )}
          >
            {/* Mini preview with sample text */}
            <div
              className={cn(
                'flex h-9 w-14 shrink-0 items-center justify-center rounded-[6px]',
                'bg-gradient-to-b from-ink-secondary to-ink-primary',
              )}
            >
              <p
                className="text-[9px] leading-tight text-white"
                style={{ direction: 'rtl', fontFamily: style.fontFamily }}
              >
                بسم الله
              </p>
            </div>

            {/* Label */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <p
                  className={cn(
                    'text-[12px] font-medium leading-tight',
                    active ? 'text-accent-primary' : 'text-ink-primary',
                  )}
                >
                  {style.name}
                </p>
                <p
                  className="text-[11px] leading-tight text-ink-tertiary"
                  style={{ direction: 'rtl' }}
                >
                  {style.arabicName}
                </p>
              </div>
              <p className="truncate text-[10px] text-ink-tertiary">{style.style}</p>
            </div>

            {/* Active indicator */}
            {active && (
              <div className="h-2 w-2 shrink-0 rounded-full bg-accent-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
