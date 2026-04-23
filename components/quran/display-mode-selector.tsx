'use client'

import { Layers, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReel } from '@/lib/reel-context'

export function DisplayModeSelector() {
  const { config, setConfig } = useReel()
  const mode = config.displayMode ?? 'minimal'

  const modes = [
    {
      key: 'minimal' as const,
      label: 'Minimal',
      hint: 'Clean, no chrome',
      Icon: Minimize2,
    },
    {
      key: 'classic' as const,
      label: 'Classic',
      hint: 'Header + bar',
      Icon: Layers,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {modes.map(({ key, label, hint, Icon }) => {
        const active = mode === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => setConfig({ displayMode: key })}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-[10px] border p-3 text-left transition-all duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
              active
                ? 'border-accent-primary/40 bg-accent-soft'
                : 'border-border-subtle bg-surface hover:border-border-default hover:bg-subtle',
            )}
          >
            {/* Mini preview */}
            <div
              className={cn(
                'relative flex aspect-[9/16] max-h-20 w-full items-center justify-center overflow-hidden rounded-[6px]',
                'bg-gradient-to-b from-ink-secondary to-ink-primary',
              )}
            >
              {key === 'minimal' ? (
                <>
                  <p
                    className="px-1 text-center text-[5px] leading-tight text-white"
                    style={{ direction: 'rtl' }}
                  >
                    وَقَالَ يَٰٓأَيُّهَا ٱلنَّاسُ
                  </p>
                  <p className="absolute bottom-1.5 px-1 text-center text-[4px] text-white/70">
                    And he said, O people
                  </p>
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-between py-1">
                  <div className="rounded-full bg-black/60 px-1.5 py-0.5">
                    <p className="text-[4px] text-gold">سورة النمل</p>
                  </div>
                  <p
                    className="px-1 text-center text-[4px] leading-tight text-white"
                    style={{ direction: 'rtl' }}
                  >
                    وَقَالَ يَٰٓأَيُّهَا ٱلنَّاسُ
                  </p>
                  <div className="w-full px-1">
                    <div className="h-0.5 rounded-full bg-white/20">
                      <div className="h-full w-1/3 rounded-full bg-accent-primary" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Label */}
            <div className="flex w-full items-center gap-1.5">
              <Icon
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  active ? 'text-accent-primary' : 'text-ink-tertiary',
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-[12px] font-medium leading-tight',
                    active ? 'text-accent-primary' : 'text-ink-primary',
                  )}
                >
                  {label}
                </p>
                <p className="truncate text-[10px] text-ink-tertiary">{hint}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
