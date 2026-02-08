import axios, { AxiosError } from 'axios';
import { QuranApiVerseResponse, QuranApiSurahResponse, ApiError, Verse, ReminderApiVerse } from '../types';
import cacheService from './cacheService';
import reminderApiService from './reminderApiService';

const REQUEST_TIMEOUT = 10000; // 10 seconds

class QuranApiService {
    /**
     * Create API error from exception
     */
    private createApiError(error: any): ApiError {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (!axiosError.response) {
                return {
                    type: 'network',
                    message: 'Network error. Please check your internet connection.',
                    originalError: error,
                };
            }

            if (axiosError.code === 'ECONNABORTED') {
                return {
                    type: 'timeout',
                    message: 'Request timeout. Please try again.',
                    originalError: error,
                };
            }

            if (axiosError.response.status === 404) {
                return {
                    type: 'not_found',
                    message: 'Verse not found.',
                    originalError: error,
                };
            }
        }

        return {
            type: 'unknown',
            message: 'An unexpected error occurred.',
            originalError: error as Error,
        };
    }

    /**
     * Get surah information (now powered by reminder.dev chapters list)
     */
    async getSurahInfo(surahNumber: number): Promise<QuranApiSurahResponse> {
        const cacheKey = cacheService.getSurahKey(surahNumber);
        const cached = await cacheService.get<QuranApiSurahResponse>(cacheKey);
        if (cached) return cached;

        try {
            const chapters = await reminderApiService.getChapterList();
            const ch = chapters.find(c => c.number === surahNumber);
            if (!ch) throw new Error(`Surah ${surahNumber} not found`);

            const response: QuranApiSurahResponse = {
                code: 200,
                status: 'OK',
                data: {
                    number: ch.number,
                    name: ch.name,
                    englishName: ch.english || ch.name,
                    englishNameTranslation: ch.english || ch.name,
                    revelationType: '',
                    numberOfAyahs: ch.verse_count,
                },
            };

            await cacheService.set(cacheKey, response);
            return response;
        } catch (error) {
            throw this.createApiError(error);
        }
    }

    /**
     * Convert reminder.dev verse to our Verse object
     */
    private reminderVerseToVerse(
        apiVerse: ReminderApiVerse,
        surahName: string,
        moods: string[] = [],
        theme: string = ''
    ): Verse {
        return {
            id: `${apiVerse.chapter}:${apiVerse.number}`,
            surah: surahName,
            surahNumber: apiVerse.chapter,
            verseNumber: apiVerse.number,
            arabic: apiVerse.arabic,
            english: apiVerse.text,
            moods: moods as any,
            theme,
        };
    }

    /**
     * Get verse by surah and verse number (cache-first, powered by reminder.dev)
     */
    async getVerseData(
        surahNumber: number,
        verseNumber: number,
        moods: string[] = [],
        theme: string = ''
    ): Promise<Verse> {
        // Check cache first
        const cacheKey = cacheService.getVerseKey(surahNumber, verseNumber);
        const cached = await cacheService.get<Verse>(cacheKey);

        if (cached) {
            if (moods.length > 0) {
                cached.moods = moods as any;
            }
            if (theme) {
                cached.theme = theme;
            }
            return cached;
        }

        try {
            // Fetch chapter data (cached) to get both verse and surah name
            const chapterData = await reminderApiService.getChapter(surahNumber);
            const apiVerse = chapterData.verses?.find(v => v.number === verseNumber);

            if (!apiVerse) {
                throw new Error(`Verse ${surahNumber}:${verseNumber} not found`);
            }

            const surahName = chapterData.english || chapterData.name || `Surah ${surahNumber}`;
            const verseWithChapter = { ...apiVerse, chapter: surahNumber };

            const verse = this.reminderVerseToVerse(verseWithChapter, surahName, moods, theme);

            // Cache the verse
            await cacheService.set(cacheKey, verse);

            return verse;
        } catch (error) {
            throw this.createApiError(error);
        }
    }
}

export default new QuranApiService();
