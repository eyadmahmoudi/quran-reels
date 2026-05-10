'use client'

import { useReel } from '@/lib/reel-context'
import { Switch } from '@/components/ui/switch'

interface ToggleRowProps {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ToggleRow({ label, hint, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-primary">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink-tertiary">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function OverlayToggles() {
  const { config, setConfig } = useReel()

  return (
    <div className="flex flex-col gap-2">
      <ToggleRow
        label="Hijri Date"
        hint="Show Islamic date on the reel"
        checked={config.showHijriDate}
        onCheckedChange={(checked) => setConfig({ showHijriDate: checked })}
      />
      <ToggleRow
        label="Tafsir"
        hint="Brief exegesis below translation"
        checked={config.showTafsir}
        onCheckedChange={(checked) => setConfig({ showTafsir: checked })}
      />
      <ToggleRow
        label="Juz / Hizb"
        hint="Show Quran position indicator"
        checked={config.showJuzProgress}
        onCheckedChange={(checked) => setConfig({ showJuzProgress: checked })}
      />
    </div>
  )
}
