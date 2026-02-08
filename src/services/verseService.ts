import { Verse, Mood, VerseReference } from '../types';
import quranApiService from './quranApiService';
import verseReferences from '../data/verseReferences';

class VerseService {
    private verseRefs: VerseReference[] = verseReferences;

    /**
     * Get random verse by mood (API-powered)
     */
    async getVerseByMood(mood: Mood): Promise<Verse> {
        try {
            // Filter verse references by mood
            const filtered = this.verseRefs.filter((ref) =>
                ref.moods && ref.moods.includes(mood)
            );

            if (filtered.length === 0) {
                return await this.getRandomVerse();
            }

            // Pick random reference
            const random = Math.floor(Math.random() * filtered.length);
            const ref = filtered[random];

            // Fetch verse from API (cache-first)
            const verse = await quranApiService.getVerseData(
                ref.surah,
                ref.verse,
                ref.moods || [mood],
                ref.theme || ''
            );

            return verse;
        } catch (error) {
            console.error('Error in getVerseByMood:', error);
            throw error;
        }
    }

    /**
     * Get deterministic daily verse (same for everyone on same day)
     */
    async getDailyVerse(): Promise<Verse> {
        try {
            const today = new Date();
            const dayOfYear = Math.floor(
                (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
            );
            const index = dayOfYear % this.verseRefs.length;
            const ref = this.verseRefs[index];

            // Fetch verse from API (cache-first)
            return await quranApiService.getVerseData(
                ref.surah,
                ref.verse,
                ref.moods || [],
                ref.theme || ''
            );
        } catch (error) {
            console.error('Error fetching daily verse:', error);
            throw error;
        }
    }

    /**
     * Get verse by ID (format: "surah:verse")
     */
    async getVerseById(id: string): Promise<Verse | undefined> {
        try {
            const parts = id.split(':');
            if (parts.length !== 2) {
                return undefined;
            }

            const surah = parseInt(parts[0], 10);
            const verse = parseInt(parts[1], 10);

            if (isNaN(surah) || isNaN(verse)) {
                return undefined;
            }

            // Find reference if it exists
            const ref = this.verseRefs.find(
                (r) => r.surah === surah && r.verse === verse
            );

            // Fetch verse from API (cache-first)
            return await quranApiService.getVerseData(
                surah,
                verse,
                ref?.moods || [],
                ref?.theme || ''
            );
        } catch (error) {
            console.error('Error fetching verse by ID:', error);
            return undefined;
        }
    }

    /**
     * Get all verse references
     */
    getAllVerseReferences(): VerseReference[] {
        return this.verseRefs;
    }

    /**
     * Get random verse from all verses
     */
    async getRandomVerse(): Promise<Verse> {
        try {
            const random = Math.floor(Math.random() * this.verseRefs.length);
            const ref = this.verseRefs[random];

            // Fetch verse from API (cache-first)
            return await quranApiService.getVerseData(
                ref.surah,
                ref.verse,
                ref.moods || [],
                ref.theme || ''
            );
        } catch (error) {
            console.error('Error fetching random verse:', error);
            throw error;
        }
    }

    /**
     * Preload popular verses into cache
     * Call this on app startup
     */
    async preloadPopularVerses(): Promise<void> {
        try {
            // Preload one verse from each mood
            const moods: Mood[] = ['grateful', 'peace', 'strength', 'guidance', 'celebrating', 'anxious', 'sad', 'hopeful'];
            const preloadRefs: VerseReference[] = [];

            for (const mood of moods) {
                const filtered = this.verseRefs.filter((ref) =>
                    ref.moods && ref.moods.includes(mood)
                );
                if (filtered.length > 0) {
                    // Take first 4 from each mood
                    preloadRefs.push(...filtered.slice(0, 4));
                }
            }

            // Also preload today's verse
            const today = new Date();
            const dayOfYear = Math.floor(
                (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
            );
            const dailyRef = this.verseRefs[dayOfYear % this.verseRefs.length];
            preloadRefs.push(dailyRef);

            // Fetch all in background (don't await, let it run)

            // Limit concurrent requests to avoid overwhelming the API
            const batchSize = 5;
            for (let i = 0; i < preloadRefs.length; i += batchSize) {
                const batch = preloadRefs.slice(i, i + batchSize);
                await Promise.allSettled(
                    batch.map((ref) =>
                        quranApiService.getVerseData(
                            ref.surah,
                            ref.verse,
                            ref.moods || [],
                            ref.theme || ''
                        )
                    )
                );
            }

        } catch (error) {
            console.warn('Error preloading verses:', error);
            // Don't throw - preloading is optional
        }
    }
}

export default new VerseService();
