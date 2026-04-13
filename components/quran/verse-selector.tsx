'use client'

import { useReel } from '@/lib/reel-context'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

const MAX_VERSES = 20

export function VerseSelector() {
  const { config, setConfig } = useReel()
  const maxVerses = config.surah?.verses_count || 1

  const handleStartChange = (value: number) => {
    const start = Math.max(1, Math.min(value, maxVerses))
    // Auto-adjust end if start exceeds it
    const newEnd = start > config.endVerse ? start : config.endVerse
    // Clamp range to MAX_VERSES
    const clampedEnd = Math.min(newEnd, start + MAX_VERSES - 1, maxVerses)
    setConfig({
      startVerse: start,
      endVerse: clampedEnd,
    })
  }

  const handleEndChange = (value: number) => {
    const end = Math.max(1, Math.min(value, maxVerses))
    if (end < config.startVerse) {
      // If user types an end smaller than start, don't update
      return
    }
    // Clamp range to MAX_VERSES
    const clampedEnd = Math.min(end, config.startVerse + MAX_VERSES - 1, maxVerses)
    setConfig({ endVerse: clampedEnd })
  }

  const verseCount = config.endVerse - config.startVerse + 1
  const isAtLimit = verseCount >= MAX_VERSES
  const startExceedsEnd = config.startVerse > config.endVerse

  if (!config.surah) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Verse Range / نطاق الآيات
        </label>
        <div className="h-12 flex items-center justify-center rounded-md border border-dashed border-border text-muted-foreground text-sm">
          Select a surah first
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-muted-foreground">
        Verse Range / نطاق الآيات
      </label>

      {/* Number inputs for precise selection */}
      <FieldGroup className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel className="text-xs">From Verse</FieldLabel>
          <Input
            type="number"
            min={1}
            max={maxVerses}
            value={config.startVerse}
            onChange={(e) => handleStartChange(parseInt(e.target.value) || 1)}
            className="h-10"
          />
        </Field>
        <Field>
          <FieldLabel className="text-xs">To Verse</FieldLabel>
          <Input
            type="number"
            min={1}
            max={maxVerses}
            value={config.endVerse}
            onChange={(e) => handleEndChange(parseInt(e.target.value) || 1)}
            className="h-10"
          />
        </Field>
      </FieldGroup>

      {/* Validation: start > end */}
      {startExceedsEnd && (
        <div className="flex items-center gap-1.5 text-xs px-1" style={{ color: '#f87171' }}>
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Start verse must be ≤ end verse</span>
        </div>
      )}

      {/* Info display */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Surah has {maxVerses} verses
        </span>
        <span className="font-medium text-foreground">
          {verseCount} verse{verseCount > 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Max verse limit warning */}
      {isAtLimit && (
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border"
          style={{
            color: '#fbbf24',
            background: 'rgba(251,191,36,0.06)',
            borderColor: 'rgba(251,191,36,0.2)',
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Maximum {MAX_VERSES} verses per video to ensure smooth generation</span>
        </div>
      )}
    </div>
  )
}
