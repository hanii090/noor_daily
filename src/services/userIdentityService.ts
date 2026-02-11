import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import 'react-native-get-random-values';

/**
 * UserIdentityService
 * 
 * Manages anonymous user authentication with Supabase.
 * Users don't need to create accounts - we generate anonymous sessions
 * and persist the user ID locally for continuity.
 */

const USER_ID_KEY = '@noor_user_id';
const SESSION_KEY = '@noor_session';

class UserIdentityService {
    private userId: string | null = null;

    /**
     * Initialize user session
     * - Check if user already has a session
     * - If not, create anonymous session
     */
    async initialize(): Promise<string> {
        try {
            // Check for existing local user ID
            const existingUserId = await AsyncStorage.getItem(USER_ID_KEY);

            if (existingUserId) {
                __DEV__ && console.log('[UserIdentity] Found existing user ID:', existingUserId.substring(0, 8));
                this.userId = existingUserId;

                // Verify session is still valid
                const { data: { session }, error } = await supabase.auth.getSession();

                if (session && !error) {
                    __DEV__ && console.log('[UserIdentity] Existing session valid');
                    return existingUserId;
                }

                __DEV__ && console.log('[UserIdentity] Session expired, creating new one');
            }

            // Create new anonymous session
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error) {
                throw new Error(`Failed to sign in anonymously: ${error.message}`);
            }

            if (!data.user) {
                throw new Error('No user returned from anonymous sign in');
            }

            this.userId = data.user.id;
            await AsyncStorage.setItem(USER_ID_KEY, this.userId);

            __DEV__ && console.log('[UserIdentity] Created new anonymous user:', this.userId.substring(0, 8));

            return this.userId;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[UserIdentity] Initialization failed:', errorMessage);
            throw error;
        }
    }

    /**
     * Get current user ID
     * Will initialize if needed
     */
    async getUserId(): Promise<string> {
        if (this.userId) {
            return this.userId;
        }

        return await this.initialize();
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return !!session;
        } catch (error) {
            console.error('[UserIdentity] Auth check failed:', error);
            return false;
        }
    }

    /**
     * Sign out and clear user data
     * (For testing or user-requested data deletion)
     */
    async signOut(): Promise<void> {
        try {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem(USER_ID_KEY);
            this.userId = null;
            __DEV__ && console.log('[UserIdentity] Signed out');
        } catch (error) {
            console.error('[UserIdentity] Sign out failed:', error);
        }
    }

    /**
     * Get current session
     */
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }
}

export default new UserIdentityService();
