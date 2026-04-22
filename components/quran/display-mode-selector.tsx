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
              'group relative flex flex-col items-center gap-2 rounded-lg border p-3 text-left transition-all',
              active
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900',
            )}
          >
            {/* Mini preview */}
            <div
              className={cn(
                'relative flex aspect-[9/16] w-full max-h-20 items-center justify-center overflow-hidden rounded-sm',
                'bg-gradient-to-b from-zinc-800 to-zinc-950',
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
                    <p className="text-[4px] text-amber-400">سورة النمل</p>
                  </div>
                  <p
                    className="px-1 text-center text-[4px] leading-tight text-white"
                    style={{ direction: 'rtl' }}
                  >
                    وَقَالَ يَٰٓأَيُّهَا ٱلنَّاسُ
                  </p>
                  <div className="w-full px-1">
                    <div className="h-0.5 rounded-full bg-white/20">
                      <div className="h-full w-1/3 rounded-full bg-emerald-400" />
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
                  active ? 'text-emerald-400' : 'text-zinc-500',
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-xs font-medium leading-tight',
                    active ? 'text-emerald-300' : 'text-zinc-200',
                  )}
                >
                  {label}
                </p>
                <p className="truncate text-[9px] text-zinc-500">{hint}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
