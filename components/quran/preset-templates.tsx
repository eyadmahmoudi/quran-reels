'use client'

import { useState } from 'react'
import { Check, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReel } from '@/lib/reel-context'
import { BUILTIN_PRESETS, type ReelPreset } from '@/lib/quran-types'

const STORAGE_KEY = 'quran-reels-custom-presets'

function loadCustomPresets(): ReelPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomPresets(presets: ReelPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch { /* noop */ }
}

export function PresetTemplates() {
  const { config, setConfig } = useReel()
  const [customPresets, setCustomPresets] = useState<ReelPreset[]>(loadCustomPresets)

  const allPresets = [...BUILTIN_PRESETS, ...customPresets]

  const isPresetActive = (preset: ReelPreset): boolean => {
    return (
      config.background.id === preset.background.id &&
      config.calligraphyStyle === preset.calligraphyStyle &&
      config.displayMode === preset.displayMode &&
      config.reciterId === preset.reciterId &&
      config.showTranslation === preset.showTranslation &&
      config.showHijriDate === preset.showHijriDate &&
      config.showTafsir === preset.showTafsir &&
      config.showJuzProgress === preset.showJuzProgress
    )
  }

  const applyPreset = (preset: ReelPreset) => {
    setConfig({
      background: preset.background,
      calligraphyStyle: preset.calligraphyStyle,
      displayMode: preset.displayMode,
      reciterId: preset.reciterId,
      reciterFolder: preset.reciterFolder,
      qdcRecitationId: preset.qdcRecitationId,
      showTranslation: preset.showTranslation,
      translationId: preset.translationId,
      showHijriDate: preset.showHijriDate,
      showTafsir: preset.showTafsir,
      showJuzProgress: preset.showJuzProgress,
    })
  }

  const saveCurrentAsPreset = () => {
    const name = prompt('Name this preset:')
    if (!name) return
    const emoji = prompt('Pick an emoji:', '⭐') || '⭐'
    const newPreset: ReelPreset = {
      id: `custom-${Date.now()}`,
      name,
      emoji,
      background: config.background,
      calligraphyStyle: config.calligraphyStyle,
      displayMode: config.displayMode,
      reciterId: config.reciterId,
      reciterFolder: config.reciterFolder,
      qdcRecitationId: config.qdcRecitationId,
      showTranslation: config.showTranslation,
      translationId: config.translationId,
      showHijriDate: config.showHijriDate,
      showTafsir: config.showTafsir,
      showJuzProgress: config.showJuzProgress,
    }
    const updated = [...customPresets, newPreset]
    setCustomPresets(updated)
    saveCustomPresets(updated)
  }

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id)
    setCustomPresets(updated)
    saveCustomPresets(updated)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-2">
        {allPresets.map((preset) => {
          const active = isPresetActive(preset)
          const isCustom = preset.id.startsWith('custom-')
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                'group relative flex flex-col items-center gap-1.5 rounded-[10px] border p-3 text-center transition-all duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
                active
                  ? 'border-accent-primary/40 bg-accent-soft'
                  : 'border-border-subtle bg-surface hover:border-border-default hover:bg-subtle',
              )}
            >
              <span className="text-lg">{preset.emoji}</span>
              <span
                className={cn(
                  'text-[11px] font-medium leading-tight',
                  active ? 'text-accent-primary' : 'text-ink-primary',
                )}
              >
                {preset.name}
              </span>
              {active && (
                <div className="absolute top-1.5 right-1.5 h-3 w-3 rounded-full bg-accent-primary flex items-center justify-center">
                  <Check className="h-2 w-2 text-white" />
                </div>
              )}
              {isCustom && !active && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteCustomPreset(preset.id) }}
                  className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                >
                  <Trash2 className="h-2.5 w-2.5 text-red-500/60" />
                </button>
              )}
            </button>
          )
        })}
      </div>

      {/* Save current as preset */}
      <button
        type="button"
        onClick={saveCurrentAsPreset}
        className="w-full rounded-[8px] border border-dashed border-border-default px-3 py-2 text-[12px] text-ink-tertiary hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-soft transition-all duration-150"
      >
        <span className="flex items-center justify-center gap-1.5">
          <Star className="h-3.5 w-3.5" />
          Save Current as Preset
        </span>
      </button>
    </div>
  )
}
