export type Mood = 'grateful' | 'peace' | 'strength' | 'guidance' | 'celebrating';

export interface Verse {
    id: string;
    surah: string;
    surahNumber: number;
    verseNumber: number;
    arabic: string;
    english: string;
    moods: Mood[];
    theme: string;
    savedAt?: number; // Timestamp when verse was saved to favorites
}

export interface Hadith {
  id: string;
  arabic: string;
  english: string;
  narrator: string;
  reference: string;
  collection: string;
  bookNumber: number;
  moods: Mood[];
  themes: string[];
  authenticity: 'sahih' | 'hasan' | 'daif';
  savedAt?: number;
}

export type ContentType = 'verse' | 'hadith';

export type GuidanceContent = Verse | Hadith;

export interface AppSettings {
    notificationsEnabled: boolean;
    notificationTime: string; // HH:mm format, e.g., "08:00"
    reciter: string; // Reciter edition code, e.g., "ar.alafasy"
    darkMode: boolean;
    language: string;
    notificationFrequency: 2 | 3 | 4;
    notificationContentType: 'verse' | 'hadith' | 'both';
    quietHoursStart: string; // "HH:mm" format
    quietHoursEnd: string; // "HH:mm" format
    weekendMode: boolean;
}

export type VerseCardTemplate = 'minimal' | 'vibrant' | 'classic';
export type VerseCardSize = 'story' | 'post';

export interface VerseCardConfig {
    template: VerseCardTemplate;
    size: VerseCardSize;
}

// API Integration Types
export interface VerseReference {
    surah: number;
    verse: number;
    moods?: Mood[];
    theme?: string;
}

export interface QuranApiVerseData {
    number: number;
    text: string;
    numberInSurah: number;
    juz: number;
    manzil: number;
    page: number;
    ruku: number;
    hizbQuarter: number;
    sajda: boolean;
}

export interface QuranApiSurahData {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
}

export interface QuranApiVerseResponse {
    code: number;
    status: string;
    data: QuranApiVerseData & {
        surah: QuranApiSurahData;
        edition: {
            identifier: string;
            language: string;
            name: string;
            englishName: string;
            format: string;
            type: string;
        };
    };
}

export interface QuranApiSurahResponse {
    code: number;
    status: string;
    data: QuranApiSurahData;
}

export type ApiErrorType = 'network' | 'timeout' | 'validation' | 'not_found' | 'unknown';

export interface ApiError {
    type: ApiErrorType;
    message: string;
    originalError?: Error;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
