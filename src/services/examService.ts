import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageMigration';
import { ExamVerse, ExamSession, ExamTiming, ExamSubject, ExamFeeling, ExamPhase, Verse } from '../types';
import examVersesData from '../data/exam-verses.json';
import verseService from './verseService';

const EXAM_SESSIONS_KEY = STORAGE_KEYS.EXAM_SESSIONS;

// Feeling → category weight mapping for smart matching
const FEELING_WEIGHTS: Record<ExamFeeling, Record<string, number>> = {
    stressed: { stress_relief: 3, trust: 2, focus: 1, confidence: 1, acceptance: 1, gratitude: 0 },
    anxious: { stress_relief: 3, trust: 3, focus: 1, confidence: 1, acceptance: 1, gratitude: 0 },
    tired: { stress_relief: 2, focus: 3, trust: 1, confidence: 1, acceptance: 0, gratitude: 0 },
    confident: { confidence: 3, focus: 2, trust: 1, gratitude: 1, stress_relief: 0, acceptance: 0 },
    hopeful: { trust: 2, confidence: 2, focus: 2, gratitude: 1, stress_relief: 0, acceptance: 0 },
};

class ExamService {
    private examVerses: ExamVerse[] = examVersesData as ExamVerse[];

    /**
     * Get a verse tailored to the student's exam situation
     */
    async getVerseForExam(params: {
        timing: ExamTiming;
        subject: ExamSubject;
        feeling: ExamFeeling;
    }): Promise<{ verse: Verse; examVerse: ExamVerse }> {
        const phase: ExamPhase = params.timing === 'today' ? 'before' : 'during_break';

        // Filter by applicable phase and feeling
        let candidates = this.examVerses.filter(
            (ev) =>
                ev.applicablePhases.includes(phase) &&
                ev.applicableFeelings.includes(params.feeling)
        );

        // If too few results, relax the feeling filter
        if (candidates.length < 3) {
            candidates = this.examVerses.filter((ev) =>
                ev.applicablePhases.includes(phase)
            );
        }

        // Weighted random selection based on feeling
        const weights = FEELING_WEIGHTS[params.feeling];
        const weighted = candidates.map((ev) => ({
            examVerse: ev,
            weight: weights[ev.category] ?? 1,
        }));

        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        let random = Math.random() * totalWeight;

        let selected = weighted[0];
        for (const item of weighted) {
            random -= item.weight;
            if (random <= 0) {
                selected = item;
                break;
            }
        }

        // Fetch the actual verse data
        const verseId = `${selected.examVerse.verseRef.surah}:${selected.examVerse.verseRef.verse}`;
        const verse = await verseService.getVerseById(verseId);

        if (!verse) {
            throw new Error(`Verse not found: ${verseId}`);
        }

        return { verse, examVerse: selected.examVerse };
    }

    /**
     * Get a verse for post-exam reflection
     */
    async getPostExamVerse(outcome: 'good' | 'uncertain' | 'bad'): Promise<{ verse: Verse; examVerse: ExamVerse }> {
        let category: string;
        switch (outcome) {
            case 'good':
                category = 'gratitude';
                break;
            case 'uncertain':
                category = 'trust';
                break;
            case 'bad':
                category = 'acceptance';
                break;
        }

        const candidates = this.examVerses.filter(
            (ev) => ev.applicablePhases.includes('after') && ev.category === category
        );

        // Fallback to any after-phase verse
        const pool = candidates.length > 0
            ? candidates
            : this.examVerses.filter((ev) => ev.applicablePhases.includes('after'));

        const selected = pool[Math.floor(Math.random() * pool.length)];
        const verseId = `${selected.verseRef.surah}:${selected.verseRef.verse}`;
        const verse = await verseService.getVerseById(verseId);

        if (!verse) {
            throw new Error(`Verse not found: ${verseId}`);
        }

        return { verse, examVerse: selected };
    }

    /**
     * Get a random focus verse for study breaks
     */
    async getStudyBreakVerse(): Promise<{ verse: Verse; examVerse: ExamVerse }> {
        const candidates = this.examVerses.filter(
            (ev) => ev.applicablePhases.includes('during_break')
        );

        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        const verseId = `${selected.verseRef.surah}:${selected.verseRef.verse}`;
        const verse = await verseService.getVerseById(verseId);

        if (!verse) {
            throw new Error(`Verse not found: ${verseId}`);
        }

        return { verse, examVerse: selected };
    }

    /**
     * Get a pre-exam dua
     */
    getDuaForExam(): { arabic: string; english: string; transliteration: string } {
        return {
            arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي',
            english: 'My Lord, expand for me my chest, ease for me my task, and untie the knot from my tongue so they may understand my speech.',
            transliteration: "Rabbi ishrah li sadri, wa yassir li amri, wahlul 'uqdatan min lisani, yafqahu qawli",
        };
    }

    /**
     * Save an exam session to history
     */
    async saveExamSession(session: ExamSession): Promise<void> {
        try {
            const sessions = await this.getExamHistory();
            sessions.unshift(session);
            // Keep last 50 sessions
            const trimmed = sessions.slice(0, 50);
            await AsyncStorage.setItem(EXAM_SESSIONS_KEY, JSON.stringify(trimmed));
        } catch (error) {
            console.error('Error saving exam session:', error);
        }
    }

    /**
     * Get exam session history
     */
    async getExamHistory(): Promise<ExamSession[]> {
        try {
            const stored = await AsyncStorage.getItem(EXAM_SESSIONS_KEY);
            if (!stored) return [];
            return JSON.parse(stored) as ExamSession[];
        } catch (error) {
            console.error('Error loading exam history:', error);
            return [];
        }
    }
}

export default new ExamService();
