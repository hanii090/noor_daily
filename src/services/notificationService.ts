import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { Verse, Hadith, ContentType } from '../types';
import verseService from './verseService';
import hadithService from './hadithService';
import notificationTracker from './notificationTracker';
import analyticsService from './analyticsService';

// Notification title variations
const VERSE_TITLES = [
    "A message from the Quran ✨",
    "Divine guidance awaits 📖",
    "Your daily verse is here 🌙",
    "Wisdom from the Quran 💫"
];

const HADITH_TITLES = [
    "Wisdom from the Prophet ﷺ",
    "A saying to guide you 🕌",
    "Prophetic guidance 🌟",
    "The Prophet ﷺ said..."
];

interface QuietHours {
    start: string; // HH:mm
    end: string;   // HH:mm
}

class NotificationService {
    /**
     * Check if notifications are currently enabled and granted
     */
    async areNotificationsEnabled(): Promise<boolean> {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Request notification permissions from the user
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                Alert.alert(
                    'Notifications Disabled',
                    'Please enable notifications in your device Settings to receive daily guidance.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                } else {
                                    Linking.openSettings();
                                }
                            },
                        },
                    ]
                );
                return false;
            }

            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                }),
            });

            // Define Interactive Categories (The Apple Way)
            if (Platform.OS === 'ios') {
                await Notifications.setNotificationCategoryAsync('GUIDANCE_NOTIFICATION', [
                    {
                        identifier: 'SAVE_ACTION',
                        buttonTitle: 'Bookmark Heart',
                        options: {
                            opensAppToForeground: false,
                        },
                    },
                    {
                        identifier: 'VIEW_ACTION',
                        buttonTitle: 'View Reflection',
                        options: {
                            opensAppToForeground: true,
                        },
                    },
                ]);
            }

            return true;
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return false;
        }
    }

    /**
     * Schedule random notifications based on frequency and settings
     */
    async scheduleRandomDailyNotifications(
        frequency: number = 3, 
        contentType: 'verse' | 'hadith' | 'both' = 'both',
        quietHours?: QuietHours,
        isWeekend: boolean = false
    ): Promise<void> {
        try {
            await this.cancelAllNotifications();

            // Handle potential undefined values
            const safeFrequency = frequency || 3;
            const safeContentType = contentType || 'both';

            // Base time windows
            const timeWindows = [
                { name: 'Morning', start: [7, 30], end: [10, 30] },
                { name: 'Midday', start: [12, 0], end: [14, 0] },
                { name: 'Afternoon', start: [16, 0], end: [18, 0] },
                { name: 'Evening', start: [20, 0], end: [22, 0] }
            ];

            analyticsService.logNotificationScheduled(safeFrequency, safeContentType);

            // Schedule for the next 7 days to ensure variety and reliability
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                
                const isDayWeekend = date.getDay() === 0 || date.getDay() === 6;
                const actualFrequency = (isWeekend && isDayWeekend) ? Math.max(1, safeFrequency - 1) : safeFrequency;

                // Select windows based on frequency
                let selectedWindows = [];
                if (actualFrequency === 1) selectedWindows = [timeWindows[0]];
                else if (actualFrequency === 2) selectedWindows = [timeWindows[0], timeWindows[3]];
                else if (actualFrequency === 3) selectedWindows = [timeWindows[0], timeWindows[1], timeWindows[3]];
                else selectedWindows = [...timeWindows];

                for (const window of selectedWindows) {
                    const triggerTime = this.generateRandomTimeInWindow(
                        window.start[0], window.start[1], 
                        window.end[0], window.end[1],
                        date
                    );

                    // Skip if time is in the past (only relevant for dayOffset 0)
                    if (triggerTime < new Date()) continue;

                    // Check if triggerTime falls within quiet hours
                    if (quietHours && this.isTimeInQuietHours(triggerTime, quietHours)) {
                        continue;
                    }

                    const content = await this.getContentForNotification(contentType);
                    if (!content) continue;

                    const title = content.type === 'verse' 
                        ? VERSE_TITLES[Math.floor(Math.random() * VERSE_TITLES.length)]
                        : HADITH_TITLES[Math.floor(Math.random() * HADITH_TITLES.length)];

                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title,
                            body: content.preview,
                            sound: true,
                            badge: 1,
                            data: {
                                id: content.id,
                                type: content.type,
                            },
                            categoryIdentifier: 'GUIDANCE_NOTIFICATION'
                        },
                        trigger: {
                            date: triggerTime,
                            type: Notifications.SchedulableTriggerInputTypes.DATE,
                        } as Notifications.NotificationTriggerInput,
                    });
                }
            }

            console.log(`Scheduled notifications for the next 7 days`);
        } catch (error) {
            console.error('Error scheduling random notifications:', error);
        }
    }

    /**
     * Get random content ID for notification, avoiding duplicates
     * Does not fetch full content - only selects IDs and preview text
     */
    private async getContentForNotification(preferredType: 'verse' | 'hadith' | 'both'): Promise<{ id: string, type: ContentType, preview: string } | null> {
        const sentIds = await notificationTracker.getSentIdsToday();
        
        let type: ContentType;
        if (preferredType === 'both') {
            type = Math.random() > 0.5 ? 'verse' : 'hadith';
        } else {
            type = preferredType;
        }

        try {
            let id: string;
            let preview: string;
            
            if (type === 'verse') {
                const refs = verseService.getAllVerseReferences();
                // Filter out sent IDs
                const available = refs.filter(r => !sentIds.includes(`${r.surah}:${r.verse}`));
                
                if (available.length === 0) {
                    // All verses sent today, reset and use any
                    const ref = refs[Math.floor(Math.random() * refs.length)];
                    id = `${ref.surah}:${ref.verse}`;
                } else {
                    const ref = available[Math.floor(Math.random() * available.length)];
                    id = `${ref.surah}:${ref.verse}`;
                }
                
                preview = 'Quran guidance awaits ✨';
            } else {
                const hadiths = hadithService.getAllHadiths();
                // Filter out sent IDs
                const available = hadiths.filter(h => !sentIds.includes(h.id));
                
                if (available.length === 0) {
                    // All hadiths sent today, reset and use any
                    const hadith = hadiths[Math.floor(Math.random() * hadiths.length)];
                    id = hadith.id;
                    preview = hadith.english.substring(0, 45) + (hadith.english.length > 45 ? '...' : '');
                } else {
                    const hadith = available[Math.floor(Math.random() * available.length)];
                    id = hadith.id;
                    preview = hadith.english.substring(0, 45) + (hadith.english.length > 45 ? '...' : '');
                }
            }

            await notificationTracker.markAsSent(id);

            return {
                id,
                type,
                preview
            };
        } catch (error) {
            console.error('Error getting content for notification:', error);
            return null;
        }
    }

    /**
     * Generate random time within a specific hour/minute window for a specific date
     */
    private generateRandomTimeInWindow(startH: number, startM: number, endH: number, endM: number, targetDate: Date): Date {
        const date = new Date(targetDate);
        const startTotalMin = startH * 60 + startM;
        const endTotalMin = endH * 60 + endM;
        const randomTotalMin = startTotalMin + Math.floor(Math.random() * (endTotalMin - startTotalMin));
        
        date.setHours(Math.floor(randomTotalMin / 60));
        date.setMinutes(randomTotalMin % 60);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }

    /**
     * Check if a specific time falls within quiet hours
     */
    private isTimeInQuietHours(time: Date, quietHours: QuietHours): boolean {
        if (!quietHours.start || !quietHours.end) return false;
        
        const [startH, startM] = quietHours.start.split(':').map(Number);
        const [endH, endM] = quietHours.end.split(':').map(Number);
        
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;
        
        const currentMin = time.getHours() * 60 + time.getMinutes();
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        if (startMin < endMin) {
            return currentMin >= startMin && currentMin <= endMin;
        } else {
            // Overlaps midnight (e.g. 23:00 to 07:00)
            return currentMin >= startMin || currentMin <= endMin;
        }
    }

    /**
     * Cancel all scheduled notifications
     */
    async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Get all scheduled notifications
     */
    async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
        return await Notifications.getAllScheduledNotificationsAsync();
    }
}

export default new NotificationService();
