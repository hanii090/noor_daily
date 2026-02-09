import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { Verse, Hadith, ContentType } from '../types';
import verseService from './verseService';
import hadithService from './hadithService';
import namesOfAllahService from './namesOfAllahService';
import reminderApiService from './reminderApiService';
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

const NAME_TITLES = [
    "Know your Lord 🤲",
    "A Beautiful Name of Allah ✨",
    "Reflect on His Name 🌙",
    "99 Names — Today's Reminder 💫"
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

            // Define Interactive Categories
            if (Platform.OS === 'ios') {
                await Notifications.setNotificationCategoryAsync('GUIDANCE_NOTIFICATION', [
                    {
                        identifier: 'SAVE_ACTION',
                        buttonTitle: '❤️ Save',
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
     * Cancel only daily guidance notifications, preserving journey-related ones.
     */
    async cancelDailyGuidanceNotifications(): Promise<void> {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            for (const notif of scheduled) {
                const data = notif.content.data as Record<string, any> | undefined;
                // Only cancel non-journey notifications
                if (!data?.type?.startsWith('journey_')) {
                    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                }
            }
        } catch (error) {
            console.error('Error cancelling daily guidance notifications:', error);
        }
    }

    /**
     * Schedule random notifications based on frequency and settings.
     * Now schedules for 14 days (was 7) and preserves journey notifications.
     */
    async scheduleRandomDailyNotifications(
        frequency: number = 3, 
        contentType: 'verse' | 'hadith' | 'both' = 'both',
        quietHours?: QuietHours,
        isWeekend: boolean = false
    ): Promise<void> {
        try {
            // Only cancel daily guidance, preserve journey notifications
            await this.cancelDailyGuidanceNotifications();

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

            // Schedule for 14 days to reduce the notification cliff
            for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                
                const isDayWeekend = date.getDay() === 0 || date.getDay() === 6;
                const actualFrequency = (isWeekend && isDayWeekend) ? Math.max(1, safeFrequency - 1) : safeFrequency;

                let selectedWindows = [];
                if (actualFrequency === 1) selectedWindows = [timeWindows[0]];
                else if (actualFrequency === 2) selectedWindows = [timeWindows[0], timeWindows[3]];
                else if (actualFrequency === 3) selectedWindows = [timeWindows[0], timeWindows[1], timeWindows[3]];
                else selectedWindows = [...timeWindows];

                const slotTypes: (ContentType | undefined)[] = ['verse', 'hadith', 'name', undefined];

                for (let wi = 0; wi < selectedWindows.length; wi++) {
                    const window = selectedWindows[wi];
                    const triggerTime = this.generateRandomTimeInWindow(
                        window.start[0], window.start[1], 
                        window.end[0], window.end[1],
                        date
                    );

                    if (triggerTime < new Date()) continue;

                    if (quietHours && this.isTimeInQuietHours(triggerTime, quietHours)) {
                        continue;
                    }

                    // Use local fallback content if network fails
                    const forcedType = slotTypes[wi % slotTypes.length];
                    const content = await this.getContentForNotification(forcedType);
                    if (!content) continue;

                    const title = content.type === 'verse'
                        ? VERSE_TITLES[Math.floor(Math.random() * VERSE_TITLES.length)]
                        : content.type === 'hadith'
                            ? HADITH_TITLES[Math.floor(Math.random() * HADITH_TITLES.length)]
                            : NAME_TITLES[Math.floor(Math.random() * NAME_TITLES.length)];

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
                            categoryIdentifier: 'GUIDANCE_NOTIFICATION',
                            ...(Platform.OS === 'ios' ? { threadId: 'noor-daily-guidance' } : {}),
                        },
                        trigger: {
                            date: triggerTime,
                            type: Notifications.SchedulableTriggerInputTypes.DATE,
                        } as Notifications.NotificationTriggerInput,
                    });
                }
            }
        } catch (error) {
            console.error('Error scheduling random notifications:', error);
        }
    }

    /**
     * Get content for a notification with real English preview text.
     * Supports 3 content types: verse, hadith, name (Name of Allah).
     * The notification body shows the English translation so users see
     * meaningful text on their lock screen. Tapping opens the full view.
     */
    private async getContentForNotification(forcedType?: ContentType): Promise<{ id: string, type: ContentType, preview: string } | null> {
        const sentIds = await notificationTracker.getSentIdsToday();

        const type: ContentType = forcedType || (['verse', 'hadith', 'name'] as ContentType[])[Math.floor(Math.random() * 3)];

        try {
            let id: string;
            let preview: string;

            if (type === 'verse') {
                const refs = verseService.getAllVerseReferences();
                const available = refs.filter(r => !sentIds.includes(`${r.surah}:${r.verse}`));
                const ref = available.length > 0
                    ? available[Math.floor(Math.random() * available.length)]
                    : refs[Math.floor(Math.random() * refs.length)];
                id = `${ref.surah}:${ref.verse}`;

                // Fetch actual English text for the preview
                try {
                    const apiVerse = await reminderApiService.getVerse(ref.surah, ref.verse);
                    const text = apiVerse.text || '';
                    const truncated = text.length > 120 ? text.substring(0, 117) + '...' : text;
                    preview = `"${truncated}" — Quran ${ref.surah}:${ref.verse}`;
                } catch {
                    preview = `A verse from Surah ${ref.surah} awaits you`;
                }

            } else if (type === 'hadith') {
                const hadiths = hadithService.getAllHadiths();
                const available = hadiths.filter(h => !sentIds.includes(h.id));
                const hadith = available.length > 0
                    ? available[Math.floor(Math.random() * available.length)]
                    : hadiths[Math.floor(Math.random() * hadiths.length)];
                id = hadith.id;

                const text = hadith.english || '';
                const truncated = text.length > 120 ? text.substring(0, 117) + '...' : text;
                preview = `"${truncated}" — ${hadith.reference || hadith.collection}`;

            } else {
                // Name of Allah
                try {
                    const name = await namesOfAllahService.getRandomName();
                    id = `name_${name.number}`;
                    preview = `${name.arabic}  ${name.english} — ${name.meaning}`;
                } catch {
                    // Fallback to a well-known name
                    id = 'name_1';
                    preview = 'ٱلرَّحْمَـٰنُ  Ar-Rahman — The Most Merciful';
                }
            }

            await notificationTracker.markAsSent(id);

            return { id, type, preview };
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
     * Cancel all scheduled notifications (use sparingly — prefer cancelDailyGuidanceNotifications)
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

    // ── Journey Notifications ──

    /**
     * Schedule daily journey reminders for the next 7 days (not just one-shot).
     */
    async scheduleJourneyReminder(currentDay: number, notificationTime: string = '08:00'): Promise<void> {
        try {
            await this.cancelJourneyReminders();

            const [hours, minutes] = notificationTime.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return;

            // Schedule for the next 7 days so reminders persist
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const trigger = new Date();
                trigger.setDate(trigger.getDate() + dayOffset);
                trigger.setHours(hours, minutes, 0, 0);

                if (trigger <= new Date()) continue;

                const dayNum = currentDay + dayOffset;
                if (dayNum > 30) break;

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `Your Day ${dayNum} verse awaits 🌙`,
                        body: 'Continue your 30-day spiritual journey today.',
                        sound: true,
                        data: { type: 'journey_reminder', day: dayNum },
                        ...(Platform.OS === 'ios' ? { threadId: 'noor-daily-journey' } : {}),
                    },
                    trigger: {
                        date: trigger,
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                    } as Notifications.NotificationTriggerInput,
                });
            }
        } catch (error) {
            console.error('Error scheduling journey reminder:', error);
        }
    }

    /**
     * Schedule streak-at-risk notifications: 8 PM today and 8 AM next morning.
     */
    async scheduleStreakRiskNotification(streak: number): Promise<void> {
        try {
            const now = new Date();

            // Evening reminder at 8 PM (if not past)
            const evening = new Date();
            evening.setHours(20, 0, 0, 0);
            if (evening > now) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `Don't break your ${streak}-day streak! 🔥`,
                        body: "You haven't completed today's journey reflection yet.",
                        sound: true,
                        data: { type: 'journey_streak_risk', streak },
                        ...(Platform.OS === 'ios' ? { threadId: 'noor-daily-journey' } : {}),
                    },
                    trigger: {
                        date: evening,
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                    } as Notifications.NotificationTriggerInput,
                });
            }

            // Next morning fallback at 8 AM
            const morning = new Date();
            morning.setDate(morning.getDate() + 1);
            morning.setHours(8, 0, 0, 0);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `Your ${streak}-day streak needs you! 🌅`,
                    body: 'Open your journey to keep your streak alive.',
                    sound: true,
                    data: { type: 'journey_streak_risk', streak },
                    ...(Platform.OS === 'ios' ? { threadId: 'noor-daily-journey' } : {}),
                },
                trigger: {
                    date: morning,
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                } as Notifications.NotificationTriggerInput,
            });
        } catch (error) {
            console.error('Error scheduling streak risk notification:', error);
        }
    }

    /**
     * Send an immediate milestone notification
     */
    async sendMilestoneNotification(day: number, badgeEmoji: string, badgeName: string): Promise<void> {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `${badgeEmoji} ${badgeName} Earned!`,
                    body: `You've completed ${day} days of your spiritual journey. Keep going!`,
                    sound: true,
                    data: { type: 'journey_milestone', day },
                },
                trigger: null, // Immediate
            });
        } catch (error) {
            console.error('Error sending milestone notification:', error);
        }
    }

    /**
     * Cancel all journey-related notifications
     */
    private async cancelJourneyReminders(): Promise<void> {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            for (const notif of scheduled) {
                const data = notif.content.data as Record<string, any> | undefined;
                if (data?.type?.startsWith('journey_')) {
                    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                }
            }
        } catch (error) {
            console.error('Error cancelling journey reminders:', error);
        }
    }
}

export default new NotificationService();
