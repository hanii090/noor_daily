import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_VERSION_KEY = '@noor_migration_version';
const CURRENT_VERSION = 1;

// Map of old keys → new keys
const KEY_MIGRATIONS: Record<string, string> = {
    '@onboarding_completed': '@noor_onboarding_completed',
    'favorites': '@noor_favorites',
    'favorite_hadiths': '@noor_favorite_hadiths',
    'settings': '@noor_settings',
    'daily_inspiration': '@noor_daily_inspiration',
    'notifications_sent_today': '@noor_notifications_sent_today',
    '@journey_progress': '@noor_journey_progress',
    '@exam_sessions': '@noor_exam_sessions',
    '@widget_config': '@noor_widget_config',
    '@widget_data': '@noor_widget_data',
};

/**
 * Run storage key migration if needed.
 * Copies data from old keys to new keys, then removes old keys.
 */
export async function runStorageMigration(): Promise<void> {
    try {
        const versionStr = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
        const version = versionStr ? parseInt(versionStr, 10) : 0;

        if (version >= CURRENT_VERSION) return;

        // Migration v0 → v1: Rename keys to @noor_ prefix
        if (version < 1) {
            const allKeys = await AsyncStorage.getAllKeys();

            for (const [oldKey, newKey] of Object.entries(KEY_MIGRATIONS)) {
                if (allKeys.includes(oldKey)) {
                    const value = await AsyncStorage.getItem(oldKey);
                    if (value !== null) {
                        await AsyncStorage.setItem(newKey, value);
                        await AsyncStorage.removeItem(oldKey);
                    }
                }
            }

            // Migrate history_ prefix keys to @noor_history_ prefix
            const historyKeys = allKeys.filter(k => k.startsWith('history_'));
            for (const oldKey of historyKeys) {
                const value = await AsyncStorage.getItem(oldKey);
                if (value !== null) {
                    const newKey = `@noor_${oldKey}`;
                    await AsyncStorage.setItem(newKey, value);
                    await AsyncStorage.removeItem(oldKey);
                }
            }
        }

        await AsyncStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_VERSION));
    } catch (error) {
        // Migration errors are non-fatal — old keys still work
    }
}

// Normalized key constants for use across the app
export const STORAGE_KEYS = {
    ONBOARDING: '@noor_onboarding_completed',
    FAVORITES: '@noor_favorites',
    FAVORITE_HADITHS: '@noor_favorite_hadiths',
    SETTINGS: '@noor_settings',
    DAILY_INSPIRATION: '@noor_daily_inspiration',
    NOTIFICATIONS_TRACKING: '@noor_notifications_sent_today',
    JOURNEY_PROGRESS: '@noor_journey_progress',
    EXAM_SESSIONS: '@noor_exam_sessions',
    WIDGET_CONFIG: '@noor_widget_config',
    WIDGET_DATA: '@noor_widget_data',
    HISTORY_PREFIX: '@noor_history_',
} as const;
