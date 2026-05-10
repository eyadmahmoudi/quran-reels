/**
 * Gregorian → Hijri date conversion (tabular Islamic calendar).
 *
 * Uses the Kuwaiti algorithm (same one used by the Umm al-Qura calendar
 * for approximate conversion). Accuracy is ±1 day, which is acceptable
 * for an overlay display (the exact date depends on moon sighting).
 *
 * Based on the algorithm by Habib Khawjah (modified Julian Day approach).
 */

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
]

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah',
]

function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function gregorianToHijri(
  year: number, month: number, day: number,
): { year: number; month: number; day: number } {
  // Convert Gregorian to Julian Day Number
  if (month <= 2) {
    year -= 1
    month += 12
  }
  const A = Math.floor(year / 100)
  const B = 2 - A + Math.floor(A / 4)
  const JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5

  // Convert Julian Day to Hijri
  const L = Math.floor(JD - 1948439.5 + 10632)
  const N = Math.floor((L - 1) / 10631)
  let adjustedL = L - 10631 * N + 354
  const J = Math.floor((10985 - adjustedL) / 5316) * Math.floor((50 * adjustedL) / 17719) + Math.floor(adjustedL / 5670) * Math.floor((43 * adjustedL) / 15238)
  adjustedL = adjustedL - Math.floor((30 - J) / 15) * Math.floor((17719 * J) / 50) - Math.floor(J / 16) * Math.floor((15238 * J) / 43) + 29
  const hijriMonth = Math.floor((24 * adjustedL) / 709)
  const hijriDay = adjustedL - Math.floor((709 * hijriMonth) / 24)
  const hijriYear = 30 * N + J - 30

  return { year: hijriYear, month: hijriMonth, day: hijriDay }
}

export function getHijriDate(date: Date = new Date()): {
  year: number
  month: number
  day: number
  monthNameAr: string
  monthNameEn: string
  formattedAr: string
  formattedEn: string
} {
  const h = gregorianToHijri(date.getFullYear(), date.getMonth() + 1, date.getDate())

  return {
    ...h,
    monthNameAr: HIJRI_MONTHS[h.month - 1] || '',
    monthNameEn: HIJRI_MONTHS_EN[h.month - 1] || '',
    formattedAr: `${toArabicNumerals(h.day)} ${HIJRI_MONTHS[h.month - 1]} ${toArabicNumerals(h.year)}`,
    formattedEn: `${h.day} ${HIJRI_MONTHS_EN[h.month - 1]} ${h.year} AH`,
  }
}
