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
    <label className="flex flex-col gap-1.5">
      <span className="text-caption text-ink-tertiary">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-10 rounded-[10px] border border-border-subtle bg-surface px-3 text-right text-[14px] text-ink-primary tabular-nums transition-all duration-150 ease-out outline-none hover:border-border-default focus-visible:border-accent-primary focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60"
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
      <label className="text-caption text-ink-tertiary">Verse Range</label>

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
        <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
          <span className="tabular-nums">{maxVerses} verses total</span>
          <span className="font-medium text-accent-primary tabular-nums">
            {verseCount} selected
          </span>
        </div>
      )}

      {startExceedsEnd && (
        <div className="flex items-center gap-1.5 rounded-[8px] border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Start verse must be ≤ end verse
        </div>
      )}

      {isAtLimit && (
        <div className="flex items-center gap-1.5 rounded-[8px] border border-gold/20 bg-gold/10 px-2.5 py-1.5 text-[11px] text-gold">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Maximum {MAX_VERSES} verses per reel
        </div>
      )}
    </div>
  )
}
