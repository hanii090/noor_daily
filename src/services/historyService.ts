import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import userIdentityService from './userIdentityService';
import offlineQueueService from './offlineQueueService';
import { Verse, Hadith, Mood, ContentType, GuidanceContent } from '../types';
import logger from '../utils/logger';
import metricsService from '../utils/metrics';

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
        const startTime = Date.now();
        try {
            // Validate inputs
            if (!content || !content.id) {
                throw new Error('Invalid content: missing content or content.id');
            }

            const dateKey = this.formatDateKey(date);
            const userId = await userIdentityService.getUserId();

            logger.debug('Saving to history', {
                service: 'historyService',
                action: 'saveToHistory',
                userId,
                metadata: { dateKey, contentId: content.id, type, mood }
            });

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

                logger.info('History saved successfully', {
                    service: 'historyService',
                    action: 'saveToHistory',
                    userId,
                    metadata: { contentType: type }
                });
            } catch (supabaseError) {
                // If offline or error, queue the operation
                logger.warn('Cloud save failed, queuing', {
                    service: 'historyService',
                    action: 'saveToHistory',
                    userId,
                    metadata: { error: supabaseError instanceof Error ? supabaseError.message : 'Unknown' }
                });

                await offlineQueueService.enqueue({
                    type: 'history_save',
                    data: historyData,
                });
            }

            // Also save to local cache (last 7 days)
            await this.saveToCacheAsync(dateKey, content, type, mood);

            // Track performance
            await metricsService.trackPerformance('history.save', startTime, { type, mood });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const userId = await userIdentityService.getUserId().catch(() => 'unknown');

            logger.error('History save failed', {
                service: 'historyService',
                action: 'saveToHistory',
                userId,
                metadata: { error: errorMessage }
            });

            // Track failed operation
            await metricsService.trackPerformance('history.save', startTime, { error: errorMessage });

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
     * Uses database function for efficient server-side calculation
     */
    async getHistoryStats(): Promise<{
        totalDays: number;
        currentStreak: number;
        moodCounts: Record<Mood, number>;
    }> {
        const startTime = Date.now();
        try {
            const userId = await userIdentityService.getUserId();

            // Use database function for streak calculation (much faster!)
            const { data: streakData, error: streakError } = await supabase
                .rpc('get_user_streak', { p_user_id: userId });

            if (streakError) {
                logger.error('Failed to get streak stats', {
                    service: 'historyService',
                    action: 'getHistoryStats',
                    userId,
                    metadata: { error: streakError.message }
                });
                throw streakError;
            }

            // Use database function for mood statistics
            const { data: moodData, error: moodError } = await supabase
                .rpc('get_mood_statistics', { p_user_id: userId });

            if (moodError) {
                logger.warn('Failed to get mood stats', {
                    service: 'historyService',
                    action: 'getHistoryStats',
                    userId,
                    metadata: { error: moodError.message }
                });
            }

            // Convert mood data to Record format
            const moodCounts: Record<Mood, number> = {} as Record<Mood, number>;
            if (moodData) {
                moodData.forEach((item: { mood: Mood; count: string }) => {
                    moodCounts[item.mood] = parseInt(item.count, 10);
                });
            }

            const stats = streakData[0] || { current_streak: 0, longest_streak: 0, total_days: 0 };

            logger.debug('Stats calculated', {
                service: 'historyService',
                action: 'getHistoryStats',
                userId,
                metadata: {
                    totalDays: stats.total_days,
                    currentStreak: stats.current_streak,
                    moodCount: Object.keys(moodCounts).length
                }
            });

            // Track performance
            await metricsService.trackPerformance('history.getStats', startTime);

            return {
                totalDays: stats.total_days,
                currentStreak: stats.current_streak,
                moodCounts
            };
        } catch (error) {
            const userId = await userIdentityService.getUserId().catch(() => 'unknown');
            logger.error('Get stats failed', {
                service: 'historyService',
                action: 'getHistoryStats',
                userId,
                metadata: { error: error instanceof Error ? error.message : 'Unknown' }
            });

            await metricsService.trackPerformance('history.getStats', startTime, {
                error: error instanceof Error ? error.message : 'Unknown'
            });

            return {
                totalDays: 0,
                currentStreak: 0,
                moodCounts: {} as Record<Mood, number>
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
