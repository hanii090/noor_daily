import { Hadith, Mood } from '../types';
import hadithsData from '../data/hadiths.json';
import reminderApiService from './reminderApiService';
import aiService from './aiService';
import cacheService from './cacheService';

// Curated book numbers in Sahih al-Bukhari that tend to have
// spiritually relevant, shorter hadiths good for daily guidance
const CURATED_BOOKS = [2, 3, 4, 8, 10, 11, 13, 21, 24, 26, 34, 41, 52, 56, 60, 65, 73, 76, 78, 80, 81, 86, 97];

class HadithService {
  private localHadiths: Hadith[] = hadithsData as Hadith[];

  /**
   * Get all locally-stored hadiths (pre-tagged with moods)
   */
  getAllHadiths(): Hadith[] {
    return this.localHadiths;
  }

  /**
   * Get a hadith for a specific mood.
   * Strategy:
   *  1. Try local pre-tagged hadiths first (fast, no network)
   *  2. If < 3 local matches, also fetch from reminder.dev API
   *     and use AI to classify mood on-the-fly
   */
  async getHadithByMood(mood: Mood): Promise<Hadith> {
    // First try local pre-tagged hadiths
    const localFiltered = this.localHadiths.filter((h) => h.moods.includes(mood));

    // 70% chance to use local if we have enough, 30% chance to fetch fresh from API
    const useFresh = localFiltered.length < 3 || Math.random() < 0.3;

    if (useFresh) {
      try {
        const apiHadith = await this.fetchAndClassifyHadith(mood);
        if (apiHadith) return apiHadith;
      } catch {
        // Fall through to local
      }
    }

    if (localFiltered.length > 0) {
      return localFiltered[Math.floor(Math.random() * localFiltered.length)];
    }

    return this.getRandomHadith();
  }

  /**
   * Fetch a random hadith from reminder.dev and classify its mood via AI
   */
  private async fetchAndClassifyHadith(targetMood?: Mood): Promise<Hadith | null> {
    try {
      // Pick a random curated book
      const bookNum = CURATED_BOOKS[Math.floor(Math.random() * CURATED_BOOKS.length)];
      const { hadith: apiHadith, bookName } = await reminderApiService.getRandomHadith();

      if (!apiHadith || !apiHadith.english || apiHadith.english.length < 20) {
        return null;
      }

      // Skip very long hadiths (not great for daily guidance cards)
      if (apiHadith.english.length > 1500) {
        return null;
      }

      const hadithId = `bukhari_${apiHadith.number}`;

      // AI mood classification (cached)
      const moods = await aiService.classifyHadithMood(apiHadith.english, hadithId);

      // If we have a target mood and the AI didn't classify it as matching,
      // still include the target mood (the AI might be wrong, and the user asked for it)
      if (targetMood && !moods.includes(targetMood)) {
        // Only add if the classification is close (has at least one mood)
        if (moods.length > 0) {
          moods.push(targetMood);
        }
      }

      const hadith: Hadith = {
        id: hadithId,
        arabic: apiHadith.arabic || '',
        english: apiHadith.text || apiHadith.english,
        narrator: apiHadith.by || apiHadith.narrator || 'Unknown',
        reference: `Sahih al-Bukhari ${apiHadith.number}`,
        collection: 'Sahih al-Bukhari',
        bookNumber: apiHadith.number,
        moods,
        themes: [],
        authenticity: 'sahih',
      };

      return hadith;
    } catch (error) {
      console.warn('Failed to fetch API hadith:', error);
      return null;
    }
  }

  /**
   * Get a completely random hadith (local or API)
   */
  getRandomHadith(): Hadith {
    const randomIndex = Math.floor(Math.random() * this.localHadiths.length);
    return this.localHadiths[randomIndex];
  }

  /**
   * Get a random hadith from the API (async version)
   */
  async getRandomApiHadith(): Promise<Hadith> {
    try {
      const result = await this.fetchAndClassifyHadith();
      if (result) return result;
    } catch {
      // Fall through
    }
    return this.getRandomHadith();
  }

  /**
   * Get a specific hadith by ID
   * Supports both local IDs (hadith_001) and API IDs (bukhari_123)
   */
  getHadithById(id: string): Hadith | undefined {
    return this.localHadiths.find((h) => h.id === id);
  }

  /**
   * Get hadiths that match a specific theme
   */
  getHadithsByTheme(theme: string): Hadith[] {
    const searchTheme = theme.toLowerCase();
    return this.localHadiths.filter((h) => 
      h.themes.some((t: string) => t.toLowerCase() === searchTheme)
    );
  }

  /**
   * Get daily hadith (deterministic based on date)
   * Uses reminder.dev daily endpoint for fresh content
   */
  async getDailyHadith(): Promise<Hadith> {
    try {
      const daily = await reminderApiService.getDailyReminder();
      if (daily.hadith) {
        // Parse the daily hadith string
        // Format: "Book Name - Narrator:\n\nText"
        const parts = daily.hadith.split('\n\n');
        const headerLine = parts[0] || '';
        const text = parts.slice(1).join('\n\n') || daily.hadith;

        // Extract narrator from header
        const narratorMatch = headerLine.match(/Narrated\s+(.+?):/);
        const narrator = narratorMatch ? narratorMatch[1] : 'Unknown';

        // Extract book name
        const bookMatch = headerLine.match(/^(.+?)\s*-\s*Narrated/);
        const bookName = bookMatch ? bookMatch[1].trim() : 'Sahih al-Bukhari';

        const hadithId = `daily_${daily.date}`;
        const moods = await aiService.classifyHadithMood(text, hadithId);

        return {
          id: hadithId,
          arabic: '',
          english: text,
          narrator,
          reference: `${bookName}`,
          collection: 'Sahih al-Bukhari',
          bookNumber: 0,
          moods,
          themes: [],
          authenticity: 'sahih',
        };
      }
    } catch {
      // Fall through to local
    }

    // Fallback to local deterministic hadith
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const index = dayOfYear % this.localHadiths.length;
    return this.localHadiths[index];
  }
}

export default new HadithService();
