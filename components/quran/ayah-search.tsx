'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { searchAyahs } from '@/lib/quran-api'
import type { Surah } from '@/lib/quran-types'
import { fetchSurahs } from '@/lib/quran-api'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export function AyahSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [surahs, setSurahs] = useState<Surah[]>([])
  
  const { setConfig } = useReel()

  // Load surahs in the background so we can match the search result to the full Surah object
  useEffect(() => {
    fetchSurahs().then(setSurahs)
  }, [])

  // Debounce the search so we don't spam the API on every single keystroke
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 2) {
        setLoading(true)
        const searchResults = await searchAyahs(query)
        setResults(searchResults)
        setLoading(false)
      } else {
        setResults([])
      }
    }, 500) // wait 500ms after typing stops

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const handleSelect = (verseKey: string) => {
    // verseKey looks like "2:255" (Surah 2, Verse 255)
    const [surahIdStr, verseIdStr] = verseKey.split(':')
    const surahId = parseInt(surahIdStr, 10)
    const verseId = parseInt(verseIdStr, 10)

    // Find the matching Surah object
    const selectedSurah = surahs.find(s => s.id === surahId)
    
    if (selectedSurah) {
      // Magic happens here: Auto-fill the config!
      setConfig({
        surah: selectedSurah,
        startVerse: verseId,
        endVerse: verseId, // Default to just this one verse
      })
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 text-sm text-ink-tertiary transition-all hover:border-border-default hover:text-ink-secondary"
      >
        <Search className="h-4 w-4" />
        <span>Search ayah by Arabic text...</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="ابحث عن آية..." 
          value={query}
          onValueChange={setQuery}
          style={{ direction: 'rtl' }}
        />
        <CommandList className="max-h-[400px] overflow-y-auto overscroll-contain touch-pan-y">
          {loading && (
            <div className="flex items-center justify-center py-6 text-ink-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && query.length > 2 && results.length === 0 && (
            <CommandEmpty>No verses found for "{query}"</CommandEmpty>
          )}
          
          {!loading && results.length > 0 && (
            <CommandGroup heading="Search Results">
              {results.map((result) => {
                const [surahId, verseId] = result.verse_key.split(':')
                const surahName = surahs.find(s => s.id === parseInt(surahId))?.name_arabic || `Surah ${surahId}`

                return (
                  <CommandItem
                    key={result.verse_key}
                    value={result.text + result.verse_key}
                    onSelect={() => handleSelect(result.verse_key)}
                    className="flex cursor-pointer flex-col items-end gap-1 border-b border-border-subtle/50 px-4 py-3 last:border-0"
                  >
                    <span 
                      className="font-arabic-ui text-right text-[16px] leading-relaxed text-ink-primary"
                      dir="rtl"
                      // The API returns HTML tags <b> around the matched word, so we render it safely
                      dangerouslySetInnerHTML={{ __html: result.text }}
                    />
                    <span className="text-[12px] text-ink-tertiary">
                      {surahName} • Ayah {verseId}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}