import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageMigration';
import { JourneyDay, JourneyProgress, JourneyStatus, JourneyBadge, Verse, Hadith } from '../types';
import journeyData from '../data/journey-30day.json';
import verseService from './verseService';
import hadithService from './hadithService';

const JOURNEY_PROGRESS_KEY = STORAGE_KEYS.JOURNEY_PROGRESS;
const TOTAL_DAYS = 30;

class JourneyService {
    private days: JourneyDay[] = journeyData as JourneyDay[];

    /**
     * Get all 30 journey day definitions
     */
    getJourneyData(): JourneyDay[] {
        return this.days;
    }

    /**
     * Get a specific day's definition
     */
    getDay(day: number): JourneyDay | undefined {
        return this.days.find((d) => d.day === day);
    }

    /**
     * Start a new journey (resets any existing progress)
     */
    async startJourney(): Promise<JourneyProgress> {
        const progress: JourneyProgress = {
            startedAt: new Date().toISOString(),
            completedDays: [],
            completionDates: {},
            journalEntries: {},
            currentStreak: 0,
            longestStreak: 0,
            streakFreezeUsed: false,
        };
        await AsyncStorage.setItem(JOURNEY_PROGRESS_KEY, JSON.stringify(progress));
        return progress;
    }

    /**
     * Load saved progress from storage
     */
    async getProgress(): Promise<JourneyProgress | null> {
        try {
            const stored = await AsyncStorage.getItem(JOURNEY_PROGRESS_KEY);
            if (!stored) return null;
            return JSON.parse(stored) as JourneyProgress;
        } catch (error) {
            console.error('Error loading journey progress:', error);
            return null;
        }
    }

    /**
     * Determine the current journey status
     */
    async getStatus(): Promise<JourneyStatus> {
        const progress = await this.getProgress();
        if (!progress) return 'not_started';
        if (progress.completedAt) return 'completed';
        return 'in_progress';
    }

    /**
     * Get the current day based on calendar days elapsed since journey start.
     * Day 1 is available on the start date, day 2 the next calendar day, etc.
     */
    async getCurrentDay(): Promise<number> {
        const progress = await this.getProgress();
        if (!progress) return 1;
        if (progress.completedDays.length >= TOTAL_DAYS) return TOTAL_DAYS;

        const startDate = new Date(progress.startedAt);
        startDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysSinceStart = Math.floor(
            (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Day 1 on start date, day 2 the next day, etc.
        const calendarDay = Math.min(daysSinceStart + 1, TOTAL_DAYS);
        return Math.max(calendarDay, 1);
    }

    /**
     * Check if a specific day is accessible (unlocked) for the user.
     * A day is accessible if:
     *  - It's day 1, OR
     *  - The previous day has been completed AND at least one calendar day has passed since then
     */
    async isDayAccessible(day: number): Promise<boolean> {
        if (day === 1) return true;
        const progress = await this.getProgress();
        if (!progress) return day === 1;

        // Migrate old data: if completionDates is missing, allow based on completedDays
        if (!progress.completionDates) {
            progress.completionDates = {};
        }

        // Previous day must be completed
        if (!progress.completedDays.includes(day - 1)) return false;

        // Check that at least one calendar day has passed since previous day was completed
        const prevCompletionDate = progress.completionDates[day - 1];
        if (!prevCompletionDate) {
            // Legacy data without timestamps — fall back to calendar-based check
            const currentDay = await this.getCurrentDay();
            return day <= currentDay;
        }

        const completedOn = new Date(prevCompletionDate);
        completedOn.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return today.getTime() > completedOn.getTime();
    }

    /**
     * Mark a day as completed, optionally saving a journal entry
     */
    async completeDay(day: number, journal?: string): Promise<JourneyProgress> {
        let progress = await this.getProgress();
        if (!progress) {
            progress = await this.startJourney();
        }

        // Ensure completionDates exists (migration for old data)
        if (!progress.completionDates) {
            progress.completionDates = {};
        }

        // Idempotent — don't double-count
        if (progress.completedDays.includes(day)) {
            // Still allow updating journal
            if (journal !== undefined) {
                progress.journalEntries[day] = journal;
                await AsyncStorage.setItem(JOURNEY_PROGRESS_KEY, JSON.stringify(progress));
            }
            return progress;
        }

        progress.completedDays.push(day);
        progress.completedDays.sort((a, b) => a - b);
        progress.completionDates[day] = new Date().toISOString();

        if (journal !== undefined) {
            progress.journalEntries[day] = journal;
        }

        // Recalculate streak
        progress.currentStreak = this.calculateCurrentStreak(progress);
        if (progress.currentStreak > progress.longestStreak) {
            progress.longestStreak = progress.currentStreak;
        }

        // Check if journey is complete
        if (progress.completedDays.length >= TOTAL_DAYS) {
            progress.completedAt = new Date().toISOString();
        }

        await AsyncStorage.setItem(JOURNEY_PROGRESS_KEY, JSON.stringify(progress));
        return progress;
    }

    /**
     * Check if the user has completed today's day
     */
    async hasCompletedToday(): Promise<boolean> {
        const progress = await this.getProgress();
        if (!progress) return false;

        const currentDay = await this.getCurrentDay();
        return progress.completedDays.includes(currentDay);
    }

    /**
     * Calculate consecutive days completed from the most recent completion
     */
    private calculateCurrentStreak(progress: JourneyProgress): number {
        if (progress.completedDays.length === 0) return 0;

        const startDate = new Date(progress.startedAt);
        startDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate which "journey day" today corresponds to
        const daysSinceStart = Math.floor(
            (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const todayJourneyDay = daysSinceStart + 1; // 1-indexed

        let streak = 0;
        let checkDay = todayJourneyDay;

        // Count backwards from today
        while (checkDay >= 1) {
            if (progress.completedDays.includes(checkDay)) {
                streak++;
                checkDay--;
            } else if (
                checkDay === todayJourneyDay &&
                !progress.completedDays.includes(checkDay)
            ) {
                // Today not completed yet, check from yesterday
                checkDay--;
            } else {
                // Check if streak freeze applies
                if (!progress.streakFreezeUsed && streak > 0) {
                    // Allow one gap
                    break;
                }
                break;
            }
        }

        return streak;
    }

    /**
     * Check if streak freeze is available
     */
    async canUseStreakFreeze(): Promise<boolean> {
        const progress = await this.getProgress();
        if (!progress) return false;
        return !progress.streakFreezeUsed;
    }

    /**
     * Use the one-time streak freeze
     */
    async useStreakFreeze(): Promise<void> {
        const progress = await this.getProgress();
        if (!progress) return;
        progress.streakFreezeUsed = true;
        await AsyncStorage.setItem(JOURNEY_PROGRESS_KEY, JSON.stringify(progress));
    }

    /**
     * Get all badges the user has earned
     */
    async getEarnedBadges(): Promise<JourneyBadge[]> {
        const progress = await this.getProgress();
        if (!progress) return [];

        const allBadges = this.getAllBadges();
        return allBadges.filter((badge) =>
            progress.completedDays.includes(badge.dayRequired)
        );
    }

    /**
     * Get all possible badges (earned + locked)
     */
    getAllBadges(): JourneyBadge[] {
        return this.days
            .filter((d) => d.badge !== undefined)
            .map((d) => d.badge as JourneyBadge);
    }

    /**
     * Get hydrated content for a specific day (verse + hadith fetched)
     */
    async getDayContent(day: number): Promise<{
        journeyDay: JourneyDay;
        verse: Verse;
        hadith: Hadith;
    } | null> {
        const journeyDay = this.getDay(day);
        if (!journeyDay) return null;

        try {
            const verse = await verseService.getVerseById(
                `${journeyDay.verseRef.surah}:${journeyDay.verseRef.verse}`
            );

            const hadith = hadithService.getHadithById(journeyDay.hadithId);

            if (!verse || !hadith) {
                console.error(`Missing content for journey day ${day}`);
                return null;
            }

            return { journeyDay, verse, hadith };
        } catch (error) {
            console.error(`Error loading journey day ${day} content:`, error);
            return null;
        }
    }

    /**
     * Get progress percentage (0-100)
     */
    async getProgressPercentage(): Promise<number> {
        const progress = await this.getProgress();
        if (!progress) return 0;
        return Math.round((progress.completedDays.length / TOTAL_DAYS) * 100);
    }

    /**
     * Reset journey completely
     */
    async resetJourney(): Promise<void> {
        await AsyncStorage.removeItem(JOURNEY_PROGRESS_KEY);
    }

    /**
     * Get the number of days elapsed since journey start
     */
    async getDaysElapsed(): Promise<number> {
        const progress = await this.getProgress();
        if (!progress) return 0;

        const startDate = new Date(progress.startedAt);
        const now = new Date();
        return Math.floor(
            (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
    }
}

export default new JourneyService();
