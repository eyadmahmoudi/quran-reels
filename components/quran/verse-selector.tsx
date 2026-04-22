'use client'

import { useEffect, useState } from 'react'
import { useReel } from '@/lib/reel-context'
import { AlertTriangle } from 'lucide-react'

const MAX_VERSES = 20

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  onBlur,
  disabled,
}: {
  label: string
  value: number | ''
  min: number
  max: number
  onChange: (raw: string) => void
  onBlur: () => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 tabular-nums outline-none transition-all placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  )
}

export function VerseSelector() {
  const { config, setConfig } = useReel()
  const maxVerses = config.surah?.verses_count || 1
  const [startDraft, setStartDraft] = useState<number | ''>(config.startVerse)
  const [endDraft, setEndDraft] = useState<number | ''>(config.endVerse)

  useEffect(() => {
    setStartDraft(config.startVerse)
    setEndDraft(config.endVerse)
  }, [config.startVerse, config.endVerse, config.surah?.id])

  const clampVerse = (value: number) => Math.max(1, Math.min(Math.trunc(value), maxVerses))

  const normalizeAndSave = (startRaw: number | '', endRaw: number | '') => {
    const start = clampVerse(startRaw === '' ? 1 : startRaw)
    const fallbackEnd = Math.min(start, maxVerses)
    const resolvedEnd = clampVerse(endRaw === '' ? fallbackEnd : endRaw)
    const syncedEnd = Math.max(start, resolvedEnd)
    const clampedEnd = Math.min(syncedEnd, start + MAX_VERSES - 1, maxVerses)

    setConfig({ startVerse: start, endVerse: clampedEnd })
    setStartDraft(start)
    setEndDraft(clampedEnd)
  }

  const handleStartChange = (raw: string) => {
    if (raw === '') { setStartDraft(''); return }
    const next = Number(raw)
    if (Number.isFinite(next)) setStartDraft(next)
  }

  const handleEndChange = (raw: string) => {
    if (raw === '') { setEndDraft(''); return }
    const next = Number(raw)
    if (Number.isFinite(next)) setEndDraft(next)
  }

  const verseCount = config.endVerse - config.startVerse + 1
  const isAtLimit = verseCount >= MAX_VERSES
  const startExceedsEnd =
    startDraft !== '' &&
    endDraft !== '' &&
    clampVerse(startDraft) > clampVerse(endDraft)

  const disabled = !config.surah

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Verse Range
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="From"
          value={startDraft}
          min={1}
          max={maxVerses}
          onChange={handleStartChange}
          onBlur={() => normalizeAndSave(startDraft, endDraft)}
          disabled={disabled}
        />
        <NumberField
          label="To"
          value={endDraft}
          min={1}
          max={maxVerses}
          onChange={handleEndChange}
          onBlur={() => normalizeAndSave(startDraft, endDraft)}
          disabled={disabled}
        />
      </div>

      {!disabled && (
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{maxVerses} verses total</span>
          <span className="font-medium text-emerald-400">
            {verseCount} selected
          </span>
        </div>
      )}

      {startExceedsEnd && (
        <div className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1.5 text-[10px] text-red-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Start verse must be ≤ end verse
        </div>
      )}

      {isAtLimit && (
        <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Maximum {MAX_VERSES} verses per reel
        </div>
      )}
    </div>
  )
}
