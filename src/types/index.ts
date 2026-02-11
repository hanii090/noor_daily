export type Mood = 'grateful' | 'peace' | 'strength' | 'guidance' | 'celebrating' | 'anxious' | 'sad' | 'hopeful';

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

export type ContentType = 'verse' | 'hadith' | 'name';

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
    userName: string;
    pushToken?: string;
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

// ── 30-Day Journey Types ──

export type JourneyTheme = 'gratitude' | 'patience' | 'wisdom' | 'peace' | 'purpose';

export interface JourneyBadge {
    id: string;
    name: string;
    emoji: string;
    dayRequired: number;
}

export interface JourneyDay {
    day: number;
    theme: JourneyTheme;
    themeTitle: string;
    verseRef: { surah: number; verse: number };
    hadithId: string;
    tafsirBrief: string;
    reflectionQuestion: string;
    dailyChallenge: string;
    badge?: JourneyBadge;
}

export interface JourneyProgress {
    startedAt: string;
    completedDays: number[];
    completionDates: Record<number, string>; // day → ISO date string of when it was completed
    journalEntries: Record<number, string>;
    currentStreak: number;
    longestStreak: number;
    streakFreezeUsed: boolean;
    completedAt?: string;
}

export type JourneyStatus = 'not_started' | 'in_progress' | 'completed';

// ── Exam Mode Types ──

export type ExamTiming = 'today' | 'tomorrow' | 'this_week';
export type ExamSubject = 'math' | 'science' | 'language' | 'history' | 'islamic_studies' | 'other';
export type ExamFeeling = 'stressed' | 'confident' | 'tired' | 'anxious' | 'hopeful';
export type ExamPhase = 'before' | 'during_break' | 'after';

export interface ExamVerse {
    verseRef: { surah: number; verse: number };
    category: 'stress_relief' | 'focus' | 'confidence' | 'trust' | 'gratitude' | 'acceptance';
    motivationalNote: string;
    applicablePhases: ExamPhase[];
    applicableFeelings: ExamFeeling[];
}

export interface ExamSession {
    id: string;
    subject: ExamSubject;
    timing: ExamTiming;
    feeling: ExamFeeling;
    verseId: string;
    createdAt: string;
    postExamReflection?: string;
}

// ── Reminder.dev API Types ──

export interface ReminderApiVerse {
    chapter: number;
    number: number;
    text: string;
    arabic: string;
    words?: { english: string; arabic: string; transliteration: string }[];
    comments?: string;
    audio_arabic?: string;
    audio_english?: string;
}

export interface ReminderApiChapter {
    name: string;
    number: number;
    verses: ReminderApiVerse[];
    english: string;
    verse_count: number;
}

export interface ReminderApiHadith {
    number: number;
    narrator: string;
    english: string;
    arabic: string;
    chain: string;
    info: string;
    by: string;
    text: string;
}

export interface ReminderApiHadithBook {
    name: string;
    number: number;
    hadiths: ReminderApiHadith[];
}

export interface ReminderApiHadithCollection {
    name: string;
    arabic: string;
    books: ReminderApiHadithBook[];
}

export interface NameOfAllah {
    number: number;
    english: string;
    arabic: string;
    meaning: string;
    description: string;
    summary: string;
    location: string[];
}

export interface ReminderApiDaily {
    date: string;
    hadith: string;
    hijri: string;
    links: {
        hadith: string;
        name: string;
        verse: string;
    };
    message: string;
    name: string;
    updated: string;
    verse: string;
}

export interface DailyReminder {
    date: string;
    hijri: string;
    verse: {
        surahName: string;
        reference: string;
        text: string;
    };
    hadith: {
        bookName: string;
        narrator: string;
        text: string;
    };
    nameOfAllah: {
        name: string;
        arabic: string;
        meaning: string;
    };
}
