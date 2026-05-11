'use client'

import { useState, useEffect } from 'react'
import { getHijriDate } from '@/lib/hijri-date'
import { Clock, MapPin } from 'lucide-react'

// ── Prayer times from Aladhan API ──────────────────────────────────────

interface PrayerTimesData {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

const PRAYER_NAMES_AR: Record<string, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
}

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const PRAYERS_ONLY = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getNextPrayer(times: PrayerTimesData): { name: string; nameAr: string; time: string; minutesLeft: number } | null {
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  for (const name of PRAYERS_ONLY) {
    const prayerMins = timeToMinutes(times[name as keyof PrayerTimesData])
    if (prayerMins > nowMins) {
      return {
        name,
        nameAr: PRAYER_NAMES_AR[name],
        time: times[name as keyof PrayerTimesData],
        minutesLeft: prayerMins - nowMins,
      }
    }
  }
  // After Isha, next is Fajr tomorrow
  const fajrMins = timeToMinutes(times.Fajr)
  return {
    name: 'Fajr',
    nameAr: PRAYER_NAMES_AR['Fajr'],
    time: times.Fajr,
    minutesLeft: (24 * 60 - nowMins) + fajrMins,
  }
}

function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) {
    return `${h} س ${m} د`
  }
  return `${m} دقيقة`
}

export function IslamicInfoBar() {
  const [hijriDate, setHijriDate] = useState<ReturnType<typeof getHijriDate> | null>(null)
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null)
  const [nextPrayer, setNextPrayer] = useState<ReturnType<typeof getNextPrayer> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set Hijri date immediately (client-side calculation)
    setHijriDate(getHijriDate(new Date()))
  }, [])

  useEffect(() => {
    if (!hijriDate) return

    let cancelled = false

    async function fetchPrayerTimes() {
      try {
        // Algiers — method 19 (وزارة الشؤون الدينية والأوقاف الجزائرية / Algerian Ministry of Religious Affairs)
        const today = new Date()
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`
        const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Algiers&country=Algeria&method=19`

        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch prayer times')

        const data = await res.json()
        if (cancelled) return

        const timings = data.data.timings
        const times: PrayerTimesData = {
          Fajr: timings.Fajr,
          Sunrise: timings.Sunrise,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha,
        }

        setPrayerTimes(times)
        setNextPrayer(getNextPrayer(times))
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          console.error('Prayer times fetch error:', err)
          setError('تعذر تحميل مواقيت الصلاة')
          setLoading(false)
        }
      }
    }

    fetchPrayerTimes()
    return () => { cancelled = true }
  }, [hijriDate])

  // Update next prayer countdown every minute
  useEffect(() => {
    if (!prayerTimes) return

    const interval = setInterval(() => {
      setNextPrayer(getNextPrayer(prayerTimes))
    }, 60000) // every 60s

    return () => clearInterval(interval)
  }, [prayerTimes])

  if (!hijriDate) return null

  return (
    <div className="w-full border-b border-border-subtle bg-surface">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-2">
        {/* ── Hijri Date ────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft text-accent-primary">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          <div className="flex flex-col leading-tight sm:flex-row sm:items-center sm:gap-2">
            <span
              className="font-arabic-ui text-[13px] font-medium text-ink-primary"
              dir="rtl"
            >
              {hijriDate.formattedAr}
            </span>
            <span className="hidden text-[11px] text-ink-tertiary sm:inline">|</span>
            <span className="text-[11px] text-ink-tertiary">
              {hijriDate.formattedEn}
            </span>
          </div>
        </div>

        {/* ── Separator ────────────────────────────── */}
        <div className="hidden h-4 w-px bg-border-subtle sm:block" />

        {/* ── Next Prayer ───────────────────────────── */}
        {nextPrayer && (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-gold/15 text-gold">
              <Clock className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-col leading-tight sm:flex-row sm:items-center sm:gap-2">
              <span className="font-arabic-ui text-[13px] font-medium text-ink-primary" dir="rtl">
                الصلاة القادمة: {nextPrayer.nameAr}
              </span>
              <span className="text-[11px] text-ink-tertiary">
                {nextPrayer.time} — {formatCountdown(nextPrayer.minutesLeft)}
              </span>
            </div>
          </div>
        )}

        {/* ── Separator ────────────────────────────── */}
        {prayerTimes && <div className="hidden h-4 w-px bg-border-subtle sm:block" />}

        {/* ── All Prayer Times (compact) ────────────── */}
        {prayerTimes && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <MapPin className="h-3 w-3 shrink-0 text-ink-tertiary" />
            {PRAYER_ORDER.map((name) => {
              const time = prayerTimes[name as keyof PrayerTimesData]
              const isNext = nextPrayer?.name === name
              return (
                <div
                  key={name}
                  className={`flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] ${
                    isNext
                      ? 'bg-accent-soft font-medium text-accent-primary'
                      : 'text-ink-tertiary'
                  }`}
                >
                  <span className="font-arabic-ui" dir="rtl">{PRAYER_NAMES_AR[name]}</span>
                  <span className="tabular-nums">{time}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Location badge ────────────────────────── */}
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <MapPin className="h-3 w-3 text-ink-tertiary" />
          <span className="text-[11px] text-ink-tertiary">الجزائر العاصمة</span>
        </div>
      </div>
    </div>
  )
}
