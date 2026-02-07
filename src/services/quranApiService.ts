import axios, { AxiosError } from 'axios';
import { QuranApiVerseResponse, QuranApiSurahResponse, ApiError, Verse } from '../types';
import cacheService from './cacheService';
import { useAppStore } from '../store/appStore';

const API_BASE_URL = 'https://api.alquran.cloud/v1';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000; // Start with 1 second

// Translation edition mapping
const TRANSLATION_EDITIONS: Record<string, string> = {
    en: 'en.sahih',       // English - Sahih International
    ar: 'ar.alafasy',     // Arabic (with translation)
    ur: 'ur.ahmedali',    // Urdu - Ahmed Ali
    tr: 'tr.diyanet',     // Turkish - Diyanet
};

class QuranApiService {
    /**
     * Sleep utility for retry logic
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

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
     * Fetch data with retry logic
     */
    private async fetchWithRetry<T>(
        url: string,
        attempt: number = 1
    ): Promise<T> {
        try {
            const response = await axios.get<T>(url, {
                timeout: REQUEST_TIMEOUT,
            });

            // Validate response
            if (response.status !== 200) {
                throw new Error(`Invalid response status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            if (attempt < MAX_RETRY_ATTEMPTS) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.info(`Retry attempt ${attempt} after ${delay}ms...`);
                await this.sleep(delay);
                return this.fetchWithRetry<T>(url, attempt + 1);
            }

            throw this.createApiError(error);
        }
    }

    /**
     * Get single verse with specific edition
     */
    async getVerse(
        surahNumber: number,
        verseNumber: number,
        edition: string = 'ar.alafasy'
    ): Promise<QuranApiVerseResponse> {
        const url = `${API_BASE_URL}/ayah/${surahNumber}:${verseNumber}/${edition}`;
        return this.fetchWithRetry<QuranApiVerseResponse>(url);
    }

    /**
     * Get verse with both Arabic and translation in user's language
     */
    async getVerseWithTranslation(
        surahNumber: number,
        verseNumber: number
    ): Promise<{ arabic: QuranApiVerseResponse; english: QuranApiVerseResponse }> {
        // Check cache first
        const cacheKey = cacheService.getVerseKey(surahNumber, verseNumber);
        const cached = await cacheService.get<Verse>(cacheKey);

        if (cached) {
            // Return from cache - we'll construct a minimal response structure
            // This is mainly for consistency, the caller will use the cached Verse directly
            console.log(`Cache hit for ${surahNumber}:${verseNumber}`);
        }

        // Get user's language setting
        const { settings } = useAppStore.getState();
        const translationEdition = TRANSLATION_EDITIONS[settings.language] || TRANSLATION_EDITIONS.en;

        // Fetch both editions in parallel
        const [arabic, translation] = await Promise.all([
            this.getVerse(surahNumber, verseNumber, 'ar.alafasy'),
            this.getVerse(surahNumber, verseNumber, translationEdition),
        ]);

        return { arabic, english: translation };
    }

    /**
     * Get surah information
     */
    async getSurahInfo(surahNumber: number): Promise<QuranApiSurahResponse> {
        // Check cache first
        const cacheKey = cacheService.getSurahKey(surahNumber);
        const cached = await cacheService.get<QuranApiSurahResponse>(cacheKey);

        if (cached) {
            return cached;
        }

        const url = `${API_BASE_URL}/surah/${surahNumber}`;
        const response = await this.fetchWithRetry<QuranApiSurahResponse>(url);

        // Cache surah info (it never changes)
        await cacheService.set(cacheKey, response);

        return response;
    }

    /**
     * Convert API responses to Verse object
     */
    async convertToVerse(
        arabic: QuranApiVerseResponse,
        english: QuranApiVerseResponse,
        moods: string[] = [],
        theme: string = ''
    ): Promise<Verse> {
        const surahNumber = arabic.data.surah.number;
        const verseNumber = arabic.data.numberInSurah;

        const verse: Verse = {
            id: `${surahNumber}:${verseNumber}`,
            surah: arabic.data.surah.englishName,
            surahNumber,
            verseNumber,
            arabic: arabic.data.text,
            english: english.data.text,
            moods: moods as any,
            theme,
        };

        // Cache the verse
        const cacheKey = cacheService.getVerseKey(surahNumber, verseNumber);
        await cacheService.set(cacheKey, verse);

        return verse;
    }

    /**
     * Get verse by surah and verse number (cache-first)
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
            // Update moods and theme if provided
            if (moods.length > 0) {
                cached.moods = moods as any;
            }
            if (theme) {
                cached.theme = theme;
            }
            return cached;
        }

        // Fetch from API
        const { arabic, english } = await this.getVerseWithTranslation(
            surahNumber,
            verseNumber
        );

        return this.convertToVerse(arabic, english, moods, theme);
    }
}

export default new QuranApiService();
