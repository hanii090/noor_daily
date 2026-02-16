import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageMigration';
import {
    SurahInfo,
    ReadingPlan,
    ReadingPlanProgress,
    ScriptureCollection,
    LastReadPosition,
    ReminderApiChapter,
} from '../types';
import reminderApiService from './reminderApiService';
import readingPlansData from '../data/reading-plans.json';
import collectionsData from '../data/collections.json';

// Meccan surahs (revealed in Mecca) — the rest are Medinan
const MECCAN_SURAHS = new Set([
    1, 6, 7, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 23, 25, 26, 27,
    28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
    46, 50, 51, 52, 53, 54, 56, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
    77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93,
    94, 95, 96, 97, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    111, 112, 113, 114,
]);

class ScriptureService {
    // ── Surah List ──

    async getSurahList(): Promise<SurahInfo[]> {
        const chapters = await reminderApiService.getChapterList();
        return chapters.map((ch) => ({
            number: ch.number,
            name: ch.name,
            english: ch.english,
            verseCount: ch.verse_count,
            revelationType: MECCAN_SURAHS.has(ch.number) ? 'meccan' as const : 'medinan' as const,
        }));
    }

    async getChapter(surahNumber: number): Promise<ReminderApiChapter> {
        return reminderApiService.getChapter(surahNumber);
    }

    // ── Last Read Position ──

    async getLastRead(): Promise<LastReadPosition | null> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_READ);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }

    async setLastRead(surah: number, verse: number): Promise<void> {
        try {
            const position: LastReadPosition = { surah, verse, timestamp: Date.now() };
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(position));
        } catch {
            // Non-critical
        }
    }

    // ── Reading Plans ──

    getReadingPlans(): ReadingPlan[] {
        return readingPlansData as ReadingPlan[];
    }

    getReadingPlan(planId: string): ReadingPlan | undefined {
        return this.getReadingPlans().find((p) => p.id === planId);
    }

    async getPlanProgress(): Promise<ReadingPlanProgress | null> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.READING_PLAN);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }

    async startPlan(planId: string): Promise<ReadingPlanProgress> {
        const progress: ReadingPlanProgress = {
            planId,
            startedAt: new Date().toISOString(),
            completedDays: [],
            currentDay: 1,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.READING_PLAN, JSON.stringify(progress));
        return progress;
    }

    async completePlanDay(day: number): Promise<ReadingPlanProgress | null> {
        const progress = await this.getPlanProgress();
        if (!progress) return null;

        if (!progress.completedDays.includes(day)) {
            progress.completedDays.push(day);
            progress.completedDays.sort((a, b) => a - b);
        }
        progress.lastReadAt = new Date().toISOString();

        // Advance current day
        const plan = this.getReadingPlan(progress.planId);
        if (plan) {
            const nextIncomplete = plan.dailyReadings.find(
                (r) => !progress.completedDays.includes(r.day)
            );
            progress.currentDay = nextIncomplete ? nextIncomplete.day : day;

            // Check if plan is complete
            if (progress.completedDays.length >= plan.totalDays) {
                progress.completedAt = new Date().toISOString();
            }
        }

        await AsyncStorage.setItem(STORAGE_KEYS.READING_PLAN, JSON.stringify(progress));
        return progress;
    }

    async abandonPlan(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.READING_PLAN);
    }

    // ── Collections ──

    getCollections(): ScriptureCollection[] {
        return collectionsData as ScriptureCollection[];
    }

    getCollection(collectionId: string): ScriptureCollection | undefined {
        return this.getCollections().find((c) => c.id === collectionId);
    }
}

export default new ScriptureService();
