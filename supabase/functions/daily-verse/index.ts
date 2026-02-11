
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ── TYPES ──

interface VerseReference {
    surah: number;
    verse: number;
    moods: string[];
    theme: string;
}

interface Verse {
    id: string;
    surah: string;
    surahNumber: number;
    verseNumber: number;
    arabic: string;
    english: string;
    moods: string[];
    theme: string;
}

// ── DATA: Verse References (Embedded for self-containment) ──
const verseReferences: VerseReference[] = [
    // GRATEFUL - 35 verses
    { surah: 55, verse: 13, moods: ['grateful', 'celebrating'], theme: 'gratitude' },
    { surah: 14, verse: 7, moods: ['grateful', 'celebrating'], theme: 'gratitude' },
    { surah: 25, verse: 77, moods: ['grateful', 'guidance'], theme: 'prayer' },
    { surah: 13, verse: 28, moods: ['peace', 'grateful'], theme: 'remembrance' },
    { surah: 33, verse: 41, moods: ['grateful', 'peace'], theme: 'remembrance' },
    { surah: 22, verse: 77, moods: ['grateful', 'peace'], theme: 'worship' },
    { surah: 54, verse: 17, moods: ['grateful', 'guidance'], theme: 'remembrance' },
    { surah: 57, verse: 3, moods: ['guidance', 'grateful'], theme: 'unity' },
    { surah: 51, verse: 56, moods: ['guidance', 'grateful'], theme: 'purpose' },
    { surah: 28, verse: 77, moods: ['guidance', 'grateful'], theme: 'balance' },
    { surah: 35, verse: 29, moods: ['grateful', 'peace'], theme: 'devotion' },
    { surah: 18, verse: 46, moods: ['celebrating', 'grateful'], theme: 'worldlife' },
    { surah: 21, verse: 107, moods: ['grateful', 'celebrating'], theme: 'mercy' },
    { surah: 40, verse: 60, moods: ['peace', 'grateful'], theme: 'prayer' },
    { surah: 23, verse: 118, moods: ['peace', 'grateful'], theme: 'mercy' },
    { surah: 56, verse: 80, moods: ['grateful', 'celebrating'], theme: 'revelation' },
    { surah: 30, verse: 21, moods: ['grateful', 'celebrating'], theme: 'love' },
    { surah: 16, verse: 18, moods: ['grateful'], theme: 'blessings' },
    { surah: 3, verse: 191, moods: ['grateful', 'peace'], theme: 'reflection' },
    { surah: 34, verse: 13, moods: ['grateful'], theme: 'thankfulness' },
    { surah: 27, verse: 40, moods: ['grateful'], theme: 'gratitude' },
    { surah: 7, verse: 43, moods: ['grateful', 'celebrating'], theme: 'paradise' },
    { surah: 39, verse: 74, moods: ['grateful'], theme: 'praise' },
    { surah: 42, verse: 23, moods: ['grateful'], theme: 'reward' },
    { surah: 76, verse: 3, moods: ['grateful', 'guidance'], theme: 'guidance' },
    { surah: 17, verse: 111, moods: ['grateful', 'celebrating'], theme: 'praise' },
    { surah: 6, verse: 162, moods: ['grateful', 'peace'], theme: 'devotion' },
    { surah: 29, verse: 45, moods: ['grateful', 'peace'], theme: 'prayer' },
    { surah: 50, verse: 39, moods: ['grateful', 'peace'], theme: 'praise' },
    { surah: 96, verse: 1, moods: ['grateful', 'guidance'], theme: 'knowledge' },
    { surah: 1, verse: 2, moods: ['grateful'], theme: 'praise' },
    { surah: 73, verse: 8, moods: ['grateful', 'peace'], theme: 'remembrance' },
    { surah: 15, verse: 98, moods: ['grateful', 'peace'], theme: 'worship' },
    { surah: 52, verse: 48, moods: ['grateful', 'peace'], theme: 'patience' },
    { surah: 68, verse: 51, moods: ['grateful', 'peace'], theme: 'remembrance' },

    // PEACE - 35 verses
    { surah: 2, verse: 286, moods: ['strength', 'peace'], theme: 'comfort' },
    { surah: 94, verse: 5, moods: ['strength', 'peace'], theme: 'hope' },
    { surah: 94, verse: 6, moods: ['strength', 'peace'], theme: 'hope' },
    { surah: 2, verse: 153, moods: ['peace', 'strength'], theme: 'patience' },
    { surah: 3, verse: 159, moods: ['guidance', 'peace'], theme: 'mercy' },
    { surah: 39, verse: 53, moods: ['peace', 'guidance'], theme: 'mercy' },
    { surah: 7, verse: 56, moods: ['peace', 'guidance'], theme: 'mercy' },
    { surah: 2, verse: 186, moods: ['peace', 'grateful'], theme: 'closeness' },
    { surah: 3, verse: 173, moods: ['peace', 'strength'], theme: 'trust' },
    { surah: 2, verse: 45, moods: ['peace', 'strength'], theme: 'patience' },
    { surah: 9, verse: 51, moods: ['peace', 'strength'], theme: 'decree' },
    { surah: 10, verse: 65, moods: ['peace', 'strength'], theme: 'companionship' },
    { surah: 12, verse: 87, moods: ['peace', 'guidance'], theme: 'hope' },
    { surah: 65, verse: 3, moods: ['peace', 'strength'], theme: 'trust' },
    { surah: 60, verse: 8, moods: ['peace', 'guidance'], theme: 'justice' },
    { surah: 16, verse: 90, moods: ['guidance', 'peace'], theme: 'justice' },
    { surah: 25, verse: 63, moods: ['peace', 'guidance'], theme: 'humility' },
    { surah: 51, verse: 50, moods: ['peace', 'guidance'], theme: 'refuge' },
    { surah: 89, verse: 27, moods: ['peace', 'celebrating'], theme: 'tranquility' },
    { surah: 17, verse: 80, moods: ['guidance', 'peace'], theme: 'sincerity' },
    { surah: 42, verse: 38, moods: ['guidance', 'peace'], theme: 'consultation' },
    { surah: 57, verse: 22, moods: ['peace', 'strength'], theme: 'decree' },
    { surah: 4, verse: 58, moods: ['guidance', 'peace'], theme: 'trust' },
    { surah: 13, verse: 11, moods: ['peace', 'guidance'], theme: 'change' },
    { surah: 8, verse: 2, moods: ['peace', 'grateful'], theme: 'faith' },
    { surah: 48, verse: 4, moods: ['peace'], theme: 'tranquility' },
    { surah: 9, verse: 40, moods: ['peace', 'strength'], theme: 'support' },
    { surah: 20, verse: 2, moods: ['peace'], theme: 'comfort' },
    { surah: 36, verse: 58, moods: ['peace', 'celebrating'], theme: 'paradise' },
    { surah: 56, verse: 26, moods: ['peace', 'celebrating'], theme: 'paradise' },
    { surah: 19, verse: 62, moods: ['peace'], theme: 'paradise' },
    { surah: 50, verse: 34, moods: ['peace', 'celebrating'], theme: 'paradise' },
    { surah: 43, verse: 68, moods: ['peace'], theme: 'security' },
    { surah: 44, verse: 51, moods: ['peace', 'celebrating'], theme: 'paradise' },
    { surah: 88, verse: 8, moods: ['peace', 'celebrating'], theme: 'joy' },

    // STRENGTH
    { surah: 29, verse: 69, moods: ['strength', 'guidance'], theme: 'striving' },
    { surah: 67, verse: 2, moods: ['strength', 'guidance'], theme: 'purpose' },
    { surah: 8, verse: 46, moods: ['strength', 'guidance'], theme: 'obedience' },
    { surah: 103, verse: 3, moods: ['strength', 'guidance'], theme: 'success' },
    { surah: 11, verse: 112, moods: ['strength', 'guidance'], theme: 'steadfastness' },
    { surah: 90, verse: 17, moods: ['strength', 'guidance'], theme: 'patience' },
    { surah: 15, verse: 99, moods: ['guidance', 'strength'], theme: 'worship' },

    // GUIDANCE
    { surah: 49, verse: 13, moods: ['guidance', 'strength'], theme: 'piety' },
    { surah: 31, verse: 17, moods: ['guidance', 'strength'], theme: 'wisdom' },
    { surah: 4, verse: 103, moods: ['guidance', 'strength'], theme: 'prayer' },
    { surah: 5, verse: 2, moods: ['guidance', 'celebrating'], theme: 'cooperation' },
];

const API_BASE = "https://reminder.dev/api";

serve(async (req) => {
    try {
        // 1. Calculate today's deterministic index
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 0);
        const diff = today.getTime() - startOfYear.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const index = dayOfYear % verseReferences.length;
        const ref = verseReferences[index];

        console.log(`Processing daily verse for date: ${today.toISOString().split('T')[0]}, Index: ${index}, Ref: ${ref.surah}:${ref.verse}`);

        // 2. Fetch Verse Data from API
        // We fetch the whole chapter to get the surah name and verse details reliably
        const response = await fetch(`${API_BASE}/quran/${ref.surah}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch chapter ${ref.surah}: ${response.statusText}`);
        }

        const chapterData = await response.json();
        const apiVerse = chapterData.verses?.find((v: any) => v.number === ref.verse);

        if (!apiVerse) {
            throw new Error(`Verse ${ref.surah}:${ref.verse} not found in API response`);
        }

        const surahName = chapterData.english || chapterData.name || `Surah ${ref.surah}`;

        // 3. Construct Verse Object
        const verse: Verse = {
            id: `${ref.surah}:${ref.verse}`,
            surah: surahName,
            surahNumber: ref.surah,
            verseNumber: ref.verse,
            arabic: apiVerse.arabic,
            english: apiVerse.text,
            moods: ref.moods,
            theme: ref.theme
        };

        // 4. Insert into Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const todayStr = today.toISOString().split('T')[0];

        const { error } = await supabaseClient
            .from('daily_content')
            .upsert({
                date: todayStr,
                content_type: 'verse',
                content_id: verse.id,
                content_data: verse,
                metadata: {
                    day_of_year: dayOfYear,
                    source: 'daily-verse-edge-function'
                },
                updated_at: new Date().toISOString()
            }, { onConflict: 'date' });

        if (error) {
            throw error;
        }

        // 5. Return success
        return new Response(
            JSON.stringify({
                success: true,
                message: `Daily verse for ${todayStr} updated`,
                verse: verse.id
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error processing daily verse:", error);

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
