import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Verse, Hadith, Mood, AppSettings, ContentType, GuidanceContent } from '../types';
import historyService, { HistoryDay, HistoryEntry } from '../services/historyService';
import verseService from '../services/verseService';
import hadithService from '../services/hadithService';
import aiService from '../services/aiService';
import i18n from '../i18n/config';

interface AppStore {
    // State
    onboardingCompleted: boolean;
    currentVerse: Verse | null;
    currentHadith: Hadith | null;
    selectedMood: Mood | null;
    favoriteVerses: Verse[];
    favoriteHadiths: Hadith[];
    verseHistory: HistoryDay[];
    historyStats: {
        totalDays: number;
        currentStreak: number;
        moodCounts: Record<Mood, number>;
    } | null;
    settings: AppSettings;
    dailyInspiration: {
        content: GuidanceContent;
        type: ContentType;
        reflection: string;
        date: string;
    } | null;

    // Actions
    setOnboardingCompleted: (value: boolean) => Promise<void>;
    setCurrentVerse: (verse: Verse | null) => void;
    setCurrentHadith: (hadith: Hadith | null) => void;
    setSelectedMood: (mood: Mood | null) => void;
    addToFavorites: (verse: Verse) => Promise<void>;
    removeFromFavorites: (verseId: string) => Promise<void>;
    addHadithToFavorites: (hadith: Hadith) => Promise<void>;
    removeHadithFromFavorites: (hadithId: string) => Promise<void>;
    loadFavorites: () => Promise<void>;
    saveFavorites: () => Promise<void>;
    addToHistory: (content: GuidanceContent, type: ContentType, mood?: Mood) => Promise<void>;
    loadHistory: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
    loadSettings: () => Promise<void>;
    loadOnboardingStatus: () => Promise<void>;
    clearAllFavorites: () => Promise<void>;
    loadDailyInspiration: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
    // Initial State
    onboardingCompleted: false,
    currentVerse: null,
    currentHadith: null,
    selectedMood: null,
    favoriteVerses: [],
    favoriteHadiths: [],
    verseHistory: [],
    historyStats: null,
    settings: {
        notificationTime: '08:00',
        notificationsEnabled: false,
        darkMode: false,
        language: 'en',
        reciter: 'ar.alafasy',
        notificationFrequency: 3,
        notificationContentType: 'both',
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        weekendMode: false,
    },
    dailyInspiration: null,

    // Actions
    setOnboardingCompleted: async (value: boolean) => {
        set({ onboardingCompleted: value });
        try {
            await AsyncStorage.setItem('@onboarding_completed', JSON.stringify(value));
        } catch (error) {
            console.error('Error saving onboarding status:', error);
        }
    },

    loadOnboardingStatus: async () => {
        try {
            const stored = await AsyncStorage.getItem('@onboarding_completed');
            if (stored !== null) {
                set({ onboardingCompleted: JSON.parse(stored) });
            }
        } catch (error) {
            console.error('Error loading onboarding status:', error);
        }
    },

    setCurrentVerse: (verse: Verse | null) => {
        set({ currentVerse: verse });
    },

    setCurrentHadith: (hadith: Hadith | null) => {
        set({ currentHadith: hadith });
    },

    setSelectedMood: (mood: Mood | null) => {
        set({ selectedMood: mood });
    },

    addToFavorites: async (verse: Verse) => {
        const favorites = get().favoriteVerses;
        // Check if already exists
        const exists = favorites.some((v) => v.id === verse.id);
        if (!exists) {
            // Add savedAt timestamp
            const verseWithTimestamp = { ...verse, savedAt: Date.now() };
            const newFavorites = [...favorites, verseWithTimestamp];
            set({ favoriteVerses: newFavorites });
            await get().saveFavorites();
        }
    },

    removeFromFavorites: async (verseId: string) => {
        try {
            const filtered = get().favoriteVerses.filter((v) => v.id !== verseId);
            set({ favoriteVerses: filtered });
            await get().saveFavorites();
        } catch (error) {
            console.error('Error removing from favorites:', error);
        }
    },

    addHadithToFavorites: async (hadith: Hadith) => {
        const favorites = get().favoriteHadiths;
        const exists = favorites.some((h) => h.id === hadith.id);
        if (!exists) {
            const hadithWithTimestamp = { ...hadith, savedAt: Date.now() };
            const newFavorites = [...favorites, hadithWithTimestamp];
            set({ favoriteHadiths: newFavorites });
            await get().saveFavorites();
        }
    },

    removeHadithFromFavorites: async (hadithId: string) => {
        try {
            const filtered = get().favoriteHadiths.filter((h) => h.id !== hadithId);
            set({ favoriteHadiths: filtered });
            await get().saveFavorites();
        } catch (error) {
            console.error('Error removing hadith from favorites:', error);
        }
    },

    loadFavorites: async () => {
        try {
            const storedVerses = await AsyncStorage.getItem('favorites');
            const storedHadiths = await AsyncStorage.getItem('favorite_hadiths');
            
            if (storedVerses) {
                set({ favoriteVerses: JSON.parse(storedVerses) });
            }
            if (storedHadiths) {
                set({ favoriteHadiths: JSON.parse(storedHadiths) });
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    },

    saveFavorites: async () => {
        const { favoriteVerses, favoriteHadiths } = get();
        try {
            await Promise.all([
                AsyncStorage.setItem('favorites', JSON.stringify(favoriteVerses)),
                AsyncStorage.setItem('favorite_hadiths', JSON.stringify(favoriteHadiths)),
            ]);
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    },

    addToHistory: async (content: GuidanceContent, type: ContentType, mood?: Mood) => {
        try {
            await historyService.saveToHistory(content, type, new Date(), mood);
            // Refresh history in state
            await get().loadHistory();
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    },

    loadHistory: async () => {
        try {
            const history = await historyService.getAllHistory();
            const stats = await historyService.getHistoryStats();
            set({ verseHistory: history, historyStats: stats });
        } catch (error) {
            console.error('Error loading history:', error);
        }
    },

    updateSettings: async (newSettings: Partial<AppSettings>) => {
        const { settings } = get();
        const updated = { ...settings, ...newSettings };
        set({ settings: updated });
        
        // Sync language with i18n
        if (newSettings.language && newSettings.language !== settings.language) {
            i18n.changeLanguage(newSettings.language);
        }
        
        try {
            await AsyncStorage.setItem('settings', JSON.stringify(updated));
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    },

    loadSettings: async () => {
        try {
            const stored = await AsyncStorage.getItem('settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with current default settings to handle new fields
                const { settings: defaults } = get();
                const merged = { ...defaults, ...parsed };
                set({ settings: merged });
                
                // Initialize i18n language
                if (merged.language) {
                    i18n.changeLanguage(merged.language);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },

    clearAllFavorites: async () => {
        set({ favoriteVerses: [], favoriteHadiths: [] });
        try {
            await Promise.all([
                AsyncStorage.removeItem('favorites'),
                AsyncStorage.removeItem('favorite_hadiths'),
            ]);
        } catch (error) {
            console.error('Error clearing favorites:', error);
        }
    },

    loadDailyInspiration: async () => {
        const today = new Date().toISOString().split('T')[0];
        const { dailyInspiration } = get();

        // Already loaded for today
        if (dailyInspiration && dailyInspiration.date === today) {
            return;
        }

        try {
            // Check storage first
            const stored = await AsyncStorage.getItem('daily_inspiration');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) {
                    set({ dailyInspiration: parsed });
                    return;
                }
            }

            // Generate new inspiration
            // Randomly pick verse or hadith for daily inspiration
            const type: ContentType = Math.random() > 0.5 ? 'verse' : 'hadith';
            let content: GuidanceContent;
            
            if (type === 'verse') {
                content = await verseService.getDailyVerse();
            } else {
                content = await hadithService.getDailyHadith();
            }

            const reflection = await aiService.getDailyReflection(content, type);
            const newInspiration = { content, type, reflection, date: today };

            set({ dailyInspiration: newInspiration });
            await AsyncStorage.setItem('daily_inspiration', JSON.stringify(newInspiration));
        } catch (error) {
            console.error('Error loading daily inspiration:', error);
        }
    },
}));
