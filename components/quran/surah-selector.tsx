"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchSurahs } from "@/lib/quran-api";
import type { Surah } from "@/lib/quran-types";
import { useReel } from "@/lib/reel-context";

export function SurahSelector() {
  const [open, setOpen] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const { config, setConfig } = useReel();

  useEffect(() => {
    async function loadSurahs() {
      try {
        const data = await fetchSurahs();
        setSurahs(data);
      } catch (error) {
        console.error("Failed to load surahs:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSurahs();
  }, []);

  const handleSelect = (surah: Surah) => {
    setConfig({
      surah,
      startVerse: 1,
      endVerse: Math.min(5, surah.verses_count),
    });
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-caption text-ink-tertiary">Surah</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className={cn(
              "group relative flex h-10 w-full items-center justify-between gap-2 rounded-[10px] border border-border-subtle bg-surface px-3 text-left text-[14px] transition-all duration-150 ease-out",
              "hover:border-border-default",
              "focus-visible:border-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {loading ? (
              <span className="text-ink-tertiary">Loading surahs…</span>
            ) : config.surah ? (
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft text-[11px] font-semibold text-accent-primary tabular-nums">
                  {config.surah.id}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-ink-primary">
                    {config.surah.name_simple}
                  </span>
                </span>
                <span
                  className="font-arabic-ui text-[13px] text-gold"
                  style={{ direction: "rtl" }}
                >
                  {config.surah.name_arabic}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-ink-tertiary">
                <Book className="h-4 w-4" />
                Select a surah
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-tertiary transition-colors group-hover:text-ink-secondary" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[320px] rounded-[10px] border border-border-subtle bg-surface p-0 text-ink-primary shadow-lg"
          align="start"
        >
          <Command className="bg-surface">
            <CommandInput placeholder="Search surah…" className="h-10" />
            <CommandList className="bg-surface max-h-[300px] overflow-y-auto overscroll-contain touch-pan-y">
              <CommandEmpty className="py-6 text-center text-[13px] text-ink-tertiary">
                No surah found.
              </CommandEmpty>
              <CommandGroup>
                {surahs.map((surah) => {
                  const isSelected = config.surah?.id === surah.id;
                  return (
                    <CommandItem
                      key={surah.id}
                      value={`${surah.name_simple} ${surah.name_arabic} ${surah.id}`}
                      onSelect={() => handleSelect(surah)}
                      className="group flex items-center gap-3 rounded-[6px] py-2 data-[selected=true]:bg-subtle"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[11px] font-semibold tabular-nums transition-colors",
                          isSelected
                            ? "bg-accent-soft text-accent-primary"
                            : "bg-subtle text-ink-tertiary group-data-[selected=true]:bg-accent-soft group-data-[selected=true]:text-accent-primary",
                        )}
                      >
                        {surah.id}
                      </span>
                      <div className="flex flex-1 flex-col leading-tight">
                        <span className="text-[14px] text-ink-primary">
                          {surah.name_simple}
                        </span>
                        <span
                          className="font-arabic-ui text-[13px] text-ink-tertiary"
                          style={{ direction: "rtl" }}
                        >
                          {surah.name_arabic}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-tertiary tabular-nums">
                        {surah.verses_count} vs
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-accent-primary" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
