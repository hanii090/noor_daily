import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import userIdentityService from './userIdentityService';
import offlineQueueService from './offlineQueueService';
import { Verse, Hadith, Mood, ContentType, GuidanceContent } from '../types';

export interface HistoryDay {
    date: string; // YYYY-MM-DD
    entries: HistoryEntry[];
}

export interface HistoryEntry {
    content: GuidanceContent;
    type: ContentType;
    mood?: Mood;
    timestamp: number;
}

// Local cache keys
const CACHE_PREFIX = '@noor_history_cache_';
const CACHE_DAYS = 7; // Keep 7 days in local cache

class HistoryService {
    /**
     * Save content to history
     * Uses Supabase for persistence with offline queue fallback
     */
    async saveToHistory(content: GuidanceContent, type: ContentType, date: Date, mood?: Mood): Promise<void> {
        try {
            // Validate inputs
            if (!content || !content.id) {
                throw new Error('Invalid content: missing content or content.id');
            }

            const dateKey = this.formatDateKey(date);

            __DEV__ && console.log('[HistoryService] Saving to cloud:', {
                dateKey,
                contentId: content.id,
                type,
                mood,
            });

            // Get user ID
            const userId = await userIdentityService.getUserId();

            // Prepare data for Supabase
            const historyData = {
                user_id: userId,
                date: dateKey,
                content_id: content.id,
                content_type: type,
                content_data: content, // Store full content for display
                mood: mood || null,
                timestamp: new Date().toISOString(),
            };

            // Try to save to Supabase
            try {
                const { error } = await supabase
                    .from('history_entries')
                    .insert(historyData);

                if (error) {
                    // Check if it's a duplicate (unique constraint violation)
                    if (error.code === '23505') {
                        __DEV__ && console.log('[HistoryService] Entry already exists');
                        return;
                    }
                    throw error;
                }

                __DEV__ && console.log('[HistoryService] Saved to cloud successfully');
            } catch (supabaseError) {
                // If offline or error, queue the operation
                console.warn('[HistoryService] Cloud save failed, queuing:', supabaseError);
                await offlineQueueService.enqueue({
                    type: 'history_save',
                    data: historyData,
                });
            }

            // Also save to local cache (last 7 days)
            await this.saveToCacheAsync(dateKey, content, type, mood);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[HistoryService] Save failed:', errorMessage);

            // Alert user
            Alert.alert(
                'History Save Error',
                'Failed to save to history. The entry will be synced when you\'re back online.',
                [{ text: 'OK' }]
            );
        }
    }

    /**
     * Get history for a specific date
     * Tries cache first, then Supabase
     */
    async getHistoryForDate(date: Date): Promise<HistoryEntry[]> {
        try {
            const dateKey = this.formatDateKey(date);

            // Try cache first
            const cached = await this.getFromCache(dateKey);
            if (cached) {
                __DEV__ && console.log('[HistoryService] Loaded from cache:', dateKey);
                return cached;
            }

            // Fetch from Supabase
            const userId = await userIdentityService.getUserId();

            const { data, error } = await supabase
                .from('history_entries')
                .select('*')
                .eq('user_id', userId)
                .eq('date', dateKey)
                .order('timestamp', { ascending: true });

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            // Convert to HistoryEntry format with full content from content_data
            const entries: HistoryEntry[] = data.map(row => ({
                content: row.content_data || { id: row.content_id } as GuidanceContent,
                type: row.content_type as ContentType,
                mood: row.mood as Mood | undefined,
                timestamp: new Date(row.timestamp).getTime(),
            }));

            return entries;
        } catch (error) {
            console.error('[HistoryService] Get history for date failed:', error);
            return [];
        }
    }

    /**
     * Get all history entries grouped by date
     */
    async getAllHistory(): Promise<HistoryDay[]> {
        try {
            const userId = await userIdentityService.getUserId();

            const { data, error } = await supabase
                .from('history_entries')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .order('timestamp', { ascending: true });

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            // Group by date
            const grouped = new Map<string, HistoryEntry[]>();

            for (const row of data) {
                if (!grouped.has(row.date)) {
                    grouped.set(row.date, []);
                }

                grouped.get(row.date)!.push({
                    content: row.content_data || { id: row.content_id } as GuidanceContent,
                    type: row.content_type as ContentType,
                    mood: row.mood as Mood | undefined,
                    timestamp: new Date(row.timestamp).getTime(),
                });
            }

            const history: HistoryDay[] = Array.from(grouped.entries()).map(([date, entries]) => ({
                date,
                entries,
            }));

            return history.sort((a, b) => b.date.localeCompare(a.date));
        } catch (error) {
            console.error('[HistoryService] Get all history failed:', error);

            Alert.alert(
                'History Load Error',
                'Unable to load history. Please check your internet connection.',
                [{ text: 'OK' }]
            );

            return [];
        }
    }

    /**
     * Get array of dates that have history entries
     */
    async getHistoryDates(): Promise<string[]> {
        try {
            const userId = await userIdentityService.getUserId();

            const { data, error } = await supabase
                .from('history_entries')
                .select('date')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (error) {
                throw error;
            }

            // Get unique dates
            const uniqueDates = Array.from(new Set(data?.map(row => row.date) || []));
            return uniqueDates;
        } catch (error) {
            console.error('[HistoryService] Get history dates failed:', error);
            return [];
        }
    }

    /**
     * Clear all history
     */
    async clearHistory(): Promise<void> {
        try {
            const userId = await userIdentityService.getUserId();

            const { error } = await supabase
                .from('history_entries')
                .delete()
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            // Also clear local cache
            await this.clearLocalCache();

            __DEV__ && console.log('[HistoryService] History cleared');
        } catch (error) {
            console.error('[HistoryService] Clear history failed:', error);
        }
    }

    /**
     * Get history statistics
     */
    async getHistoryStats(): Promise<{
        totalDays: number;
        currentStreak: number;
        moodCounts: Record<Mood, number>;
    }> {
        try {
            const userId = await userIdentityService.getUserId();

            // Get all unique dates
            const { data: dates, error: datesError } = await supabase
                .from('history_entries')
                .select('date')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (datesError) throw datesError;

            const uniqueDates = Array.from(new Set(dates?.map(d => d.date) || [])).sort().reverse();
            const totalDays = uniqueDates.length;

            if (totalDays === 0) {
                return { totalDays: 0, currentStreak: 0, moodCounts: {} as Record<Mood, number> };
            }

            // Calculate current streak
            let currentStreak = 0;
            const today = new Date();
            let checkDate = new Date(today);
            checkDate.setHours(0, 0, 0, 0);

            let hasToday = uniqueDates.includes(this.formatDateKey(checkDate));

            if (!hasToday) {
                checkDate.setDate(checkDate.getDate() - 1);
                const hasYesterday = uniqueDates.includes(this.formatDateKey(checkDate));
                if (!hasYesterday) {
                    currentStreak = 0;
                } else {
                    while (uniqueDates.includes(this.formatDateKey(checkDate))) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    }
                }
            } else {
                while (uniqueDates.includes(this.formatDateKey(checkDate))) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            }

            // Get mood counts
            const { data: moods, error: moodsError } = await supabase
                .from('history_entries')
                .select('mood')
                .eq('user_id', userId)
                .not('mood', 'is', null);

            if (moodsError) throw moodsError;

            const moodCounts: Record<string, number> = {};
            moods?.forEach(row => {
                if (row.mood) {
                    moodCounts[row.mood] = (moodCounts[row.mood] || 0) + 1;
                }
            });

            return {
                totalDays,
                currentStreak,
                moodCounts: moodCounts as Record<Mood, number>,
            };
        } catch (error) {
            console.error('[HistoryService] Get stats failed:', error);
            return {
                totalDays: 0,
                currentStreak: 0,
                moodCounts: {} as Record<Mood, number>,
            };
        }
    }

    // =====================================================
    // PRIVATE HELPERS
    // =====================================================

    /**
     * Save to local cache (AsyncStorage)
     */
    private async saveToCacheAsync(dateKey: string, content: GuidanceContent, type: ContentType, mood?: Mood): Promise<void> {
        try {
            const cacheKey = `${CACHE_PREFIX}${dateKey}`;
            const existing = await AsyncStorage.getItem(cacheKey);

            let entries: HistoryEntry[] = [];
            if (existing) {
                try {
                    entries = JSON.parse(existing);
                } catch {
                    entries = [];
                }
            }

            // Check if already cached
            if (entries.some(e => e.content?.id === content.id)) {
                return;
            }

            entries.push({
                content,
                type,
                mood,
                timestamp: Date.now(),
            });

            await AsyncStorage.setItem(cacheKey, JSON.stringify(entries));
        } catch (error) {
            // Cache save is non-critical, just log
            __DEV__ && console.warn('[HistoryService] Cache save failed:', error);
        }
    }

    /**
     * Get from local cache
     */
    private async getFromCache(dateKey: string): Promise<HistoryEntry[] | null> {
        try {
            const cacheKey = `${CACHE_PREFIX}${dateKey}`;
            const cached = await AsyncStorage.getItem(cacheKey);

            if (!cached) return null;

            return JSON.parse(cached) as HistoryEntry[];
        } catch (error) {
            __DEV__ && console.warn('[HistoryService] Cache read failed:', error);
            return null;
        }
    }

    /**
     * Clear local cache
     */
    private async clearLocalCache(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.warn('[HistoryService] Cache clear failed:', error);
        }
    }

    /**
     * Format date to YYYY-MM-DD string
     */
    private formatDateKey(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export default new HistoryService();
