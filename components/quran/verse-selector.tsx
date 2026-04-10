'use client'

import { useReel } from '@/lib/reel-context'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

export function VerseSelector() {
  const { config, setConfig } = useReel()
  const maxVerses = config.surah?.verses_count || 1

  const handleStartChange = (value: number) => {
    const start = Math.max(1, Math.min(value, maxVerses))
    setConfig({
      startVerse: start,
      endVerse: Math.max(start, config.endVerse),
    })
  }

  const handleEndChange = (value: number) => {
    const end = Math.max(config.startVerse, Math.min(value, maxVerses))
    setConfig({ endVerse: end })
  }

  const handleSliderChange = (values: number[]) => {
    setConfig({
      startVerse: values[0],
      endVerse: values[1],
    })
  }

  const verseCount = config.endVerse - config.startVerse + 1

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
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-muted-foreground">
        Verse Range / نطاق الآيات
      </label>

      {/* Slider for visual selection */}
      <div className="px-2">
        <Slider
          min={1}
          max={maxVerses}
          step={1}
          value={[config.startVerse, config.endVerse]}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

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

      {/* Info display */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Surah has {maxVerses} verses
        </span>
        <span className="font-medium text-foreground">
          {verseCount} verse{verseCount > 1 ? 's' : ''} selected
        </span>
      </div>
    </div>
  )
}
