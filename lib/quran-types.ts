// Quran API Types

export interface Surah {
  id: number
  revelation_place: 'makkah' | 'madinah'
  revelation_order: number
  bismillah_pre: boolean
  name_simple: string
  name_complex: string
  name_arabic: string
  verses_count: number
  pages: number[]
  translated_name: {
    language_name: string
    name: string
  }
}

export interface Word {
  id: number
  position: number
  audio_url: string | null
  char_type_name: string
  text_uthmani: string
  text_indopak?: string
  text_imlaei?: string
  page_number: number
  line_number: number
  translation?: {
    text: string
    language_name: string
  }
}

export interface Verse {
  id: number
  verse_number: number
  verse_key: string
  hizb_number: number
  rub_el_hizb_number: number
  ruku_number: number
  manzil_number: number
  sajdah_number: number | null
  text_uthmani: string
  text_imlaei?: string
  page_number: number
  juz_number: number
  words?: Word[]
  translations?: Translation[]
  audio?: VerseAudio
}

export interface Translation {
  id: number
  resource_id: number
  text: string
  resource_name?: string
  language_name?: string
}

export interface VerseAudio {
  url: string
  duration: number
  segments: number[][] // [word_position, start_time, end_time]
}

export interface Reciter {
  id: number
  reciter_name: string
  style: string | null
  translated_name?: {
    name: string
    language_name: string
  }
}

export interface AudioFile {
  url: string
  duration: number
  format: string
  segments?: number[][]
}

export interface RecitationInfo {
  id: number
  reciter_id: number
  reciter_name: string
  style: string | null
  translated_name?: {
    name: string
  }
}

export interface ChapterRecitation {
  audio_file: {
    id: number
    chapter_id: number
    file_size: number
    format: string
    audio_url: string
  }
}

export interface VerseTimings {
  verse_key: string
  timestamp_from: number
  timestamp_to: number
  duration: number
  segments: number[][]
}

export interface TranslationResource {
  id: number
  name: string
  author_name: string
  slug: string
  language_name: string
  translated_name: {
    name: string
    language_name: string
  }
}

// App State Types
export interface ReelConfig {
  surah: Surah | null
  startVerse: number
  endVerse: number
  reciterId: number | null        // local ID from POPULAR_RECITERS
  reciterFolder: string           // everyayah.com folder, used for audio
  qdcRecitationId: number | null  // QDC API recitation ID for word-level timing
  background: BackgroundOption
  showTranslation: boolean
  translationId: number | null
  displayMode: 'minimal' | 'classic'  // minimal = no header/footer chrome
}

export interface BackgroundOption {
  id: string
  name: string
  type: 'preset' | 'custom' | 'gradient' | 'animated'
  value: string // URL for preset/custom, CSS gradient for gradient, animation name for animated
  thumbnail?: string
}

export const PRESET_BACKGROUNDS: BackgroundOption[] = [
  // ── Gradients ──────────────────────────────────────────────────────────
  {
    id: 'night-sky',
    name: 'Night Sky',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0c1220 0%, #1a2744 50%, #0c1220 100%)',
  },
  {
    id: 'emerald-dark',
    name: 'Emerald Night',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0a1a14 0%, #0d2818 50%, #0a1a14 100%)',
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0a0f1a 0%, #1a2a4a 50%, #0a0f1a 100%)',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    type: 'gradient',
    value: 'linear-gradient(180deg, #1a1510 0%, #2a2015 50%, #1a1510 100%)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0a0a0f 0%, #151520 50%, #0a0a0f 100%)',
  },
  {
    id: 'deep-purple',
    name: 'Deep Purple',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0f0a1a 0%, #1e1040 50%, #0f0a1a 100%)',
  },
  {
    id: 'desert-night',
    name: 'Desert Night',
    type: 'gradient',
    value: 'linear-gradient(180deg, #1a150f 0%, #2a251a 50%, #1a150f 100%)',
  },
  {
    id: 'teal-dark',
    name: 'Dark Teal',
    type: 'gradient',
    value: 'linear-gradient(180deg, #061a1a 0%, #0a2e2e 50%, #061a1a 100%)',
  },
  // ── Nature Photos (Unsplash) ───────────────────────────────────────────
  {
    id: 'nature-stars',
    name: 'Starry Sky',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60',
  },
  {
    id: 'nature-milkyway',
    name: 'Milky Way',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=200&q=60',
  },
  {
    id: 'nature-mountains',
    name: 'Mountains',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60',
  },
  {
    id: 'nature-desert',
    name: 'Desert Dunes',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=60',
  },
  {
    id: 'nature-ocean',
    name: 'Ocean Sunset',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=60',
  },
  {
    id: 'nature-forest',
    name: 'Forest Light',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=60',
  },
  {
    id: 'nature-mecca',
    name: 'Golden Sky',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=60',
  },
  {
    id: 'nature-clouds',
    name: 'Storm Clouds',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=200&q=60',
  },
  {
    id: 'nature-aurora',
    name: 'Aurora',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&q=60',
  },
  {
    id: 'nature-rain',
    name: 'Rainy Night',
    type: 'preset',
    value: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1080&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=200&q=60',
  },
]

// ── Animated canvas backgrounds (procedurally generated, no external deps) ───
export const ANIMATED_BACKGROUNDS: BackgroundOption[] = [
  { id: 'anim-starfield', name: 'Starfield',     type: 'animated', value: 'starfield',  thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60' },
  { id: 'anim-aurora',    name: 'Aurora',        type: 'animated', value: 'aurora',     thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&q=60' },
  { id: 'anim-ocean',     name: 'Ocean Night',   type: 'animated', value: 'ocean',      thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=60' },
  { id: 'anim-rain',      name: 'Night Rain',    type: 'animated', value: 'rain',       thumbnail: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=200&q=60' },
  { id: 'anim-desert',    name: 'Desert Sunset', type: 'animated', value: 'desert',     thumbnail: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=60' },
  { id: 'anim-galaxy',    name: 'Galaxy',        type: 'animated', value: 'galaxy',     thumbnail: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=200&q=60' },
  { id: 'anim-candle',    name: 'Candlelight',   type: 'animated', value: 'candle',     thumbnail: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=60' },
  { id: 'anim-snow',      name: 'Snowfall',      type: 'animated', value: 'snow',       thumbnail: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=200&q=60' },
  { id: 'anim-forest',    name: 'Forest Night',  type: 'animated', value: 'forest',     thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=60' },
  { id: 'anim-nebula',    name: 'Nebula',        type: 'animated', value: 'nebula',     thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&q=60' },
  { id: 'anim-fire',      name: 'Fire',          type: 'animated', value: 'fire',       thumbnail: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=200&q=60' },
  { id: 'anim-water',     name: 'Water Ripple',  type: 'animated', value: 'water',      thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=60' },
  { id: 'anim-mountains', name: 'Mountains',     type: 'animated', value: 'mountains',  thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60' },
  { id: 'anim-hills',     name: 'Green Hills',   type: 'animated', value: 'hills',      thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=60' },
]

export interface ReciterOption {
  id: number
  name: string
  arabicName: string
  folder: string                   // everyayah.com folder name - verified correct
  qdcRecitationId: number | null   // QDC API recitation ID for word-level timing segments (null = unavailable)
}

export const POPULAR_RECITERS: ReciterOption[] = [
  { id: 1,  name: 'Mishary Rashid Alafasy',      arabicName: 'مشاري راشد العفاسي',   folder: 'Alafasy_128kbps',                qdcRecitationId: 7 },
  { id: 2,  name: 'Abdul Basit (Murattal)',       arabicName: 'عبد الباسط عبد الصمد', folder: 'Abdul_Basit_Murattal_192kbps',   qdcRecitationId: 2 },
  { id: 3,  name: 'Abdul Basit (Mujawwad)',       arabicName: 'عبد الباسط مجوّد',     folder: 'Abdul_Basit_Mujawwad_128kbps',   qdcRecitationId: 1 },
  { id: 4,  name: 'Abu Bakr Ash-Shaatree',        arabicName: 'أبو بكر الشاطري',      folder: 'Abu_Bakr_Ash-Shaatree_128kbps',  qdcRecitationId: 4 },
  { id: 5,  name: 'Abdurrahman As-Sudais',        arabicName: 'عبدالرحمن السديس',     folder: 'Abdurrahmaan_As-Sudais_192kbps', qdcRecitationId: 3 },
  { id: 6,  name: 'Mahmoud Khalil Al-Husary',     arabicName: 'محمود خليل الحصري',    folder: 'Husary_128kbps',                 qdcRecitationId: 6 },
  { id: 7,  name: 'Al-Husary (Mujawwad)',         arabicName: 'الحصري مجوّد',         folder: 'Husary_Mujawwad_64kbps',         qdcRecitationId: null },
  { id: 8,  name: 'Saad Al-Ghamdi',              arabicName: 'سعد الغامدي',          folder: 'Ghamadi_40kbps',                 qdcRecitationId: null },
  { id: 9,  name: 'Maher Al-Muaiqly',            arabicName: 'ماهر المعيقلي',        folder: 'Maher_AlMuaiqly_64kbps',         qdcRecitationId: null },
  { id: 10, name: 'Hani Ar-Rifai',               arabicName: 'هاني الرفاعي',         folder: 'Hani_Rifai_64kbps',              qdcRecitationId: 5 },
  { id: 11, name: 'Nasser Al-Qatami',            arabicName: 'ناصر القطامي',         folder: 'Nasser_Alqatami_128kbps',        qdcRecitationId: null },
  { id: 12, name: 'Muhammad Ayyoub',             arabicName: 'محمد أيوب',            folder: 'Muhammad_Ayyoub_128kbps',        qdcRecitationId: null },
  { id: 13, name: 'Abdullah Al-Matroud',         arabicName: 'عبدالله المطرود',      folder: 'Abdullah_Matroud_128kbps',       qdcRecitationId: null },
  { id: 14, name: 'Yasser Al-Dosari',             arabicName: 'ياسر الدوسري',         folder: 'Yasser_Ad-Dussary_128kbps',      qdcRecitationId: 97 },
]

export const TRANSLATION_RESOURCES = [
  // IDs verified against quran.com API v4
  { id: 20,  name: 'Saheeh International',         language: 'English' },
  { id: 85,  name: 'Abdul Haleem',                  language: 'English' },
  { id: 22,  name: 'Yusuf Ali',                     language: 'English' },
  { id: 19,  name: 'Pickthall',                     language: 'English' },
  { id: 203, name: 'Al-Hilali & Khan',               language: 'English' },
  { id: 84,  name: 'Mufti Taqi Usmani',             language: 'English' },
  { id: 149, name: 'Bridges Translation',            language: 'English' },
  { id: 77,  name: 'Diyanet İşleri',               language: 'Turkish' },
  { id: 27,  name: 'Bubenheim & Nadeem',            language: 'German' },
  { id: 31,  name: 'Hamidullah',                    language: 'French' },
  { id: 97,  name: 'Maududi (Urdu)',                language: 'Urdu' },
  { id: 33,  name: 'Kemenag RI',                    language: 'Indonesian' },
  { id: 45,  name: 'Kuliev',                        language: 'Russian' },
]
