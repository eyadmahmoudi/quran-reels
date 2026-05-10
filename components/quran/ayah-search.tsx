"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
  BookOpen,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useReel } from "@/lib/reel-context";
import { searchAyahs, fetchSurahs } from "@/lib/quran-api";
import {
  searchByConcept,
  preloadConceptSearch,
  type ConceptSearchStatus,
  type ConceptSearchResult,
} from "@/lib/concept-search";
import { askQuestion, type AskResult, type AskStatus } from "@/lib/ask";
import type { Surah } from "@/lib/quran-types";
import { CommandDialog, CommandList } from "@/components/ui/command";

type Mode = "exact" | "concept" | "ask";

interface ResultItem {
  verse_key: string;
  text: string;
  translation?: string;
  score?: number;
  matched?: "lexical" | "semantic";
}

const STATUS_LABEL: Record<ConceptSearchStatus, string> = {
  "loading-model": "Preparing search…",
  "loading-embeddings": "Preparing search…",
  "embedding-query": "Understanding your query…",
  searching: "Ranking verses…",
};

const ASK_STATUS_LABEL: Record<AskStatus, string> = {
  retrieving: "Looking through the Qur'an…",
  thinking: "Thinking…",
  done: "",
};

/**
 * Render an answer string that contains [S:V] verse citations by
 * wrapping each citation in a small subtle pill so it visually
 * connects to the verse cards below.
 */
function renderAnswerWithCitations(answer: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\[(\d{1,3})\s*[:：]\s*(\d{1,3})\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(answer)) !== null) {
    if (match.index > last) {
      parts.push(answer.slice(last, match.index));
    }
    parts.push(
      <span
        key={`c${key++}`}
        className="inline-block rounded bg-subtle px-1 py-0.5 font-mono text-[11px] text-ink-secondary"
      >
        {match[1]}:{match[2]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < answer.length) parts.push(answer.slice(last));
  return parts;
}

export function AyahSearch() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("exact");

  // Search state (exact + concept).
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [conceptStatus, setConceptStatus] =
    useState<ConceptSearchStatus | null>(null);

  // Ask (chat) state.
  const [askInput, setAskInput] = useState("");
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askStatus, setAskStatus] = useState<AskStatus | null>(null);

  const [surahs, setSurahs] = useState<Surah[]>([]);
  const requestIdRef = useRef(0);
  const askReqIdRef = useRef(0);

  const { setConfig } = useReel();

  useEffect(() => {
    fetchSurahs().then(setSurahs);
  }, []);

  // Pre-warm the concept-search model + embeddings AS SOON AS THE APP
  // LOADS, scheduled on idle so it doesn't compete with critical
  // resources during initial render. Both the concept tab AND the ask
  // tab share these assets.
  useEffect(() => {
    if (typeof window === "undefined") return;
    type IdleScheduler = (
      cb: () => void,
      opts?: { timeout?: number },
    ) => number;
    const ric: IdleScheduler =
      (window as unknown as { requestIdleCallback?: IdleScheduler })
        .requestIdleCallback ??
      ((cb) => window.setTimeout(cb, 1500));
    const handle = ric(() => preloadConceptSearch(), { timeout: 4000 });
    return () => {
      const cancel = (
        window as unknown as { cancelIdleCallback?: (h: number) => void }
      ).cancelIdleCallback;
      if (cancel) cancel(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  // Re-run search on query OR mode change with 500 ms debounce.
  // Only fires for exact + concept modes; ask mode is submit-on-enter.
  useEffect(() => {
    if (mode === "ask") return;
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
    setAskError(null);
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
      setAskInput("");
    }
  };

  const submitAsk = async () => {
    const q = askInput.trim();
    if (q.length < 2 || askLoading) return;
    const myReq = ++askReqIdRef.current;
    setAskError(null);
    setAskResult(null);
    setAskLoading(true);
    setAskStatus(null);
    try {
      const r = await askQuestion(q, (s) => {
        if (myReq === askReqIdRef.current) setAskStatus(s);
      });
      if (myReq !== askReqIdRef.current) return;
      if (r.error) {
        setAskError(r.error);
      } else {
        setAskResult(r);
      }
    } catch (e) {
      if (myReq === askReqIdRef.current) {
        setAskError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (myReq === askReqIdRef.current) {
        setAskLoading(false);
        setAskStatus(null);
      }
    }
  };

  const isConcept = mode === "concept";
  const isAsk = mode === "ask";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 text-sm text-ink-tertiary transition-all hover:border-border-default hover:text-ink-secondary"
      >
        <Search className="h-4 w-4" />
        <span>ابحث عن آية، مفهوم، أو اسأل سؤالاً...</span>
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
            <span>نص دقيق</span>
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
            <span>بالمفهوم / الشعور</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode("ask")}
            className={
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (mode === "ask"
                ? "bg-subtle text-ink-primary"
                : "text-ink-tertiary hover:text-ink-secondary")
            }
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>اسأل</span>
          </button>
        </div>

        {/* === ASK MODE — chat-style input + answer === */}
        {isAsk && (
          <>
            <div className="border-b px-3 py-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitAsk();
                    }
                  }}
                  placeholder="Ask anything — اسأل أي شيء..."
                  dir="auto"
                  rows={2}
                  autoFocus
                  className="flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={submitAsk}
                  disabled={askInput.trim().length < 2 || askLoading}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-ink-primary text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Ask"
                >
                  {askLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-1 text-[10px] text-ink-tertiary">
                Enter to send, Shift+Enter for newline
              </div>
            </div>

            <div className="max-h-[440px] overflow-y-auto overscroll-contain touch-pan-y">
              {!askLoading && !askResult && !askError && (
                <div className="px-4 py-6 text-center text-[12px] text-ink-tertiary">
                  <div className="mb-2 font-medium text-ink-secondary">
                    Ask the Qur&apos;an like a chat
                  </div>
                  <div className="mx-auto max-w-md space-y-1.5 text-left">
                    <div>
                      • <em>حكم شرب الخمر</em> — get the verse on the ruling
                    </div>
                    <div>
                      • <em>أشعر بالحزن</em> — get verses to comfort
                    </div>
                    <div>
                      • <em>من هو عدو موسى</em> — get the answer + the verse
                    </div>
                    <div>
                      • Paste a verse fragment to find which verse it&apos;s from
                    </div>
                  </div>
                </div>
              )}

              {askLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-ink-tertiary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {askStatus && (
                    <span className="text-[11px]">
                      {ASK_STATUS_LABEL[askStatus]}
                    </span>
                  )}
                </div>
              )}

              {askError && (
                <div className="mx-3 my-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">Couldn&apos;t answer</div>
                    <div className="mt-1 opacity-90">{askError}</div>
                  </div>
                </div>
              )}

              {askResult && askResult.answer && (
                <div className="px-4 py-4">
                  {/* Answer */}
                  <div
                    className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-primary"
                    dir="auto"
                  >
                    {renderAnswerWithCitations(askResult.answer)}
                  </div>

                  {/* Cited verse cards */}
                  {askResult.cited_verses.length > 0 && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                        Cited verses — click to load into the reel
                      </div>
                      {askResult.cited_verses.map((v) => {
                        const [sId, vId] = v.verse_key.split(":");
                        const surahName =
                          surahs.find((s) => s.id === parseInt(sId))
                            ?.name_arabic || `Surah ${sId}`;
                        return (
                          <button
                            key={v.verse_key}
                            type="button"
                            onClick={() => handleSelect(v.verse_key)}
                            className="flex w-full cursor-pointer flex-col items-end gap-1 rounded-[6px] border border-border-subtle px-3 py-3 text-left transition-colors hover:bg-subtle active:bg-border-subtle"
                          >
                            <span
                              className="font-arabic-ui text-right text-[16px] leading-relaxed text-ink-primary"
                              dir="rtl"
                            >
                              {v.text}
                            </span>
                            <span
                              className="w-full text-right text-[12px] italic leading-snug text-ink-secondary"
                              dir="ltr"
                            >
                              {v.translation}
                            </span>
                            <span className="flex w-full items-center justify-end gap-2 text-[12px] text-ink-tertiary">
                              <span>
                                {surahName} • Ayah {vId}
                              </span>
                              <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px]">
                                {v.verse_key}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* === EXACT + CONCEPT MODES — single-line search === */}
        {!isAsk && (
          <>
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
              {!loading &&
                !error &&
                results.length === 0 &&
                query.length < 2 && (
                  <div className="py-6 px-4 text-center text-[12px] text-ink-tertiary">
                    {isConcept ? (
                      <>
                        Try things like <em>patience</em>, <em>أنا حزين</em>,{" "}
                        <em>guidance after loss</em>, or{" "}
                        <em>التوكل على الله</em>.
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
                    <div className="font-medium">Search unavailable</div>
                    <div className="mt-1 opacity-90">{error}</div>
                  </div>
                </div>
              )}

              {!loading &&
                !error &&
                query.length > 1 &&
                results.length === 0 && (
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
          </>
        )}
      </CommandDialog>
    </>
  );
}
