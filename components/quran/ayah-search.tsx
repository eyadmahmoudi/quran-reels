"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import { useReel } from "@/lib/reel-context";
import { searchAyahs, fetchSurahs } from "@/lib/quran-api";
import {
  searchByConcept,
  preloadConceptSearch,
  type ConceptSearchStatus,
  type ConceptSearchResult,
} from "@/lib/concept-search";
import type { Surah } from "@/lib/quran-types";
import {
  CommandDialog,
  CommandList,
} from "@/components/ui/command";

type Mode = "exact" | "concept";

interface ResultItem {
  verse_key: string;
  text: string;
  translation?: string;
  score?: number;
  matched?: "lexical" | "semantic";
}

const STATUS_LABEL: Record<ConceptSearchStatus, string> = {
  "loading-model": "Loading model (one-time, ~100 MB)…",
  "loading-embeddings": "Loading verse index…",
  "embedding-query": "Understanding your query…",
  searching: "Ranking verses…",
};

export function AyahSearch() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("exact");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [conceptStatus, setConceptStatus] =
    useState<ConceptSearchStatus | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  // Bumped on every new search to ignore stale responses.
  const requestIdRef = useRef(0);

  const { setConfig } = useReel();

  useEffect(() => {
    fetchSurahs().then(setSurahs);
  }, []);

  // Pre-warm the model + embeddings as soon as the user opens the
  // dialog and switches to (or already is on) the concept tab. This
  // overlaps the heavy first-time download with the user typing.
  useEffect(() => {
    if (open && mode === "concept") preloadConceptSearch();
  }, [open, mode]);

  // Re-run on query OR mode change with 500 ms debounce.
  useEffect(() => {
    setError(null);
    const myReqId = ++requestIdRef.current;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setConceptStatus(null);
        return;
      }
      setLoading(true);
      try {
        if (mode === "exact") {
          const r = await searchAyahs(query);
          if (myReqId === requestIdRef.current) setResults(r);
        } else {
          const r: ConceptSearchResult[] = await searchByConcept(
            query,
            (s) => {
              if (myReqId === requestIdRef.current) setConceptStatus(s);
            },
          );
          if (myReqId === requestIdRef.current) {
            setResults(r);
            setConceptStatus(null);
          }
        }
      } catch (e) {
        if (myReqId === requestIdRef.current) {
          setError(e instanceof Error ? e.message : String(e));
          setResults([]);
          setConceptStatus(null);
        }
      } finally {
        if (myReqId === requestIdRef.current) setLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [query, mode]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setResults([]);
    setError(null);
    setConceptStatus(null);
  };

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

  const isConcept = mode === "concept";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 text-sm text-ink-tertiary transition-all hover:border-border-default hover:text-ink-secondary"
      >
        <Search className="h-4 w-4" />
        <span>Search ayah by text or concept...</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* Mode tabs */}
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <button
            type="button"
            onClick={() => switchMode("exact")}
            className={
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (mode === "exact"
                ? "bg-subtle text-ink-primary"
                : "text-ink-tertiary hover:text-ink-secondary")
            }
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Exact text</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode("concept")}
            className={
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (mode === "concept"
                ? "bg-subtle text-ink-primary"
                : "text-ink-tertiary hover:text-ink-secondary")
            }
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>By concept / feeling</span>
          </button>
        </div>

        {/* Input */}
        <div className="flex items-center border-b px-3 h-12">
          <input
            type="text"
            placeholder={
              isConcept
                ? "Type a concept or feeling — اكتب موضوعاً أو شعوراً..."
                : "ابحث عن آية..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            dir={isConcept ? "auto" : "rtl"}
            autoFocus
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <CommandList className="max-h-[440px] overflow-y-auto overscroll-contain touch-pan-y">
          {!loading && !error && results.length === 0 && query.length < 2 && (
            <div className="py-6 px-4 text-center text-[12px] text-ink-tertiary">
              {isConcept ? (
                <>
                  Try things like <em>patience</em>, <em>أنا حزين</em>,{" "}
                  <em>guidance after loss</em>, or <em>التوكل على الله</em>.
                  <br />
                  <span className="text-[11px] opacity-75">
                    First use downloads a small model (~100&nbsp;MB) — cached
                    after that.
                  </span>
                </>
              ) : (
                <>Type at least 2 characters of an ayah to search.</>
              )}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isConcept && conceptStatus && (
                <span className="text-[11px]">
                  {STATUS_LABEL[conceptStatus]}
                </span>
              )}
            </div>
          )}

          {!loading && error && (
            <div className="mx-3 my-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Concept search unavailable</div>
                <div className="mt-1 opacity-90">{error}</div>
              </div>
            </div>
          )}

          {!loading && !error && query.length > 1 && results.length === 0 && (
            <div className="py-6 text-center text-[13px] text-ink-tertiary">
              No verses found for &quot;{query}&quot;
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-ink-tertiary">
                {isConcept
                  ? `Top ${results.length} verses by relevance`
                  : "Search results"}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {results.map((result) => {
                  const [surahId, verseId] = result.verse_key.split(":");
                  const surahName =
                    surahs.find((s) => s.id === parseInt(surahId))
                      ?.name_arabic || `Surah ${surahId}`;
                  return (
                    <button
                      key={result.verse_key}
                      type="button"
                      onClick={() => handleSelect(result.verse_key)}
                      className="flex w-full cursor-pointer flex-col items-end gap-1 rounded-[6px] px-3 py-3 text-left transition-colors hover:bg-subtle active:bg-border-subtle"
                    >
                      <span
                        className="font-arabic-ui text-right text-[16px] leading-relaxed text-ink-primary"
                        dir="rtl"
                        dangerouslySetInnerHTML={{ __html: result.text }}
                      />
                      {isConcept && result.translation && (
                        <span
                          className="w-full text-right text-[12px] italic leading-snug text-ink-secondary"
                          dir="ltr"
                        >
                          {result.translation}
                        </span>
                      )}
                      <span className="flex w-full items-center justify-end gap-2 text-[12px] text-ink-tertiary">
                        <span>
                          {surahName} • Ayah {verseId}
                        </span>
                        {isConcept && result.matched === "lexical" && (
                          <span
                            className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            title="Verse contains your search term verbatim"
                          >
                            exact match
                          </span>
                        )}
                        {isConcept &&
                          result.matched === "semantic" &&
                          typeof result.score === "number" && (
                            <span
                              className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px]"
                              title="Semantic similarity score"
                            >
                              {(result.score * 100).toFixed(0)}%
                            </span>
                          )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
