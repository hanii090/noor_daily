import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheEntry } from '../types';

const CACHE_PREFIX = 'noor_cache_';
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

class CacheService {
    /**
     * Generate cache key with prefix
     */
    private getKey(key: string): string {
        return `${CACHE_PREFIX}${key}`;
    }

    /**
     * Get cached data if valid
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cacheKey = this.getKey(key);
            const cached = await AsyncStorage.getItem(cacheKey);

            if (!cached) {
                return null;
            }

            const entry: CacheEntry<T> = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is expired
            if (now - entry.timestamp > entry.ttl) {
                // Clean up expired cache
                await this.remove(key);
                return null;
            }

            return entry.data;
        } catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set cache data with TTL
     */
    async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
        try {
            const cacheKey = this.getKey(key);
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl,
            };

            await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (error) {
            console.warn('Cache set error:', error);
        }
    }

    /**
     * Check if valid cache exists for key
     */
    async has(key: string): Promise<boolean> {
        const data = await this.get(key);
        return data !== null;
    }

    /**
     * Remove cache entry
     */
    async remove(key: string): Promise<void> {
        try {
            const cacheKey = this.getKey(key);
            await AsyncStorage.removeItem(cacheKey);
        } catch (error) {
            console.warn('Cache remove error:', error);
        }
    }

    /**
     * Clear all cache (for debugging/testing)
     */
    async clear(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.warn('Cache clear error:', error);
        }
    }

    /**
     * Generate cache key for verse
     */
    getVerseKey(surah: number, verse: number): string {
        return `verse_${surah}_${verse}`;
    }

    /**
     * Generate cache key for surah info
     */
    getSurahKey(surah: number): string {
        return `surah_info_${surah}`;
    }

    /**
     * Generate cache key for AI insight
     */
    getAiInsightKey(contentId: string, type: string): string {
        return `ai_insight_${type}_${contentId}`;
    }

    /**
     * Generate cache key for hadith mood classification
     */
    getHadithMoodKey(hadithId: string): string {
        return `ai_mood_hadith_${hadithId}`;
    }

    /**
     * Generate cache key for Names of Allah
     */
    getNamesKey(): string {
        return 'reminder_names_of_allah';
    }

    /**
     * Generate cache key for daily reminder
     */
    getDailyReminderKey(): string {
        return 'reminder_daily';
    }
}

export default new CacheService();
