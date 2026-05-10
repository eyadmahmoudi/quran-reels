'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Check, Loader2 } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { fetchVerses, fetchSurah } from '@/lib/quran-api'
import { cn } from '@/lib/utils'

interface DailyVerseData {
  surahId: number
  surahNameArabic: string
  surahNameEnglish: string
  verseNumber: number
  verseKey: string
  textUthmani: string
  translationText: string
}

// Deterministic daily verse based on date seed
// Uses a simple hash of the date to pick from 6236 verses
function getDailyVerseSeed(): number {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit int
  }
  return Math.abs(hash)
}

// Map seed to a surah:verse pair
// We use a curated list of well-known, inspiring verses
const FEATURED_VERSES: Array<{ surah: number; verse: number; reason: string }> = [
  { surah: 2, verse: 255, reason: 'Ayat al-Kursi' },
  { surah: 2, verse: 286, reason: 'No soul burdened beyond capacity' },
  { surah: 3, verse: 139, reason: 'Do not lose heart' },
  { surah: 13, verse: 28, reason: 'Hearts find peace in Allah' },
  { surah: 29, verse: 69, reason: 'Allah guides the striving' },
  { surah: 39, verse: 10, reason: 'Reward of the patient' },
  { surah: 41, verse: 30, reason: 'Angels descend to believers' },
  { surah: 54, verse: 17, reason: 'Quran made easy to remember' },
  { surah: 65, verse: 3, reason: 'Allah provides from unseen' },
  { surah: 94, verse: 6, reason: 'With hardship comes ease' },
  { surah: 2, verse: 152, reason: 'Remember Me, I will remember you' },
  { surah: 14, verse: 7, reason: 'If you are grateful, I will give you more' },
  { surah: 2, verse: 216, reason: 'You may hate what is good for you' },
  { surah: 8, verse: 53, reason: 'Allah does not change a people' },
  { surah: 16, verse: 97, reason: 'Good deeds for men and women' },
  { surah: 20, verse: 114, reason: 'My Lord, increase me in knowledge' },
  { surah: 25, verse: 15, reason: 'Reward of the righteous' },
  { surah: 28, verse: 56, reason: 'Allah guides whom He wills' },
  { surah: 33, verse: 21, reason: 'The Prophet as an example' },
  { surah: 35, verse: 29, reason: 'Those who recite the Book' },
  { surah: 40, verse: 44, reason: 'I entrust my affair to Allah' },
  { surah: 55, verse: 13, reason: 'Which of the favors?' },
  { surah: 6, verse: 162, reason: 'My prayer, my sacrifice, my life' },
  { surah: 7, verse: 156, reason: 'My mercy encompasses all' },
  { surah: 9, verse: 40, reason: 'Allah is with us' },
  { surah: 10, verse: 62, reason: 'Friends of Allah, no fear' },
  { surah: 12, verse: 87, reason: 'Do not despair of Allah\'s mercy' },
  { surah: 15, verse: 85, reason: 'Your Lord is the Forgiving' },
  { surah: 17, verse: 1, reason: 'The Night Journey' },
  { surah: 21, verse: 107, reason: 'Mercy to the worlds' },
  { surah: 24, verse: 35, reason: 'Allah is the Light' },
  { surah: 26, verse: 77, reason: 'They are enemies to me' },
  { surah: 30, verse: 21, reason: 'Rest between spouses' },
  { surah: 36, verse: 1, reason: 'Ya Sin' },
  { surah: 42, verse: 43, reason: 'Patience and forgiveness' },
  { surah: 50, verse: 16, reason: 'We are closer than the jugular' },
  { surah: 53, verse: 39, reason: 'Each person earns their deeds' },
  { surah: 56, verse: 79, reason: 'None touches it but the pure' },
  { surah: 59, verse: 23, reason: 'Allah is Peace' },
  { surah: 67, verse: 14, reason: 'Should He not know what He created?' },
  { surah: 76, verse: 8, reason: 'They feed the needy' },
  { surah: 87, verse: 1, reason: 'Glorify the name of your Lord' },
  { surah: 93, verse: 3, reason: 'Your Lord has not forsaken you' },
  { surah: 95, verse: 4, reason: 'We created man in the best form' },
  { surah: 96, verse: 1, reason: 'Read in the name of your Lord' },
  { surah: 97, verse: 1, reason: 'Laylat al-Qadr' },
  { surah: 98, verse: 5, reason: 'Worship none but Allah' },
  { surah: 99, verse: 7, reason: "Whoever does an atom's weight of good" },
  { surah: 108, verse: 1, reason: 'We have given you Al-Kawthar' },
  { surah: 112, verse: 1, reason: 'Say: He is Allah, the One' },
]

function getTodaysVerse(): { surah: number; verse: number; reason: string } {
  const seed = getDailyVerseSeed()
  const idx = seed % FEATURED_VERSES.length
  return FEATURED_VERSES[idx]
}

export function DailyVerseCard() {
  const { config, setConfig } = useReel()
  const [dailyData, setDailyData] = useState<DailyVerseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)

  const todayVerse = getTodaysVerse()

  // Fetch the daily verse data on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const surah = await fetchSurah(todayVerse.surah)
        const verses = await fetchVerses(todayVerse.surah, {
          startVerse: todayVerse.verse,
          endVerse: todayVerse.verse,
          translationId: 20,
        })
        if (cancelled) return

        const verse = verses[0]
        if (verse && surah) {
          setDailyData({
            surahId: surah.id,
            surahNameArabic: surah.name_arabic,
            surahNameEnglish: surah.name_simple,
            verseNumber: todayVerse.verse,
            verseKey: verse.verse_key,
            textUthmani: verse.text_uthmani || '',
            translationText: verse.translations?.[0]?.text?.replace(/<[^>]+>/g, '') ?? '',
          })
        }
      } catch (err) {
        console.error('Failed to load daily verse:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [todayVerse.surah, todayVerse.verse])

  // Check if daily verse is currently applied
  useEffect(() => {
    const isApplied =
      config.surah?.id === todayVerse.surah &&
      config.startVerse === todayVerse.verse &&
      config.endVerse === todayVerse.verse
    setApplied(isApplied)
  }, [config.surah?.id, config.startVerse, config.endVerse, todayVerse.surah, todayVerse.verse])

  const applyDailyVerse = useCallback(async () => {
    if (!dailyData) return
    try {
      const surah = await fetchSurah(dailyData.surahId)
      setConfig({
        surah,
        startVerse: dailyData.verseNumber,
        endVerse: dailyData.verseNumber,
      })
    } catch {
      console.error('Failed to apply daily verse')
    }
  }, [dailyData, setConfig])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
      </div>
    )
  }

  if (!dailyData) {
    return (
      <p className="text-[12px] text-ink-tertiary" dir="rtl">تعذر تحميل آية اليوم</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Verse preview card */}
      <div className="rounded-[10px] border border-border-subtle bg-surface overflow-hidden">
        {/* Verse text */}
        <div className="px-3 pt-3 pb-2">
          <p
            className="text-right text-[15px] leading-loose text-ink-primary"
            style={{ direction: 'rtl', fontFamily: '"Amiri", serif' }}
          >
            {dailyData.textUthmani}
          </p>
        </div>

        {/* Translation preview (truncated) */}
        {dailyData.translationText && (
          <div className="px-3 pb-2">
            <p className="text-[11px] leading-relaxed text-ink-tertiary line-clamp-2">
              {dailyData.translationText}
            </p>
          </div>
        )}

        {/* Reference */}
        <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2">
          <span className="text-[10px] text-ink-tertiary">
            {dailyData.surahNameEnglish} {dailyData.verseKey}
          </span>
          <span
            className="text-[10px] text-ink-tertiary"
            style={{ direction: 'rtl' }}
          >
            {dailyData.surahNameArabic}
          </span>
        </div>
      </div>

      {/* Reason tag */}
      <p className="text-[10px] text-ink-tertiary italic" dir="rtl">
        {todayVerse.reason}
      </p>

      {/* Apply button */}
      <button
        type="button"
        onClick={applyDailyVerse}
        disabled={applied}
        className={cn(
          'w-full rounded-[8px] px-3 py-2 text-[12px] font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
          applied
            ? 'bg-accent-soft text-accent-primary border border-accent-primary/30'
            : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 border border-accent-primary/20',
        )}
      >
        <span className="flex items-center justify-center gap-1.5" dir="rtl">
          {applied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              تم التطبيق
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              استخدم آية اليوم
            </>
          )}
        </span>
      </button>
    </div>
  )
}
