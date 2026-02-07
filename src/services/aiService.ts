import axios from 'axios';
import { GuidanceContent, ContentType } from '../types';

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

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error fetching AI insight:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Response:', error.response?.data);
            }
            throw new Error('Could not connect to AI service. Please try again later.');
        }
    }

    /**
     * Get personalized guidance based on user's situation
     */
    async getPersonalizedGuidance(situation: string, relevantContent?: GuidanceContent): Promise<string> {
        const proxyUrl = getProxyUrl();
        if (!proxyUrl) throw new Error('AI service not configured');

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
            console.error('Error fetching personalized guidance:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Response:', error.response?.data);
            }
            throw new Error('The AI mentor is currently unavailable.');
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
            console.error('Error fetching daily reflection:', error);
            return "May this divine wisdom bring light and peace to your heart today.";
        }
    }
}

export default new AIService();
