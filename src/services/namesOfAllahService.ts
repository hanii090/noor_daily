import { NameOfAllah, Mood } from '../types';
import reminderApiService from './reminderApiService';
import cacheService from './cacheService';

class NamesOfAllahService {
    private namesCache: NameOfAllah[] | null = null;

    /**
     * Get all 99 Names of Allah (memory-cached + disk-cached)
     */
    async getAllNames(): Promise<NameOfAllah[]> {
        if (this.namesCache) return this.namesCache;
        this.namesCache = await reminderApiService.getNamesOfAllah();
        return this.namesCache;
    }

    /**
     * Get a single Name by number (1-99)
     */
    async getNameByNumber(number: number): Promise<NameOfAllah | null> {
        const names = await this.getAllNames();
        return names.find(n => n.number === number) || null;
    }

    /**
     * Get today's Name of Allah (deterministic, rotates daily through all 99)
     */
    async getDailyName(): Promise<NameOfAllah> {
        return reminderApiService.getDailyNameOfAllah();
    }

    /**
     * Get a random Name of Allah
     */
    async getRandomName(): Promise<NameOfAllah> {
        const names = await this.getAllNames();
        const idx = Math.floor(Math.random() * names.length);
        return names[idx];
    }

    /**
     * Search names by keyword (searches english name, meaning, description)
     */
    async searchNames(query: string): Promise<NameOfAllah[]> {
        const names = await this.getAllNames();
        const q = query.toLowerCase();
        return names.filter(n =>
            n.english.toLowerCase().includes(q) ||
            n.meaning.toLowerCase().includes(q) ||
            n.description.toLowerCase().includes(q) ||
            n.arabic.includes(query)
        );
    }

    /**
     * Get names relevant to a mood (curated mapping)
     */
    async getNamesByMood(mood: Mood): Promise<NameOfAllah[]> {
        const names = await this.getAllNames();

        // Curated mapping of mood → relevant Name numbers
        const moodToNames: Record<Mood, number[]> = {
            grateful: [1, 2, 16, 17, 35, 42, 56],       // Ar-Rahman, Ar-Raheem, Al-Wahhab, Ar-Razzaq, Ash-Shakoor, Al-Kareem, Al-Hameed
            peace: [5, 6, 30, 32, 47, 62, 93],           // As-Salaam, Al-Mu'min, Al-Lateef, Al-Haleem, Al-Wadood, Al-Hayy, An-Noor
            strength: [8, 9, 53, 54, 69, 70, 78],        // Al-Azeez, Al-Jabbaar, Al-Qawiyy, Al-Mateen, Al-Qaadir, Al-Muqtadir, Al-Muta'ali
            guidance: [19, 46, 94, 98, 95, 28, 51],      // Al-Aleem, Al-Hakeem, Al-Haadi, Ar-Rasheed, Al-Badi, Al-Hakam, Al-Haqq
            celebrating: [48, 42, 85, 34, 33, 36, 56],   // Al-Majeed, Al-Kareem, Dhu Al-Jalal, Al-Ghafoor, Al-Azeem, Al-Aliyy, Al-Hameed
            anxious: [5, 7, 30, 38, 52, 55, 83],         // As-Salaam, Al-Muhaymin, Al-Lateef, Al-Hafeez, Al-Wakeel, Al-Waliyy, Ar-Ra'oof
            sad: [1, 2, 14, 34, 80, 82, 47],             // Ar-Rahman, Ar-Raheem, Al-Ghaffar, Al-Ghafoor, At-Tawwab, Al-Afuww, Al-Wadood
            hopeful: [16, 18, 44, 80, 99, 14, 79],       // Al-Wahhab, Al-Fattaah, Al-Mujeeb, At-Tawwab, As-Saboor, Al-Ghaffar, Al-Barr
        };

        const relevantNumbers = moodToNames[mood] || [1, 2, 5];
        return names.filter(n => relevantNumbers.includes(n.number));
    }

    /**
     * Preload names into memory cache on app startup
     */
    async preload(): Promise<void> {
        try {
            await this.getAllNames();
        } catch {
            // Silent fail — will retry on next access
        }
    }
}

export default new NamesOfAllahService();
