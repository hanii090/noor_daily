import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageMigration';
import { Verse, Hadith, Mood, AppSettings, ContentType, GuidanceContent, JourneyProgress, JourneyStatus, LastReadPosition, ReadingPlanProgress } from '../types';
import historyService, { HistoryDay, HistoryEntry } from '../services/historyService';
import verseService from '../services/verseService';
import hadithService from '../services/hadithService';
import aiService from '../services/aiService';
import journeyService from '../services/journeyService';
import scriptureService from '../services/scriptureService';
import i18n from '../i18n/config';
import offlineQueueService from '../services/offlineQueueService';
import userIdentityService from '../services/userIdentityService';
import { supabase } from '../config/supabase';

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

    // Journey State
    journeyProgress: JourneyProgress | null;
    journeyStatus: JourneyStatus;

    // Scripture State
    lastReadPosition: LastReadPosition | null;
    readingPlanProgress: ReadingPlanProgress | null;

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

    // Journey Actions
    loadJourneyProgress: () => Promise<void>;
    startJourney: () => Promise<void>;
    completeJourneyDay: (day: number, journal?: string) => Promise<void>;
    resetJourney: () => Promise<void>;

    // Scripture Actions
    loadLastRead: () => Promise<void>;
    updateLastRead: (surah: number, verse: number) => Promise<void>;
    loadReadingPlanProgress: () => Promise<void>;
    startReadingPlan: (planId: string) => Promise<void>;
    completeReadingDay: (day: number) => Promise<void>;
    abandonReadingPlan: () => Promise<void>;
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

        notificationFrequency: 3,
        notificationContentType: 'both',
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        weekendMode: false,
        userName: '',
        reciter: 'alafasy',
    },
    dailyInspiration: null,
    journeyProgress: null,
    journeyStatus: 'not_started' as JourneyStatus,
    lastReadPosition: null,
    readingPlanProgress: null,

    // Actions
    setOnboardingCompleted: async (value: boolean) => {
        set({ onboardingCompleted: value });
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving onboarding status:', error);
        }
    },

    loadOnboardingStatus: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
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
            const storedVerses = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
            const storedHadiths = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_HADITHS);

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
                AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoriteVerses)),
                AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_HADITHS, JSON.stringify(favoriteHadiths)),
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
            await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

            // Sync to cloud if user is authenticated (which they always should be via anonymous auth)
            const userId = await userIdentityService.getUserId();
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: userId,
                    settings: updated,
                    push_token: updated.pushToken || null,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                // Queue for offline sync
                await offlineQueueService.enqueue({
                    type: 'preferences_save',
                    data: {
                        user_id: userId,
                        settings: updated,
                        push_token: updated.pushToken || null,
                        updated_at: new Date().toISOString()
                    }
                });
            }
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    },

    loadSettings: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
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
                AsyncStorage.removeItem(STORAGE_KEYS.FAVORITES),
                AsyncStorage.removeItem(STORAGE_KEYS.FAVORITE_HADITHS),
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
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_INSPIRATION);
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
            await AsyncStorage.setItem(STORAGE_KEYS.DAILY_INSPIRATION, JSON.stringify(newInspiration));
        } catch (error) {
            console.error('Error loading daily inspiration:', error);
        }
    },
    // ── Journey Actions ──

    loadJourneyProgress: async () => {
        try {
            const progress = await journeyService.getProgress();
            const status = await journeyService.getStatus();
            set({ journeyProgress: progress, journeyStatus: status });
        } catch (error) {
            console.error('Error loading journey progress:', error);
        }
    },

    startJourney: async () => {
        try {
            const progress = await journeyService.startJourney();
            set({ journeyProgress: progress, journeyStatus: 'in_progress' });
        } catch (error) {
            console.error('Error starting journey:', error);
        }
    },

    completeJourneyDay: async (day: number, journal?: string) => {
        try {
            const progress = await journeyService.completeDay(day, journal);
            const status = progress.completedAt ? 'completed' : 'in_progress';
            set({ journeyProgress: progress, journeyStatus: status as JourneyStatus });
        } catch (error) {
            console.error('Error completing journey day:', error);
        }
    },

    resetJourney: async () => {
        try {
            await journeyService.resetJourney();
            set({ journeyProgress: null, journeyStatus: 'not_started' });
        } catch (error) {
            console.error('Error resetting journey:', error);
        }
    },

    // ── Scripture Actions ──

    loadLastRead: async () => {
        try {
            const pos = await scriptureService.getLastRead();
            set({ lastReadPosition: pos });
        } catch (error) {
            console.error('Error loading last read:', error);
        }
    },

    updateLastRead: async (surah: number, verse: number) => {
        try {
            await scriptureService.setLastRead(surah, verse);
            set({ lastReadPosition: { surah, verse, timestamp: Date.now() } });
        } catch (error) {
            console.error('Error updating last read:', error);
        }
    },

    loadReadingPlanProgress: async () => {
        try {
            const progress = await scriptureService.getPlanProgress();
            set({ readingPlanProgress: progress });
        } catch (error) {
            console.error('Error loading reading plan:', error);
        }
    },

    startReadingPlan: async (planId: string) => {
        try {
            const progress = await scriptureService.startPlan(planId);
            set({ readingPlanProgress: progress });
        } catch (error) {
            console.error('Error starting reading plan:', error);
        }
    },

    completeReadingDay: async (day: number) => {
        try {
            const progress = await scriptureService.completePlanDay(day);
            set({ readingPlanProgress: progress });
        } catch (error) {
            console.error('Error completing reading day:', error);
        }
    },

    abandonReadingPlan: async () => {
        try {
            await scriptureService.abandonPlan();
            set({ readingPlanProgress: null });
        } catch (error) {
            console.error('Error abandoning reading plan:', error);
        }
    },
}));
