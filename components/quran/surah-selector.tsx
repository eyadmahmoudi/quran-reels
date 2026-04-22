'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Book } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
        Surah
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className={cn(
              'group relative flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-all',
              'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
              'dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {loading ? (
              <span className="text-zinc-500 dark:text-zinc-500">Loading surahs…</span>
            ) : config.surah ? (
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[11px] font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                  {config.surah.id}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-zinc-900 dark:text-zinc-100">{config.surah.name_simple}</span>
                  <span
                    className="font-arabic text-[13px] text-emerald-600/80 dark:text-emerald-400/70"
                    style={{ direction: 'rtl' }}
                  >
                    {config.surah.name_arabic}
                  </span>
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500">
                <Book className="h-4 w-4" />
                Select a surah
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[340px] border-zinc-200 bg-white p-0 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          align="start"
        >
          <Command className="bg-white dark:bg-zinc-900">
            <CommandInput placeholder="Search surah…" className="h-10" />
            <CommandList className="bg-white dark:bg-zinc-900">
              <CommandEmpty>No surah found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {surahs.map((surah) => {
                  const isSelected = config.surah?.id === surah.id
                  return (
                    <CommandItem
                      key={surah.id}
                      value={`${surah.name_simple} ${surah.name_arabic} ${surah.id}`}
                      onSelect={() => handleSelect(surah)}
                      className="group flex items-center gap-3 py-2.5 data-[selected=true]:bg-emerald-500/10"
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-colors',
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500 group-data-[selected=true]:bg-emerald-500/15 group-data-[selected=true]:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-data-[selected=true]:text-emerald-300',
                        )}
                      >
                        {surah.id}
                      </span>
                      <div className="flex flex-1 flex-col leading-tight">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{surah.name_simple}</span>
                        <span
                          className="font-arabic text-[13px] text-zinc-500 dark:text-zinc-500"
                          style={{ direction: 'rtl' }}
                        >
                          {surah.name_arabic}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                        {surah.verses_count} vs
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
