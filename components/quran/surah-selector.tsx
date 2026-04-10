'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Book } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { fetchSurahs } from '@/lib/quran-api'
import type { Surah } from '@/lib/quran-types'
import { useReel } from '@/lib/reel-context'

export function SurahSelector() {
  const [open, setOpen] = useState(false)
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [loading, setLoading] = useState(true)
  const { config, setConfig } = useReel()

  useEffect(() => {
    async function loadSurahs() {
      try {
        const data = await fetchSurahs()
        setSurahs(data)
      } catch (error) {
        console.error('Failed to load surahs:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSurahs()
  }, [])

  const handleSelect = (surah: Surah) => {
    setConfig({
      surah,
      startVerse: 1,
      endVerse: Math.min(5, surah.verses_count),
    })
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Select Surah / اختر السورة
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-base"
            disabled={loading}
          >
            {loading ? (
              <span className="text-muted-foreground">Loading surahs...</span>
            ) : config.surah ? (
              <span className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {config.surah.id}
                </span>
                <span className="font-arabic text-lg">{config.surah.name_arabic}</span>
                <span className="text-muted-foreground text-sm">
                  ({config.surah.name_simple})
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Book className="h-4 w-4" />
                Select a surah...
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search surah..." className="h-10" />
            <CommandList>
              <CommandEmpty>No surah found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {surahs.map((surah) => (
                  <CommandItem
                    key={surah.id}
                    value={`${surah.name_simple} ${surah.name_arabic} ${surah.id}`}
                    onSelect={() => handleSelect(surah)}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                      {surah.id}
                    </span>
                    <div className="flex flex-col flex-1">
                      <span className="font-arabic text-lg">{surah.name_arabic}</span>
                      <span className="text-xs text-muted-foreground">
                        {surah.name_simple} - {surah.verses_count} verses - {surah.revelation_place}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        'h-4 w-4',
                        config.surah?.id === surah.id
                          ? 'opacity-100 text-primary'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
