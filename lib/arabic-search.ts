const TASHKEEL_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g;

export function normalizeBase(text: string): string {
  return text.replace(TASHKEEL_REGEX, '');
}

export function normalizeAlefFuzzy(text: string): string {
  return text
    .replace(TASHKEEL_REGEX, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي');
}

export function normalizeConcat(text: string): string {
  return normalizeAlefFuzzy(text).replace(/\s+/g, '');
}

export function buildIndexMap(text: string): { base: string; map: number[] } {
  let base = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!TASHKEEL_REGEX.test(char)) {
      base += char;
      map.push(i);
    }
  }
  return { base, map };
}