class AnalyticsService {
    /**
     * Log a custom event
     */
    logEvent(name: string, params: any = {}) {
        console.log(`[ANALYTICS] ${name}`, params);
        // In a real app, this would call Firebase Analytics, Mixpanel, etc.
    }

    // Hadith specific events
    logHadithViewed(hadithId: string, mood?: string, source: string = 'mood_selector') {
        this.logEvent('hadith_viewed', { hadith_id: hadithId, mood, source });
    }

    logHadithBookmarked(hadithId: string) {
        this.logEvent('hadith_bookmarked', { hadith_id: hadithId });
    }

    logHadithShared(hadithId: string, shareType: 'image' | 'text', template?: string) {
        this.logEvent('hadith_shared', { hadith_id: hadithId, share_type: shareType, template });
    }

    // Notification events
    logNotificationScheduled(frequency: number, contentType: string) {
        this.logEvent('notification_scheduled', { frequency, content_type: contentType });
    }

    logNotificationTapped(id: string, type: string) {
        this.logEvent('notification_tapped', { content_id: id, content_type: type });
    }
}

export default new AnalyticsService();
