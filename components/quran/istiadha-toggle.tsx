'use client'

import { useReel } from '@/lib/reel-context'
import { Switch } from '@/components/ui/switch'

export function IstiadhaToggle() {
  const { config, setConfig } = useReel()

  const handleToggle = (checked: boolean) => setConfig({ includeIstiadha: checked })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-primary">Include Isti‘ādha</p>
          <p className="mt-0.5 text-[11px] text-ink-tertiary">
            Prepend “A‘ūdhu billāhi min ash‑shayṭān ir‑rajīm”
          </p>
        </div>
        <Switch
          id="istiadha-toggle"
          checked={config.includeIstiadha}
          onCheckedChange={handleToggle}
        />
      </div>

      {config.includeIstiadha && (
        <div className="rounded-[10px] border border-gold/20 bg-gold/10 px-3 py-2.5">
          <p
            dir="rtl"
            className="font-uthmani text-[16px] leading-[1.9] text-ink-primary"
          >
            أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
          </p>
          <p className="mt-1 text-[11px] text-ink-tertiary">
            Played once before the first verse.
          </p>
        </div>
      )}
    </div>
  )
}
