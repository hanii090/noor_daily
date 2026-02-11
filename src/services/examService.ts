import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import userIdentityService from './userIdentityService';
import offlineQueueService from './offlineQueueService';
import { ExamVerse, ExamSession, ExamTiming, ExamSubject, ExamFeeling, ExamPhase, Verse } from '../types';
import examVersesData from '../data/exam-verses.json';
import verseService from './verseService';

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
     * Save an exam session to Supabase
     */
    async saveExamSession(session: ExamSession): Promise<void> {
        try {
            // Validate input
            if (!session || !session.createdAt) {
                throw new Error('Invalid exam session: missing session or createdAt');
            }

            __DEV__ && console.log('[ExamService] Saving session to cloud');

            // Get user ID
            const userId = await userIdentityService.getUserId();

            // Prepare data for Supabase
            const sessionData = {
                user_id: userId,
                timing: session.timing,
                subject: session.subject,
                feeling: session.feeling,
                verse_id: session.verseId,
                exam_verse_category: session.examVerseCategory || null,
                created_at: new Date(session.createdAt).toISOString(),
            };

            // Try to save to Supabase
            try {
                const { error } = await supabase
                    .from('exam_sessions')
                    .insert(sessionData);

                if (error) {
                    throw error;
                }

                __DEV__ && console.log('[ExamService] Session saved to cloud');
            } catch (supabaseError) {
                // If offline or error, queue the operation
                console.warn('[ExamService] Cloud save failed, queuing:', supabaseError);
                await offlineQueueService.enqueue({
                    type: 'exam_save',
                    data: sessionData,
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[ExamService] Save session failed:', errorMessage);

            Alert.alert(
                'Exam Session Save',
                'Failed to save session. It will be synced when you\'re back online.',
                [{ text: 'OK' }]
            );
        }
    }

    /**
     * Get exam session history from Supabase
     */
    async getExamHistory(): Promise<ExamSession[]> {
        try {
            const userId = await userIdentityService.getUserId();

            const { data, error } = await supabase
                .from('exam_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100); // Get last 100 sessions (no storage limit!)

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            // Convert to ExamSession format
            const sessions: ExamSession[] = data.map(row => ({
                timing: row.timing as ExamTiming,
                subject: row.subject as ExamSubject,
                feeling: row.feeling as ExamFeeling,
                verseId: row.verse_id,
                examVerseCategory: row.exam_verse_category || undefined,
                createdAt: new Date(row.created_at).getTime(),
            }));

            return sessions;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[ExamService] Get history failed:', errorMessage);

            Alert.alert(
                'Exam History Load Error',
                'Unable to load exam history. Please check your internet connection.',
                [{ text: 'OK' }]
            );

            return [];
        }
    }
}

export default new ExamService();
