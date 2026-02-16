import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for UUID generation
import { Platform } from 'react-native';

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================
// TODO: Replace these with your actual Supabase project credentials
// Get these from: https://app.supabase.com/project/_/settings/api

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// =====================================================
// CREATE CLIENT
// =====================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        // Use anonymous sign-in for privacy
        // Users won't need to create accounts
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: undefined, // We'll use AsyncStorage via custom adapter
    },
    realtime: {
        // We don't need live updates for this app
    },
    global: {
        headers: {
            'X-Client-Info': `noor-daily-${Platform.OS}`,
        },
    },
});

// =====================================================
// DATABASE TYPES
// =====================================================
export interface HistoryEntry {
    id: string;
    user_id: string;
    date: string; // YYYY-MM-DD
    content_id: string;
    content_type: 'verse' | 'hadith' | 'name_of_allah' | 'dua';
    mood?: string;
    timestamp: string;
    created_at: string;
}

export interface ExamSession {
    id: string;
    user_id: string;
    timing: 'today' | 'tomorrow' | 'this_week';
    subject: string;
    feeling: 'stressed' | 'anxious' | 'tired' | 'confident' | 'hopeful';
    verse_id: string;
    exam_verse_category?: string;
    created_at: string;
}

export interface UserPreferences {
    user_id: string;
    favorites: any[];
    favorite_hadiths: any[];
    settings: Record<string, any>;
    updated_at: string;
}

// =====================================================
// HEALTH CHECK
// =====================================================
export async function checkSupabaseConnection(): Promise<boolean> {
    try {
        const { data, error } = await supabase.from('history_entries').select('count').limit(0);
        return !error;
    } catch (error) {
        console.error('[Supabase] Connection check failed:', error);
        return false;
    }
}

// =====================================================
// EXPORTS
// =====================================================
export default supabase;
