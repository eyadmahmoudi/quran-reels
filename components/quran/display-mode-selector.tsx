'use client'

import { Layers, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReel } from '@/lib/reel-context'

export function DisplayModeSelector() {
  const { config, setConfig } = useReel()
  const mode = config.displayMode ?? 'minimal'

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-muted-foreground">
        Display Style / نمط العرض
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setConfig({ displayMode: 'minimal' })}
          className={cn(
            'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
            mode === 'minimal'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40'
          )}
        >
          <div className="w-full aspect-[9/16] max-h-24 rounded bg-gray-800 relative overflow-hidden flex items-center justify-center">
            <p className="text-white text-[6px] text-center px-1 leading-tight" style={{ direction: 'rtl' }}>
              وَقَالَ يَٰٓأَيُّهَا ٱلنَّاسُ
            </p>
            <p className="absolute bottom-2 text-white/70 text-[5px] text-center px-1">
              And he said, O people
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Minimize2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium">Minimal</p>
              <p className="text-[10px] text-muted-foreground">Clean, no chrome</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setConfig({ displayMode: 'classic' })}
          className={cn(
            'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
            mode === 'classic'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40'
          )}
        >
          <div className="w-full aspect-[9/16] max-h-24 rounded bg-gray-800 relative overflow-hidden flex flex-col items-center justify-between py-1">
            <div className="bg-black/50 rounded-full px-2 py-0.5">
              <p className="text-yellow-400 text-[5px]">سورة النمل</p>
            </div>
            <p className="text-white text-[5px] text-center px-1 leading-tight" style={{ direction: 'rtl' }}>
              وَقَالَ يَٰٓأَيُّهَا ٱلنَّاسُ
            </p>
            <div className="w-full px-1">
              <div className="h-0.5 bg-white/20 rounded-full w-full">
                <div className="h-full bg-primary w-1/3 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium">Classic</p>
              <p className="text-[10px] text-muted-foreground">With header & bar</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
