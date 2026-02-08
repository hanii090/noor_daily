import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageMigration';
import { Verse, ContentType } from '../types';
import verseService from './verseService';
import hadithService from './hadithService';

const WIDGET_CONFIG_KEY = STORAGE_KEYS.WIDGET_CONFIG;
const WIDGET_DATA_KEY = STORAGE_KEYS.WIDGET_DATA;

export interface WidgetConfig {
    contentType: 'verse' | 'hadith' | 'both';
    updateFrequency: 'daily' | '3x_daily' | 'hourly';
    theme: 'light' | 'dark' | 'auto';
    template: 'minimal' | 'classic' | 'calligraphy';
}

export interface WidgetData {
    arabic: string;
    english: string;
    reference: string;
    type: ContentType;
    updatedAt: string;
    streakCount: number;
}

const DEFAULT_CONFIG: WidgetConfig = {
    contentType: 'verse',
    updateFrequency: 'daily',
    theme: 'auto',
    template: 'minimal',
};

class WidgetService {
    /**
     * Get the current widget configuration
     */
    async getWidgetConfig(): Promise<WidgetConfig> {
        try {
            const stored = await AsyncStorage.getItem(WIDGET_CONFIG_KEY);
            if (stored) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
            }
            return DEFAULT_CONFIG;
        } catch (error) {
            console.error('Error loading widget config:', error);
            return DEFAULT_CONFIG;
        }
    }

    /**
     * Save widget configuration
     */
    async setWidgetConfig(config: Partial<WidgetConfig>): Promise<void> {
        try {
            const current = await this.getWidgetConfig();
            const updated = { ...current, ...config };
            await AsyncStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving widget config:', error);
        }
    }

    /**
     * Update the widget data with fresh content
     * Called daily or when user completes an action
     */
    async updateWidgetData(streakCount: number = 0): Promise<WidgetData> {
        try {
            const config = await this.getWidgetConfig();

            let data: WidgetData;

            const useHadith = config.contentType === 'hadith' ||
                (config.contentType === 'both' && Math.random() > 0.5);

            if (useHadith) {
                const hadith = await hadithService.getDailyHadith();
                data = {
                    arabic: hadith.arabic,
                    english: hadith.english,
                    reference: hadith.reference,
                    type: 'hadith',
                    updatedAt: new Date().toISOString(),
                    streakCount,
                };
            } else {
                const verse = await verseService.getDailyVerse();
                data = {
                    arabic: verse.arabic,
                    english: verse.english,
                    reference: `Surah ${verse.surah} — Verse ${verse.verseNumber}`,
                    type: 'verse',
                    updatedAt: new Date().toISOString(),
                    streakCount,
                };
            }

            await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Error updating widget data:', error);
            throw error;
        }
    }

    /**
     * Get the current widget data (cached)
     */
    async getWidgetData(): Promise<WidgetData | null> {
        try {
            const stored = await AsyncStorage.getItem(WIDGET_DATA_KEY);
            if (!stored) return null;
            return JSON.parse(stored) as WidgetData;
        } catch (error) {
            console.error('Error loading widget data:', error);
            return null;
        }
    }

    /**
     * Check if widget data needs refreshing (older than 24 hours)
     */
    async needsRefresh(): Promise<boolean> {
        const data = await this.getWidgetData();
        if (!data) return true;

        const updatedAt = new Date(data.updatedAt);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

        const config = await this.getWidgetConfig();
        switch (config.updateFrequency) {
            case 'hourly':
                return hoursSinceUpdate >= 1;
            case '3x_daily':
                return hoursSinceUpdate >= 8;
            case 'daily':
            default:
                return hoursSinceUpdate >= 24;
        }
    }
}

export default new WidgetService();
