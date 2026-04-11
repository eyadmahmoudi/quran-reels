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
  background: BackgroundOption
  showTranslation: boolean
  translationId: number | null
  displayMode: 'minimal' | 'classic'  // minimal = no header/footer chrome
}

export interface BackgroundOption {
  id: string
  name: string
  type: 'preset' | 'custom' | 'gradient' | 'video'
  value: string // URL for preset/custom/video, CSS gradient for gradient
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

// ── Built-in video backgrounds (Pexels CDN — all IDs visually verified) ──────
export const PRESET_VIDEOS: BackgroundOption[] = [
  {
    id: 'vid-ocean',
    name: 'Ocean Sunrise',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/1093662/free-video-1093662.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-blue-waters',
    name: 'Blue Waters',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/3571264/free-video-3571264.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-beach',
    name: 'Sandy Beach',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/1321208/1321208-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/1321208/free-video-1321208.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-coast',
    name: 'Forest Coast',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/2169880/free-video-2169880.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-valley',
    name: 'Mountain Valley',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/1437396/1437396-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/1437396/free-video-1437396.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-forest',
    name: 'Forest Light',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/1448735/free-video-1448735.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-winter',
    name: 'Winter Sunset',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/857014/857014-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/857014/free-video-857014.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-sky',
    name: 'Clear Sky',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/856975/856975-hd_1280_720_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/856975/free-video-856975.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-night-arch',
    name: 'Night Dome',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/855046/855046-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/855046/free-video-855046.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-flowers',
    name: 'Purple Meadow',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/854649/854649-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/854649/free-video-854649.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-mystic',
    name: 'Mystic Light',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/855799/855799-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/855799/free-video-855799.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-rocks',
    name: 'Rocky Shore',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/1343218/1343218-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/1343218/free-video-1343218.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-water',
    name: 'Peaceful Water',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/2499611/2499611-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/2499611/free-video-2499611.jpg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 'vid-desert',
    name: 'Desert Wind',
    type: 'video',
    value: 'https://videos.pexels.com/video-files/856638/856638-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/856638/free-video-856638.jpg?auto=compress&cs=tinysrgb&w=200',
  },
]

export interface ReciterOption {
  id: number
  name: string
  arabicName: string
  folder: string  // everyayah.com folder name - verified correct
}

export const POPULAR_RECITERS: ReciterOption[] = [
  { id: 1,  name: 'Mishary Rashid Alafasy',      arabicName: 'مشاري راشد العفاسي',   folder: 'Alafasy_128kbps' },
  { id: 2,  name: 'Abdul Basit (Murattal)',       arabicName: 'عبد الباسط عبد الصمد', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 3,  name: 'Abdul Basit (Mujawwad)',       arabicName: 'عبد الباسط مجوّد',     folder: 'Abdul_Basit_Mujawwad_128kbps' },
  { id: 4,  name: 'Abu Bakr Ash-Shaatree',        arabicName: 'أبو بكر الشاطري',      folder: 'Abu_Bakr_Ash-Shaatree_128kbps' },
  { id: 5,  name: 'Abdurrahman As-Sudais',        arabicName: 'عبدالرحمن السديس',     folder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 6,  name: 'Mahmoud Khalil Al-Husary',     arabicName: 'محمود خليل الحصري',    folder: 'Husary_128kbps' },
  { id: 7,  name: 'Al-Husary (Mujawwad)',         arabicName: 'الحصري مجوّد',         folder: 'Husary_Mujawwad_64kbps' },
  { id: 8,  name: 'Saad Al-Ghamdi',              arabicName: 'سعد الغامدي',          folder: 'Ghamadi_40kbps' },
  { id: 9,  name: 'Maher Al-Muaiqly',            arabicName: 'ماهر المعيقلي',        folder: 'Maher_AlMuaiqly_64kbps' },
  { id: 10, name: 'Hani Ar-Rifai',               arabicName: 'هاني الرفاعي',         folder: 'Hani_Rifai_64kbps' },
  { id: 11, name: 'Nasser Al-Qatami',            arabicName: 'ناصر القطامي',         folder: 'Nasser_Alqatami_128kbps' },
  { id: 12, name: 'Muhammad Ayyoub',             arabicName: 'محمد أيوب',            folder: 'Muhammad_Ayyoub_128kbps' },
  { id: 13, name: 'Abdullah Al-Matroud',         arabicName: 'عبدالله المطرود',      folder: 'Abdullah_Matroud_128kbps' },
  { id: 14, name: 'Yasser Al-Dosari',             arabicName: 'ياسر الدوسري',         folder: 'Yasser_Ad-Dussary_128kbps' },
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
