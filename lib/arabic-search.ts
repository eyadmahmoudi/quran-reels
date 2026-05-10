// lib/arabic-search.ts
// Arabic text normalizer with Uthmani → modern Arabic matching support.
//
// KEY FIXES:
// 1. SUPERSCRIPT ALEF (U+0670 ـٰ): In Uthmani script, this represents an
//    actual alef sound (e.g. ٱلصَّـٰبِرُونَ = الصابرون). We convert U+0670 → ا
//    BEFORE stripping diacritics, preserving the alef.
//    Previously, TASHKEEL_REGEX stripped it as a diacritic, which destroyed
//    the word (الصبرون ≠ الصابرين).
//
// 2. TATWEEL/KASHIDA (U+0640 ـ): This is a horizontal stretching character
//    used in Uthmani calligraphy (e.g. ٱلصَّـٰبِرِينَ has tatweel between ص and ٰ).
//    It has NO phonetic value — it's purely visual. If not stripped, it
//    breaks substring matching because "الصابرين" ≠ "الصـابرين".
//    Previously, U+0640 was NOT in TASHKEEL_REGEX, so tatweel characters
//    remained in the normalized text and prevented matches.

const TASHKEEL_REGEX = /[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;
//                              ^^^^^
//  U+0640 (TATWEEL/KASHIDA) added here — purely visual stretching, no phonetic value

/**
 * Strip all diacritics (tashkeel) AND tatweel from text.
 * Converts superscript alef (ـٰ) to regular alef (ا) first,
 * then removes remaining diacritical marks and tatweel.
 */
export function normalizeBase(text: string): string {
  return text
    .replace(/\u0670/g, 'ا') // dagger alef → real alef BEFORE stripping
    .replace(TASHKEEL_REGEX, '');
}

/**
 * Fuzzy normalization: strips diacritics+tatweel, unifies alef variants,
 * ta marbuta → ha, alif maqsurah/yah → yah.
 * Also handles dagger alef → regular alef.
 */
export function normalizeAlefFuzzy(text: string): string {
  return text
    .replace(/\u0670/g, 'ا') // dagger alef → real alef BEFORE stripping
    .replace(TASHKEEL_REGEX, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي');
}

/**
 * Concat normalization: fuzzy normalization + remove all whitespace.
 * Used as a last-resort match when strict and fuzzy both fail.
 */
export function normalizeConcat(text: string): string {
  return normalizeAlefFuzzy(text).replace(/\s+/g, '');
}

/**
 * Build a base-string → original-position index map.
 * This allows us to find matches in the normalized text and then
 * highlight the correct span in the original Uthmani text.
 *
 * Pre-processing steps (1-char → 1-char, positions preserved):
 * 1. Replace superscript alef (U+0670) with regular alef (ا)
 * 2. Replace tatweel (U+0640) with ZERO WIDTH SPACE to mark its position
 *    so it can be stripped without shifting other character positions.
 *
 * Actually, since tatweel is 1 char and we just want to skip it,
 * we can simply skip it in the loop like we skip diacritics.
 */
export function buildIndexMap(text: string): { base: string; map: number[] } {
  // Pre-process: replace superscript alef with regular alef (1-to-1 swap)
  const preprocessed = text.replace(/\u0670/g, 'ا');

  let base = '';
  const map: number[] = [];
  for (let i = 0; i < preprocessed.length; i++) {
    const char = preprocessed[i];
    if (!TASHKEEL_REGEX.test(char)) {
      base += char;
      map.push(i);
    }
  }
  return { base, map };
}
