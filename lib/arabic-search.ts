// lib/arabic-search.ts
// Arabic text normalizer with Uthmani → modern Arabic matching support.
//
// KEY FIX: The superscript/dagger alef (U+0670 ـٰ) in Uthmani script
// represents an actual alef sound (e.g. ٱلصَّـٰبِرُونَ = الصابرون).
// Previously, TASHKEEL_REGEX stripped it as a diacritic, which destroyed
// the word (الصبرون ≠ الصابرين). Now we convert U+0670 → ا (regular alef)
// BEFORE stripping diacritics, preserving the alef and making searches work.

const TASHKEEL_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;

/**
 * Strip all diacritics (tashkeel) from text.
 * Converts superscript alef (ـٰ) to regular alef (ا) first,
 * then removes remaining diacritical marks.
 */
export function normalizeBase(text: string): string {
  return text
    .replace(/\u0670/g, 'ا') // dagger alef → real alef BEFORE stripping
    .replace(TASHKEEL_REGEX, '');
}

/**
 * Fuzzy normalization: strips diacritics, unifies alef variants,
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
 * Key detail: we preprocess dagger alef (U+0670) → ا (1-char → 1-char)
 * so that positions remain aligned before we strip diacritics.
 */
export function buildIndexMap(text: string): { base: string; map: number[] } {
  // Pre-process: replace superscript alef with regular alef
  // This is a 1-to-1 swap, so character positions are preserved.
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
