import axios from 'axios';
import {
    ReminderApiVerse,
    ReminderApiChapter,
    ReminderApiHadith,
    ReminderApiHadithBook,
    ReminderApiHadithCollection,
    NameOfAllah,
    ReminderApiDaily,
} from '../types';
import cacheService from './cacheService';

const API_BASE = 'https://reminder.dev/api';
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// Cache TTLs
const CACHE_TTL_QURAN = 90 * 24 * 60 * 60 * 1000;   // 90 days (Quran never changes)
const CACHE_TTL_HADITH = 90 * 24 * 60 * 60 * 1000;   // 90 days
const CACHE_TTL_NAMES = 90 * 24 * 60 * 60 * 1000;     // 90 days
const CACHE_TTL_DAILY = 60 * 60 * 1000;                // 1 hour
const CACHE_TTL_LATEST = 30 * 60 * 1000;               // 30 minutes

class ReminderApiService {
    /**
     * Generic fetch with retry + caching
     */
    private async fetchWithCache<T>(
        url: string,
        cacheKey: string,
        ttl: number,
        attempt: number = 1
    ): Promise<T> {
        // Check cache first
        const cached = await cacheService.get<T>(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get<T>(url, { timeout: REQUEST_TIMEOUT });
            // Cache the result
            await cacheService.set(cacheKey, response.data, ttl);
            return response.data;
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                return this.fetchWithCache<T>(url, cacheKey, ttl, attempt + 1);
            }
            throw error;
        }
    }

    // ── Quran Endpoints ──

    /**
     * Get a single verse by chapter and verse number.
     * Fetches the whole chapter (cached) and extracts the verse for reliability.
     */
    async getVerse(chapter: number, verse: number): Promise<ReminderApiVerse> {
        // Check individual verse cache first
        const verseCacheKey = `reminder_verse_${chapter}_${verse}`;
        const cachedVerse = await cacheService.get<ReminderApiVerse>(verseCacheKey);
        if (cachedVerse) return cachedVerse;

        // Fetch the whole chapter (this gets cached too)
        const chapterData = await this.getChapter(chapter);

        // Find the verse — API uses 1-based verse numbers
        const found = chapterData.verses?.find(v => v.number === verse);
        if (!found) {
            throw new Error(`Verse ${chapter}:${verse} not found in chapter data`);
        }

        // Ensure chapter number is set on the verse
        const result: ReminderApiVerse = { ...found, chapter };

        // Cache the individual verse
        await cacheService.set(verseCacheKey, result, CACHE_TTL_QURAN);
        return result;
    }

    /**
     * Get an entire chapter
     */
    async getChapter(chapter: number): Promise<ReminderApiChapter> {
        const url = `${API_BASE}/quran/${chapter}`;
        const cacheKey = `reminder_chapter_${chapter}`;
        return this.fetchWithCache<ReminderApiChapter>(url, cacheKey, CACHE_TTL_QURAN);
    }

    /**
     * Get list of all chapters
     */
    async getChapterList(): Promise<{ name: string; number: number; english: string; verse_count: number }[]> {
        const url = `${API_BASE}/quran/chapters`;
        const cacheKey = 'reminder_chapters_list';
        return this.fetchWithCache(url, cacheKey, CACHE_TTL_QURAN);
    }

    // ── Hadith Endpoints ──

    /**
     * Get a specific hadith book (by book number)
     */
    async getHadithBook(bookNumber: number): Promise<ReminderApiHadithBook> {
        const url = `${API_BASE}/hadith/${bookNumber}`;
        const cacheKey = `reminder_hadith_book_${bookNumber}`;
        return this.fetchWithCache<ReminderApiHadithBook>(url, cacheKey, CACHE_TTL_HADITH);
    }

    /**
     * Get a random hadith from a random book
     * Fetches a lightweight book and picks a random hadith from it
     */
    async getRandomHadith(): Promise<{ hadith: ReminderApiHadith; bookName: string }> {
        // Sahih al-Bukhari has ~97 books. Pick a random one.
        const bookNum = Math.floor(Math.random() * 97) + 1;
        try {
            const book = await this.getHadithBook(bookNum);
            if (book.hadiths && book.hadiths.length > 0) {
                const idx = Math.floor(Math.random() * book.hadiths.length);
                return { hadith: book.hadiths[idx], bookName: book.name };
            }
        } catch {
            // Fallback to book 1 if random book fails
        }
        const fallback = await this.getHadithBook(1);
        const idx = Math.floor(Math.random() * fallback.hadiths.length);
        return { hadith: fallback.hadiths[idx], bookName: fallback.name };
    }

    /**
     * Get a specific hadith by book number and hadith number
     */
    async getHadithByNumber(bookNumber: number, hadithNumber: number): Promise<{ hadith: ReminderApiHadith; bookName: string } | null> {
        try {
            const book = await this.getHadithBook(bookNumber);
            const hadith = book.hadiths.find(h => h.number === hadithNumber);
            if (hadith) {
                return { hadith, bookName: book.name };
            }
            return null;
        } catch {
            return null;
        }
    }

    // ── Names of Allah ──

    /**
     * Get all 99 Names of Allah
     */
    async getNamesOfAllah(): Promise<NameOfAllah[]> {
        const url = `${API_BASE}/names`;
        const cacheKey = 'reminder_names_of_allah';
        return this.fetchWithCache<NameOfAllah[]>(url, cacheKey, CACHE_TTL_NAMES);
    }

    /**
     * Get a single Name of Allah by number (1-99)
     */
    async getNameOfAllah(number: number): Promise<NameOfAllah | null> {
        const names = await this.getNamesOfAllah();
        return names.find(n => n.number === number) || null;
    }

    /**
     * Get today's Name of Allah (deterministic by day)
     */
    async getDailyNameOfAllah(): Promise<NameOfAllah> {
        const names = await this.getNamesOfAllah();
        const today = new Date();
        const dayOfYear = Math.floor(
            (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
        );
        const index = (dayOfYear % 99) + 1;
        return names.find(n => n.number === index) || names[0];
    }

    // ── Daily / Latest ──

    /**
     * Get today's daily reminder (hadith + verse + name combo)
     */
    async getDailyReminder(): Promise<ReminderApiDaily> {
        const url = `${API_BASE}/daily`;
        const cacheKey = 'reminder_daily';
        return this.fetchWithCache<ReminderApiDaily>(url, cacheKey, CACHE_TTL_DAILY);
    }

    /**
     * Get daily reminder for a specific date (YYYY-MM-DD)
     */
    async getDailyReminderByDate(date: string): Promise<ReminderApiDaily> {
        const url = `${API_BASE}/daily/${date}`;
        const cacheKey = `reminder_daily_${date}`;
        return this.fetchWithCache<ReminderApiDaily>(url, cacheKey, CACHE_TTL_QURAN);
    }

    /**
     * Get latest hourly reminder
     */
    async getLatestReminder(): Promise<ReminderApiDaily> {
        const url = `${API_BASE}/latest`;
        const cacheKey = 'reminder_latest';
        return this.fetchWithCache<ReminderApiDaily>(url, cacheKey, CACHE_TTL_LATEST);
    }

    // ── Search ──

    /**
     * Search using the LLM-powered search endpoint
     */
    async search(query: string): Promise<string> {
        const url = `${API_BASE}/search`;
        try {
            const response = await axios.get(url, {
                params: { q: query },
                timeout: 30000,
            });
            return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        } catch (error) {
            throw new Error('Search failed. Please try again.');
        }
    }
}

export default new ReminderApiService();
