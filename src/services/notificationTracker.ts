import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storageMigration';

interface TrackingData {
    date: string;
    sentIds: string[];
}

const TRACKING_KEY = STORAGE_KEYS.NOTIFICATIONS_TRACKING;

class NotificationTracker {
    /**
     * Get IDs of content sent today
     */
    async getSentIdsToday(): Promise<string[]> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await AsyncStorage.getItem(TRACKING_KEY);
            
            if (data) {
                const parsed: TrackingData = JSON.parse(data);
                if (parsed.date === today) {
                    return parsed.sentIds;
                }
            }
            
            // Reset for new day
            await this.resetTracker(today);
            return [];
        } catch (error) {
            console.error('Error getting sent IDs:', error);
            return [];
        }
    }

    /**
     * Mark an ID as sent today
     */
    async markAsSent(id: string): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const sentIds = await this.getSentIdsToday();
            
            if (!sentIds.includes(id)) {
                const newData: TrackingData = {
                    date: today,
                    sentIds: [...sentIds, id]
                };
                await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(newData));
            }
        } catch (error) {
            console.error('Error marking as sent:', error);
        }
    }

    /**
     * Reset tracker for a new date
     */
    async resetTracker(date: string): Promise<void> {
        const newData: TrackingData = {
            date,
            sentIds: []
        };
        await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(newData));
    }

    /**
     * Clear all tracking data
     */
    async clearAll(): Promise<void> {
        await AsyncStorage.removeItem(TRACKING_KEY);
    }
}

export default new NotificationTracker();
