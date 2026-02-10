import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { STORAGE_KEYS } from '../utils/storageMigration';
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

const HISTORY_PREFIX = STORAGE_KEYS.HISTORY_PREFIX;
const MAX_HISTORY_DAYS = 90;

class HistoryService {
    /**
     * Save content to history for a specific date
     */
    async saveToHistory(content: GuidanceContent, type: ContentType, date: Date, mood?: Mood): Promise<void> {
        try {
            // Validate inputs
            if (!content || !content.id) {
                throw new Error('Invalid content: missing content or content.id');
            }

            const dateKey = this.formatDateKey(date);
            const storageKey = `${HISTORY_PREFIX}${dateKey}`;
            const existingData = await AsyncStorage.getItem(storageKey);

            let entries: HistoryEntry[] = [];
            if (existingData) {
                try {
                    const parsed = JSON.parse(existingData);
                    entries = Array.isArray(parsed) ? parsed : [];
                } catch (parseError) {
                    // Corrupted data - start fresh but log the issue
                    __DEV__ && console.warn('Corrupted history data, resetting for date:', dateKey);
                    entries = [];
                }
            }

            // Check if this specific content is already in today's history
            if (entries.some(e => e.content?.id === content.id)) {
                return;
            }

            const newEntry: HistoryEntry = {
                content,
                type,
                mood,
                timestamp: Date.now(),
            };

            entries.push(newEntry);

            await AsyncStorage.setItem(
                storageKey,
                JSON.stringify(entries)
            );

            // Prune old history periodically (1% chance each save)
            if (Math.random() < 0.01) {
                this.pruneOldHistory().catch(err => {
                    __DEV__ && console.error('Error pruning history:', err);
                });
            }
        } catch (error) {
            // Production-safe error logging
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __DEV__ && console.error('Error saving to history:', errorMessage, error);

            // Alert user in production for critical failures
            if (!__DEV__) {
                Alert.alert(
                    'History Save Failed',
                    'Failed to save to history. Your progress is still tracked, but history may not reflect recent activity.',
                    [{ text: 'OK' }]
                );
            }
        }
    }

    /**
     * Get history for a specific date
     */
    async getHistoryForDate(date: Date): Promise<HistoryEntry[]> {
        try {
            const dateKey = this.formatDateKey(date);
            const data = await AsyncStorage.getItem(`${HISTORY_PREFIX}${dateKey}`);

            if (!data) return [];

            return JSON.parse(data) as HistoryEntry[];
        } catch (error) {
            console.error('Error getting history for date:', error);
            return [];
        }
    }

    /**
     * Get all history entries grouped by date
     */
    async getAllHistory(): Promise<HistoryDay[]> {
        try {
            const keys = await AsyncStorage.getAllKeys();

            if (!keys || keys.length === 0) {
                return [];
            }

            const historyKeys = keys.filter(key => key.startsWith(HISTORY_PREFIX));

            if (historyKeys.length === 0) {
                return [];
            }

            const entries = await AsyncStorage.multiGet(historyKeys);
            const history: HistoryDay[] = [];

            for (const [key, value] of entries) {
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        // Validate parsed data
                        if (parsed && Array.isArray(parsed)) {
                            history.push({
                                date: key.replace(HISTORY_PREFIX, ''),
                                entries: parsed
                            });
                        }
                    } catch (parseError) {
                        __DEV__ && console.warn('Error parsing history entry for key:', key, parseError);
                        // Skip corrupted entries instead of failing
                    }
                }
            }

            return history.sort((a, b) => b.date.localeCompare(a.date));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __DEV__ && console.error('Error getting all history:', errorMessage, error);

            // In production, alert user for critical failures
            if (!__DEV__) {
                Alert.alert(
                    'History Load Failed',
                    'Unable to load your history. Please try restarting the app.',
                    [{ text: 'OK' }]
                );
            }
            return [];
        }
    }

    /**
     * Get array of dates that have history entries
     */
    async getHistoryDates(): Promise<string[]> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const historyKeys = keys.filter(key => key.startsWith(HISTORY_PREFIX));

            return historyKeys.map(key => key.replace(HISTORY_PREFIX, ''));
        } catch (error) {
            console.error('Error getting history dates:', error);
            return [];
        }
    }

    /**
     * Clear all history
     */
    async clearHistory(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const historyKeys = keys.filter(key => key.startsWith(HISTORY_PREFIX));

            await AsyncStorage.multiRemove(historyKeys);
        } catch (error) {
            console.error('Error clearing history:', error);
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
            const history = await this.getAllHistory();

            // Total days
            const totalDays = history.length;

            if (totalDays === 0) {
                return { totalDays: 0, currentStreak: 0, moodCounts: {} as Record<Mood, number> };
            }

            // Current streak
            let currentStreak = 0;
            const today = new Date();

            // Validate date is valid
            if (isNaN(today.getTime())) {
                throw new Error('Invalid date');
            }

            let checkDate = new Date(today);

            // Normalize checkDate to start of day
            checkDate.setHours(0, 0, 0, 0);

            // Check today first
            let dateKey = this.formatDateKey(checkDate);
            let hasToday = history.some(h => h.date === dateKey);

            if (!hasToday) {
                // If no entry today, check if there was one yesterday to continue the streak
                checkDate.setDate(checkDate.getDate() - 1);
                dateKey = this.formatDateKey(checkDate);
                const hasYesterday = history.some(h => h.date === dateKey);
                if (!hasYesterday) {
                    currentStreak = 0;
                } else {
                    // Start counting from yesterday
                    let safetyCounter = 0;
                    while (safetyCounter < 365) { // Prevent infinite loops
                        const k = this.formatDateKey(checkDate);
                        if (history.some(h => h.date === k)) {
                            currentStreak++;
                            checkDate.setDate(checkDate.getDate() - 1);
                            safetyCounter++;
                        } else {
                            break;
                        }
                    }
                }
            } else {
                // Start counting from today
                let safetyCounter = 0;
                while (safetyCounter < 365) { // Prevent infinite loops
                    const k = this.formatDateKey(checkDate);
                    if (history.some(h => h.date === k)) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                        safetyCounter++;
                    } else {
                        break;
                    }
                }
            }

            // Mood counts
            const moodCounts: Record<string, number> = {};
            for (const day of history) {
                if (day.entries && Array.isArray(day.entries)) {
                    for (const entry of day.entries) {
                        if (entry && entry.mood) {
                            moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
                        }
                    }
                }
            }

            return {
                totalDays,
                currentStreak,
                moodCounts: moodCounts as Record<Mood, number>,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __DEV__ && console.error('Error getting history stats:', errorMessage, error);
            return {
                totalDays: 0,
                currentStreak: 0,
                moodCounts: {} as Record<Mood, number>,
            };
        }
    }

    /**
     * Prune history older than MAX_HISTORY_DAYS
     */
    async pruneOldHistory(): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);
            const cutoffKey = this.formatDateKey(cutoffDate);

            const keys = await AsyncStorage.getAllKeys();
            const historyKeys = keys.filter(key => key.startsWith(HISTORY_PREFIX));
            const oldKeys = historyKeys.filter(key => {
                const date = key.replace(HISTORY_PREFIX, '');
                return date < cutoffKey;
            });

            if (oldKeys.length > 0) {
                await AsyncStorage.multiRemove(oldKeys);
            }
        } catch (error) {
            console.error('Error pruning old history:', error);
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
