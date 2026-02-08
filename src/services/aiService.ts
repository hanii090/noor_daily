import axios from 'axios';
import { GuidanceContent, ContentType, Mood } from '../types';
import cacheService from './cacheService';

// Get proxy URL from environment
const getProxyUrl = () => {
    const url = process.env.EXPO_PUBLIC_AI_PROXY_URL;
    if (!url || url.includes('YOUR_REGION') || url.includes('YOUR_PROJECT_ID')) {
        console.warn('AI Proxy URL is missing or not configured');
        return null;
    }
    return url;
};

class AIService {
    /**
     * Get AI-generated insight or explanation for a verse or hadith
     */
    async getGuidanceInsight(content: GuidanceContent, type: ContentType): Promise<string> {
        // Check cache first
        const cacheKey = cacheService.getAiInsightKey(content.id, type);
        const cached = await cacheService.get<string>(cacheKey);
        if (cached) return cached;

        const proxyUrl = getProxyUrl();
        if (!proxyUrl) throw new Error('AI service not configured');

        try {
            const prompt = type === 'verse' 
                ? `Provide a brief, spiritually uplifting insight and practical application for this Quranic verse: "${content.english}". Keep it under 100 words.`
                : `Provide a brief, spiritually uplifting insight and practical application for this Hadith: "${content.english}". Keep it under 100 words.`;

            const response = await axios.post(
                proxyUrl,
                {
                    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                    messages: [
                        {
                            role: "system",
                            content: "You are a knowledgeable and compassionate Islamic scholar providing gentle guidance and practical wisdom based on the Quran and Sunnah."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 250,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const result = response.data.choices[0].message.content.trim();
            // Cache for 7 days
            await cacheService.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
            return result;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.warn('AI insight request failed:', error.response?.status);
            }
            throw new Error('AI insights are temporarily unavailable. The verse speaks for itself — reflect on its meaning.');
        }
    }

    /**
     * Get personalized guidance based on user's situation
     */
    async getPersonalizedGuidance(situation: string, relevantContent?: GuidanceContent): Promise<string> {
        const proxyUrl = getProxyUrl();
        if (!proxyUrl) throw new Error('AI mentor is not configured yet. Please check your setup.');

        try {
            let userPrompt = `I am feeling: "${situation}". `;
            if (relevantContent) {
                userPrompt += `Based on this guidance: "${relevantContent.english}", please provide comfort and practical advice.`;
            } else {
                userPrompt += `Please provide comfort and practical advice rooted in Islamic wisdom.`;
            }

            const response = await axios.post(
                proxyUrl,
                {
                    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                    messages: [
                        {
                            role: "system",
                            content: "You are a compassionate spiritual mentor. Provide brief, supportive guidance based on Islamic principles. Keep it concise (under 150 words)."
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ],
                    max_tokens: 300,
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.warn('AI guidance request failed:', error.response?.status);
            }
            throw new Error('The AI mentor is temporarily resting. Please try again in a moment.');
        }
    }

    /**
     * Get a daily AI reflection for a specific guidance content
     */
    async getDailyReflection(content: GuidanceContent, type: ContentType): Promise<string> {
        const proxyUrl = getProxyUrl();
        if (!proxyUrl) throw new Error('AI service not configured');

        try {
            const prompt = `Provide a very brief (max 2 sentences), beautiful, and reflective spiritual thought based on this ${type}: "${content.english}". Focus on peace and daily motivation.`;

            const response = await axios.post(
                proxyUrl,
                {
                    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                    messages: [
                        {
                            role: "system",
                            content: "You are a poet and spiritual guide. Your reflections are concise, elegant, and deeply moving."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 150,
                    temperature: 0.8,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            return response.data.choices[0].message.content.trim().replace(/^"|"$/g, '');
        } catch (error) {
            console.warn('Daily reflection unavailable, using fallback');
            return "May this divine wisdom bring light and peace to your heart today.";
        }
    }

    /**
     * Classify a hadith text into mood categories using AI.
     * Returns an array of matching Mood values.
     * Results are cached for 30 days to avoid repeated API calls.
     */
    async classifyHadithMood(hadithText: string, hadithId: string): Promise<Mood[]> {
        const VALID_MOODS: Mood[] = ['grateful', 'peace', 'strength', 'guidance', 'celebrating', 'anxious', 'sad', 'hopeful'];

        // Check cache first
        const cacheKey = `ai_mood_hadith_${hadithId}`;
        const cached = await cacheService.get<Mood[]>(cacheKey);
        if (cached) return cached;

        const proxyUrl = getProxyUrl();
        if (!proxyUrl) {
            // Fallback: return generic moods if AI is unavailable
            return ['guidance', 'peace'];
        }

        try {
            const prompt = `Classify this hadith into 2-3 mood categories from this list ONLY: grateful, peace, strength, guidance, celebrating, anxious, sad, hopeful.

Hadith: "${hadithText.substring(0, 500)}"

Reply with ONLY a JSON array of mood strings, nothing else. Example: ["peace","guidance"]`;

            const response = await axios.post(
                proxyUrl,
                {
                    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                    messages: [
                        {
                            role: "system",
                            content: "You classify Islamic hadiths into emotional/spiritual mood categories. Reply ONLY with a valid JSON array of strings. No explanation."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.2,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000,
                }
            );

            const raw = response.data.choices[0].message.content.trim();
            // Extract JSON array from response
            const match = raw.match(/\[.*\]/s);
            if (match) {
                const parsed: string[] = JSON.parse(match[0]);
                const moods = parsed.filter(m => VALID_MOODS.includes(m as Mood)) as Mood[];
                if (moods.length > 0) {
                    // Cache for 30 days
                    await cacheService.set(cacheKey, moods, 30 * 24 * 60 * 60 * 1000);
                    return moods;
                }
            }

            return ['guidance', 'peace'];
        } catch (error) {
            console.warn('AI mood classification failed, using defaults');
            return ['guidance', 'peace'];
        }
    }
}

export default new AIService();
