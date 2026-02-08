import AsyncStorage from '@react-native-async-storage/async-storage';
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
            const dateKey = this.formatDateKey(date);
            const existingData = await AsyncStorage.getItem(`${HISTORY_PREFIX}${dateKey}`);
            
            let entries: HistoryEntry[] = [];
            if (existingData) {
                const parsed = JSON.parse(existingData);
                entries = Array.isArray(parsed) ? parsed : [];
            }

            // Check if this specific content is already in today's history
            if (entries.some(e => e.content.id === content.id)) {
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
                `${HISTORY_PREFIX}${dateKey}`,
                JSON.stringify(entries)
            );

            // Prune old history periodically (1% chance each save)
            if (Math.random() < 0.01) {
                this.pruneOldHistory().catch(console.error);
            }
        } catch (error) {
            console.error('Error saving to history:', error);
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
            const historyKeys = keys.filter(key => key.startsWith(HISTORY_PREFIX));

            const entries = await AsyncStorage.multiGet(historyKeys);
            const history: HistoryDay[] = [];

            for (const [key, value] of entries) {
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        history.push({
                            date: key.replace(HISTORY_PREFIX, ''),
                            entries: Array.isArray(parsed) ? parsed : []
                        });
                    } catch (e) {
                        console.error('Error parsing history entry:', e);
                    }
                }
            }

            return history.sort((a, b) => b.date.localeCompare(a.date));
        } catch (error) {
            console.error('Error getting all history:', error);
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
                    while (true) {
                        const k = this.formatDateKey(checkDate);
                        if (history.some(h => h.date === k)) {
                            currentStreak++;
                            checkDate.setDate(checkDate.getDate() - 1);
                        } else {
                            break;
                        }
                    }
                }
            } else {
                // Start counting from today
                while (true) {
                    const k = this.formatDateKey(checkDate);
                    if (history.some(h => h.date === k)) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        break;
                    }
                }
            }

            // Mood counts
            const moodCounts: Record<string, number> = {};
            for (const day of history) {
                for (const entry of day.entries) {
                    if (entry.mood) {
                        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
                    }
                }
            }

            return {
                totalDays,
                currentStreak,
                moodCounts: moodCounts as Record<Mood, number>,
            };
        } catch (error) {
            console.error('Error getting history stats:', error);
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
