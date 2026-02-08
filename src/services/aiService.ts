import axios from 'axios';
import { GuidanceContent, ContentType, Mood } from '../types';
import cacheService from './cacheService';

const TOGETHER_API = 'https://api.together.xyz/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

/**
 * Make an AI chat completion request via Together AI directly.
 * Requires EXPO_PUBLIC_TOGETHER_API_KEY in .env
 */
const aiChat = async (
    messages: { role: string; content: string }[],
    maxTokens = 250,
    temperature = 0.7,
): Promise<string> => {
    const apiKey = process.env.EXPO_PUBLIC_TOGETHER_API_KEY;

    if (!apiKey || apiKey.includes('YOUR_')) {
        throw new Error('Set EXPO_PUBLIC_TOGETHER_API_KEY in .env');
    }

    try {
        const res = await axios.post(TOGETHER_API, {
            model: DEFAULT_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });

        return res.data.choices[0].message.content.trim();
    } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error?.message || err?.message || 'Unknown error';
        throw new Error(`Together AI ${status || 'network'}: ${msg}`);
    }
};

class AIService {
    /**
     * Get AI-generated insight or explanation for a verse or hadith
     */
    async getGuidanceInsight(content: GuidanceContent, type: ContentType): Promise<string> {
        const cacheKey = cacheService.getAiInsightKey(content.id, type);
        const cached = await cacheService.get<string>(cacheKey);
        if (cached) return cached;

        try {
            const prompt = type === 'verse' 
                ? `Provide a brief, spiritually uplifting insight and practical application for this Quranic verse: "${content.english}". Keep it under 100 words.`
                : `Provide a brief, spiritually uplifting insight and practical application for this Hadith: "${content.english}". Keep it under 100 words.`;

            const result = await aiChat([
                { role: 'system', content: 'You are a knowledgeable and compassionate Islamic scholar providing gentle guidance and practical wisdom based on the Quran and Sunnah.' },
                { role: 'user', content: prompt },
            ]);

            await cacheService.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
            return result;
        } catch (_e) {
            throw new Error('AI insights are temporarily unavailable. The verse speaks for itself — reflect on its meaning.');
        }
    }

    /**
     * Get personalized guidance based on user's situation
     */
    async getPersonalizedGuidance(situation: string, relevantContent?: GuidanceContent): Promise<string> {
        try {
            let userPrompt = `I am feeling: "${situation}". `;
            if (relevantContent) {
                userPrompt += `Based on this guidance: "${relevantContent.english}", please provide comfort and practical advice.`;
            } else {
                userPrompt += `Please provide comfort and practical advice rooted in Islamic wisdom.`;
            }

            return await aiChat([
                { role: 'system', content: 'You are a compassionate spiritual mentor. Provide brief, supportive guidance based on Islamic principles. Keep it concise (under 150 words).' },
                { role: 'user', content: userPrompt },
            ], 300);
        } catch (_e) {
            throw new Error('The AI mentor is temporarily resting. Please try again in a moment.');
        }
    }

    /**
     * Get a daily AI reflection for a specific guidance content
     */
    async getDailyReflection(content: GuidanceContent, type: ContentType): Promise<string> {
        try {
            const prompt = `Provide a very brief (max 2 sentences), beautiful, and reflective spiritual thought based on this ${type}: "${content.english}". Focus on peace and daily motivation.`;

            const result = await aiChat([
                { role: 'system', content: 'You are a poet and spiritual guide. Your reflections are concise, elegant, and deeply moving.' },
                { role: 'user', content: prompt },
            ], 150, 0.8);

            return result.replace(/^"|"$/g, '');
        } catch (_e) {
            return 'May this divine wisdom bring light and peace to your heart today.';
        }
    }

    /**
     * Classify a hadith text into mood categories using AI.
     * Returns an array of matching Mood values.
     * Results are cached for 30 days to avoid repeated API calls.
     */
    async classifyHadithMood(hadithText: string, hadithId: string): Promise<Mood[]> {
        const VALID_MOODS: Mood[] = ['grateful', 'peace', 'strength', 'guidance', 'celebrating', 'anxious', 'sad', 'hopeful'];

        const cacheKey = `ai_mood_hadith_${hadithId}`;
        const cached = await cacheService.get<Mood[]>(cacheKey);
        if (cached) return cached;

        try {
            const prompt = `Classify this hadith into 2-3 mood categories from this list ONLY: grateful, peace, strength, guidance, celebrating, anxious, sad, hopeful.

Hadith: "${hadithText.substring(0, 500)}"

Reply with ONLY a JSON array of mood strings, nothing else. Example: ["peace","guidance"]`;

            const raw = await aiChat([
                { role: 'system', content: 'You classify Islamic hadiths into emotional/spiritual mood categories. Reply ONLY with a valid JSON array of strings. No explanation.' },
                { role: 'user', content: prompt },
            ], 50, 0.2);

            const match = raw.match(/\[.*\]/s);
            if (match) {
                const parsed: string[] = JSON.parse(match[0]);
                const moods = parsed.filter(m => VALID_MOODS.includes(m as Mood)) as Mood[];
                if (moods.length > 0) {
                    await cacheService.set(cacheKey, moods, 30 * 24 * 60 * 60 * 1000);
                    return moods;
                }
            }

            return ['guidance', 'peace'];
        } catch (_e) {
            return ['guidance', 'peace'];
        }
    }
}

export default new AIService();
