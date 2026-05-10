'use client'

import { useReel } from '@/lib/reel-context'
import { Switch } from '@/components/ui/switch'
import { TAFSIR_RESOURCES } from '@/lib/quran-types'

interface ToggleRowProps {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children?: React.ReactNode
}

function ToggleRow({ label, hint, checked, onCheckedChange, children }: ToggleRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-primary">{label}</p>
          <p className="mt-0.5 text-[11px] text-ink-tertiary">{hint}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && children && (
        <div className="mt-1 pl-1">
          {children}
        </div>
      )}
    </div>
  )
}

export function OverlayToggles() {
  const { config, setConfig } = useReel()

  return (
    <div className="flex flex-col gap-2">
      <ToggleRow
        label="Hijri Date"
        hint="Islamic date (Arabic + English)"
        checked={config.showHijriDate}
        onCheckedChange={(checked) => setConfig({ showHijriDate: checked })}
      />
      <ToggleRow
        label="Tafsir"
        hint="Brief exegesis below translation"
        checked={config.showTafsir}
        onCheckedChange={(checked) => setConfig({ showTafsir: checked })}
      >
        <p className="text-[10px] text-ink-tertiary">
          Source: {TAFSIR_RESOURCES.map(r => r.name).join(' · ')}
        </p>
      </ToggleRow>
      <ToggleRow
        label="Juz / Hizb"
        hint="Show Quran position with progress bar"
        checked={config.showJuzProgress}
        onCheckedChange={(checked) => setConfig({ showJuzProgress: checked })}
      />
    </div>
  )
}
