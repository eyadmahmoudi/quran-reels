"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { useReel } from "@/lib/reel-context";
import { searchAyahs } from "@/lib/quran-api";
import type { Surah } from "@/lib/quran-types";
import { fetchSurahs } from "@/lib/quran-api";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function AyahSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);

  const { setConfig } = useReel();

  useEffect(() => {
    fetchSurahs().then(setSurahs);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 2) {
        setLoading(true);
        const searchResults = await searchAyahs(query);
        setResults(searchResults);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (verseKey: string) => {
    const [surahIdStr, verseIdStr] = verseKey.split(":");
    const surahId = parseInt(surahIdStr, 10);
    const verseId = parseInt(verseIdStr, 10);

    const selectedSurah = surahs.find((s) => s.id === surahId);

    if (selectedSurah) {
      setConfig({
        surah: selectedSurah,
        startVerse: verseId,
        endVerse: verseId,
      });
      setOpen(false);
      setQuery("");
    }
  };

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
          style={{ direction: "rtl" }}
        />
        <CommandList className="max-h-[400px] overflow-y-auto overscroll-contain touch-pan-y">
          {loading && (
            <div className="flex items-center justify-center py-6 text-ink-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          
          {!loading && query.length > 2 && results.length === 0 && (
            <div className="py-6 text-center text-[13px] text-ink-tertiary">
              No verses found for "{query}"
            </div>
          )}
          
          {!loading && results.length > 0 && (
            <CommandGroup heading="Search Results" forceMount>
              {results.map((result) => {
                const [surahId, verseId] = result.verse_key.split(':')
                const surahName = surahs.find(s => s.id === parseInt(surahId))?.name_arabic || `Surah ${surahId}`

                return (
                  <CommandItem
                    key={result.verse_key}
                    value={`${query} ${result.verse_key}`}
                    forceMount 
                    onSelect={() => handleSelect(result.verse_key)}
                    className="flex cursor-pointer flex-col items-end gap-1 border-b border-border-subtle/50 px-4 py-3 last:border-0"
                  >
                    <span 
                      className="font-arabic-ui text-right text-[16px] leading-relaxed text-ink-primary"
                      dir="rtl"
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
  );
}