import { Hadith, Mood } from '../types';
import hadithsData from '../data/hadiths.json';

class HadithService {
  private hadiths: Hadith[] = hadithsData as Hadith[];

  /**
   * Get all available hadiths
   */
  getAllHadiths(): Hadith[] {
    return this.hadiths;
  }

  /**
   * Get a random hadith for a specific mood
   */
  getHadithByMood(mood: Mood): Hadith {
    const filtered = this.hadiths.filter((hadith) => 
      hadith.moods.includes(mood)
    );

    if (filtered.length === 0) {
      return this.getRandomHadith();
    }

    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
  }

  /**
   * Get a completely random hadith
   */
  getRandomHadith(): Hadith {
    const randomIndex = Math.floor(Math.random() * this.hadiths.length);
    return this.hadiths[randomIndex];
  }

  /**
   * Get a specific hadith by ID
   */
  getHadithById(id: string): Hadith | undefined {
    return this.hadiths.find((h) => h.id === id);
  }

  /**
   * Get hadiths that match a specific theme
   */
  getHadithsByTheme(theme: string): Hadith[] {
    const searchTheme = theme.toLowerCase();
    return this.hadiths.filter((h) => 
      h.themes.some((t: string) => t.toLowerCase() === searchTheme)
    );
  }

  /**
   * Get daily hadith (deterministic based on date)
   */
  getDailyHadith(): Hadith {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const index = dayOfYear % this.hadiths.length;
    return this.hadiths[index];
  }
}

export default new HadithService();
