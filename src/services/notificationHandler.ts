import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/appStore';
import verseService from './verseService';
import hadithService from './hadithService';
import namesOfAllahService from './namesOfAllahService';

interface NotificationHandler {
    initialize: () => void;
    cleanup: () => void;
}

class NotificationHandlerClass implements NotificationHandler {
    private responseListener: Notifications.Subscription | null = null;
    private navigationRef: any = null;

    /**
     * Initialize the notification handler
     * Sets up listeners for notification responses (when user taps notification)
     */
    initialize(): void {
        // Listen for notification taps (when app is in background or foreground)
        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            this.handleNotificationResponse
        );

        console.log('Notification handler initialized');
    }

    /**
     * Handle notification response (tap or action)
     */
    private handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
        try {
            const { actionIdentifier, notification } = response;
            const data = notification.request.content.data;

            console.log('Notification received with action:', actionIdentifier, data);

            // Handle Interactive Actions
            if (actionIdentifier === 'SAVE_ACTION') {
                await this.handleSaveAction(data.id as string, data.type as 'verse' | 'hadith');
                return;
            }

            // Default behavior (tap on notification or VIEW_ACTION)
            // Store the notification data globally so it can be picked up
            // when the app finishes loading or is already running
            const notifType = data.type === 'verse' ? 'daily_verse'
                : data.type === 'name' ? 'daily_name'
                : 'daily_hadith';

            pendingNotification = {
                type: notifType,
                id: data.id,
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error('Error handling notification response:', error);
        }
    };

    /**
     * Handle the 'Bookmark Heart' action from the notification
     */
    private async handleSaveAction(id: string, type: 'verse' | 'hadith' | 'name'): Promise<void> {
        try {
            console.log(`Handling save action for ${type}: ${id}`);
            const store = useAppStore.getState();
            
            if (type === 'verse') {
                const verse = await verseService.getVerseById(id);
                if (verse) await store.addToFavorites(verse);
            } else if (type === 'hadith') {
                const hadith = await hadithService.getHadithById(id);
                if (hadith) await store.addHadithToFavorites(hadith);
            }
            // Names of Allah don't have a save/favorite action yet
            console.log(`Content ${id} bookmarked successfully via notification action`);
        } catch (error) {
            console.error('Error in handleSaveAction:', error);
        }
    }

    /**
     * Set the navigation reference (to be called from App.tsx)
     */
    setNavigationRef(ref: any): void {
        this.navigationRef = ref;
    }

    /**
     * Clean up listeners when app unmounts
     */
    cleanup(): void {
        if (this.responseListener) {
            this.responseListener.remove();
            this.responseListener = null;
        }
        console.log('Notification handler cleaned up');
    }

    /**
     * Get and clear pending notification
     */
    getPendingNotification(): any {
        const pending = pendingNotification;
        pendingNotification = null;
        return pending;
    }
}

// Extend global type for TypeScript
declare global {
    var pendingNotification: any;
}

export default new NotificationHandlerClass();
