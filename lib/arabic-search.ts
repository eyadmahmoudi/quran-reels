/**
 * Arabic search normalization for Uthmani Quran text.
 *
 * Modeled after the "Ayah — Quran" Android app's matching behavior:
 * users may type with or without tashkeel, with any alef form, with
 * or without hamza seats, and with explicit alefs where Uthmani uses
 * the superscript alef (ٰ U+0670).
 *
 * Strategy: build two normalized keys per verse.
 *
 *   1. `base`  — tashkeel stripped, alef forms unified, hamza seats
 *                collapsed to their base letter, superscript alef
 *                EXPANDED to explicit alef so that "رحمان" matches
 *                Uthmani "رَحۡمَٰن". Ta marbuta→ه, ى→ي.
 *
 *   2. `loose` — `base` with all remaining alefs + spaces stripped.
 *                Catches the other direction ("رحمن" matching written
 *                "رَحۡمَٰن") and concatenated queries ("الحمدلله").
 *
 * Matching pass: strict substring on `base` first; any gaps are then
 * filled with loose hits. Strict hits always rank above loose ones.
 */

// Tashkeel / Quranic marks to strip outright. We deliberately EXCLUDE
// four codepoints that carry pronunciation information in Uthmani script
// and expand them to real letters below:
//   U+0670  superscript alef  → ا
//   U+06E5  small waw         → و
//   U+06E6  small yeh         → ي
//   U+06E7  small high yeh    → ي
// Covers: Arabic marks (0610-061A), full vowel range (064B-065F),
// Quranic annotation signs 06D6-06E4 and 06E8-06ED (gapped around 06E5-7),
// extended Arabic for Quran (08D3-08FF). U+06E1 (small-high-dotless-khah,
// used as sukun in this dataset) sits in 06D6-06E4 so it is covered.
const TASHKEEL =
  /[\u0610-\u061A\u064B-\u065F\u06D6-\u06E4\u06E8-\u06ED\u08D3-\u08E1\u08E3-\u08FF]/g
const TATWEEL = /\u0640/g

/** Base normalization — keeps one alef per position, no tashkeel. */
export function normalizeBase(text: string): string {
  return text
    // 1. Strip tashkeel / Quranic annotation marks (but keep the four
    //    pronunciation-carrying marks — we expand them next).
    .replace(TASHKEEL, '')
    // 2. Strip tatweel
    .replace(TATWEEL, '')
    // 3. Silent-letter + superscript-alef combos that Uthmani writes for
    //    historical reasons. Collapse to a single alef so that the
    //    user-typed modern form ("صلاة", "زكاة", "حياة", "ضحى") matches.
    //       وٰة (silent waw before ta marbuta) → اة   (صلوٰة → صلاة)
    //       وٰا (silent waw in الربوا)        → ا    (ٱلربوٰا → الربا)
    //       ىٰ  (alef maqsura + superscript)  → ا   (ضحىٰ → ضحا, موسىٰ → موسا)
    //    The generic "و+ٰ in other contexts" is a REAL waw followed by
    //    a long-alef mark — handled by the standalone ٰ→ا rule below so
    //    that الصواعق / أموال / أزواج / السماوات stay intact.
    .replace(/\u0648\u0670\u0629/g, '\u0627\u0629')
    .replace(/\u0648\u0670\u0627/g, '\u0627')
    .replace(/\u0649\u0670/g, '\u0627')
    // 4. Expand remaining small-letter marks to their full equivalents
    //    so "إبراهيم" can match Uthmani "إِبۡرَٰهِۧم".
    .replace(/\u0670/g, '\u0627') // superscript alef  → ا
    .replace(/\u06E5/g, '\u0648') // small waw         → و
    .replace(/\u06E6/g, '\u064A') // small yeh         → ي
    .replace(/\u06E7/g, '\u064A') // small high yeh    → ي
    // 5. Unify all alef variants to plain alef ا
    //    (أ hamza-above, إ hamza-below, آ madd, ٱ wasla)
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    // 6. Collapse hamza seats to their base letters (NOT to alef — that
    //    was the old bug that turned "شيء" into "شيا").
    .replace(/\u0624/g, '\u0648') // ؤ → و
    .replace(/\u0626/g, '\u064A') // ئ → ي
    .replace(/\u0621/g, '')       // ء → drop
    // 7. ى (alef maqsura, on its own, without superscript alef) → ا
    //    In Uthmani script, word-final ى carries an a-sound (هدى, إلى, موسى).
    //    Mapping to ا matches the phonetic value and lets user-typed ى or
    //    modern ى→ى find Uthmani verses without needing superscript.
    .replace(/\u0649/g, '\u0627')
    // 8. Ta marbuta ة → ه
    .replace(/\u0629/g, '\u0647')
    // 9. Collapse consecutive alefs
    .replace(/\u0627{2,}/g, '\u0627')
    // 10. Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Alef-insensitive normalization. Keeps word boundaries (spaces). Used as
 * the second match tier so "الرحمن" matches Uthmani "الرحمٰن" (written
 * with an explicit alef) without eating real waws/yehs elsewhere.
 *
 * Spaces are preserved here so "اموال" cannot fake-match across a word
 * boundary in "... المغضوب عليهم ولا ..." (that would be "عليهم ول" →
 * concatenated "عليهمول" contains the query loose form "مول").
 */
export function normalizeAlefFuzzy(text: string): string {
  return normalizeBase(text).replace(/\u0627/g, '')
}

/**
 * Concatenated normalization — alefs AND spaces stripped. Third match
 * tier, used only when the earlier tiers return nothing, to handle
 * queries typed without spaces like "بسمالله" or "الحمدلله".
 */
export function normalizeConcat(text: string): string {
  return normalizeAlefFuzzy(text).replace(/\s+/g, '')
}

/**
 * @deprecated kept for backwards compatibility; use normalizeAlefFuzzy /
 * normalizeConcat. Returns the concatenated (alef-and-space stripped) form.
 */
export function normalizeLoose(text: string): string {
  return normalizeConcat(text)
}

/** A lightweight "Arabic-ish" detector — returns true if query has any letters. */
export function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)
}

/**
 * Walk the original Uthmani text in parallel with its normalized form
 * to build a char-index map: normalized[i] corresponds to original[map[i]].
 * Used for highlighting matches in the original text.
 *
 * Mirrors normalizeBase — must produce IDENTICAL output so strict substring
 * matches against it succeed. Handles the multi-char combos (وٰ→ا, يٰ→ا),
 * alef-run collapse, and whitespace normalization that would otherwise
 * diverge from the whole-string normalization.
 */
export function buildIndexMap(original: string): { base: string; map: number[] } {
  const map: number[] = []
  let base = ''

  // Tashkeel / annotation marks we drop (same as TASHKEEL regex above).
  const isTashkeel = (c: string) => {
    const cp = c.charCodeAt(0)
    return (
      (cp >= 0x0610 && cp <= 0x061a) ||
      (cp >= 0x064b && cp <= 0x065f) ||
      (cp >= 0x06d6 && cp <= 0x06e4) ||
      (cp >= 0x06e8 && cp <= 0x06ed) ||
      (cp >= 0x08d3 && cp <= 0x08e1) ||
      (cp >= 0x08e3 && cp <= 0x08ff) ||
      cp === 0x0640 // tatweel
    )
  }

  // Push one normalized char, collapsing consecutive alefs.
  const push = (out: string, origIdx: number) => {
    if (out === '\u0627' && base.length > 0 && base[base.length - 1] === '\u0627') {
      return // alef-run collapse
    }
    base += out
    map.push(origIdx)
  }

  let pendingSpace = false
  let sawFirstNonSpace = false

  for (let i = 0; i < original.length; i++) {
    const ch = original[i]
    const next = i + 1 < original.length ? original[i + 1] : ''

    // Whitespace: collapse runs, emit a single space only if we've already
    // emitted content and more content will follow (handled by flush below).
    if (/\s/.test(ch)) {
      if (sawFirstNonSpace) pendingSpace = true
      continue
    }

    // Tashkeel / tatweel → drop.
    if (isTashkeel(ch)) continue

    // Flush a pending space before emitting the next real char.
    if (pendingSpace) {
      base += ' '
      map.push(i) // space maps to current real char's original index
      pendingSpace = false
    }
    sawFirstNonSpace = true

    // Multi-char combo rules (look-ahead). Mirror normalizeBase exactly.
    //   وٰة  → اة  (silent waw before ta marbuta; ة→ه happens below)
    //   وٰا  → ا   (الربوا → الربا, rare)
    //   ىٰ   → ا   (alef-maqsura-final)
    //
    // Uthmani may interleave annotation marks (e.g. maddah U+0653) between
    // the و/ى, the ٰ, and the terminal ة/ا. Scan past any tashkeel while
    // looking ahead, then skip to the terminal char when we commit.
    const nextNonTashkeel = (from: number): { idx: number; ch: string } => {
      let j = from
      while (j < original.length && isTashkeel(original[j])) j++
      return { idx: j, ch: j < original.length ? original[j] : '' }
    }
    if (ch === '\u0648' && next === '\u0670') {
      const after = nextNonTashkeel(i + 2)
      if (after.ch === '\u0629') {
        // وٰة → emit ا now, skip past ٰ (and any marks); ة processed next iter.
        push('\u0627', i)
        i = after.idx - 1 // for-loop ++ will land on ة
        continue
      }
      if (after.ch === '\u0627') {
        // وٰا → single ا spanning the whole cluster
        push('\u0627', i)
        i = after.idx // for-loop ++ lands past ا
        continue
      }
      // Fallthrough: real waw consonant, ٰ expands to ا below.
      push('\u0648', i)
      continue
    }
    if (ch === '\u0649' && next === '\u0670') {
      push('\u0627', i)
      i++
      continue
    }

    // Single-char normalizations mirroring normalizeBase order.
    const cp = ch.charCodeAt(0)
    let out = ch
    if (cp === 0x0670) out = '\u0627'      // superscript alef → ا
    else if (cp === 0x06e5) out = '\u0648' // small waw → و
    else if (cp === 0x06e6) out = '\u064a' // small yeh → ي
    else if (cp === 0x06e7) out = '\u064a' // small high yeh → ي
    else if (cp === 0x0623 || cp === 0x0625 || cp === 0x0622 || cp === 0x0671)
      out = '\u0627'                        // أ إ آ ٱ → ا
    else if (cp === 0x0624) out = '\u0648' // ؤ → و
    else if (cp === 0x0626) out = '\u064a' // ئ → ي
    else if (cp === 0x0621) continue       // ء → drop
    else if (cp === 0x0649) out = '\u0627' // ى → ا
    else if (cp === 0x0629) out = '\u0647' // ة → ه

    push(out, i)
  }

  return { base, map }
}
