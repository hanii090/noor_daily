class AnalyticsService {
    /**
     * Log a custom event
     */
    logEvent(_name: string, _params: any = {}) {
        // TODO: Wire to Firebase Analytics / Mixpanel in production
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
    // Journey events
    logJourneyStarted() {
        this.logEvent('journey_started');
    }

    logJourneyDayCompleted(day: number, journaled: boolean) {
        this.logEvent('journey_day_completed', { day_number: day, journaled });
    }

    logJourneyStreakMilestone(streak: number) {
        this.logEvent('journey_streak_milestone', { streak_count: streak });
    }

    logJourneyBadgeEarned(badgeId: string) {
        this.logEvent('journey_badge_earned', { badge_id: badgeId });
    }

    logJourneyShared(day: number, type: 'progress' | 'badge') {
        this.logEvent('journey_shared', { day_number: day, share_type: type });
    }

    logJourneyAbandoned(lastDay: number) {
        this.logEvent('journey_abandoned', { last_day: lastDay });
    }

    logJourneyCompleted() {
        this.logEvent('journey_completed_30_days');
    }

    // Exam Mode events
    logExamModeOpened() {
        this.logEvent('exam_mode_opened');
    }

    logExamSubjectSelected(subject: string) {
        this.logEvent('exam_subject_selected', { subject });
    }

    logExamVerseGenerated(feeling: string, timing: string) {
        this.logEvent('exam_verse_generated', { feeling, timing });
    }

    logExamWallpaperCreated() {
        this.logEvent('exam_wallpaper_created');
    }

    logExamVerseShared(method: string) {
        this.logEvent('exam_verse_shared', { method });
    }

    logStudyBreakStarted() {
        this.logEvent('study_break_started');
    }

    logPostExamReflectionSubmitted(outcome: string) {
        this.logEvent('post_exam_reflection_submitted', { outcome });
    }

    // Widget/Wallpaper events
    logWallpaperSaved(template: string) {
        this.logEvent('wallpaper_saved', { template });
    }

    logWallpaperShared(template: string) {
        this.logEvent('wallpaper_shared', { template });
    }

    logWidgetConfigUpdated(field: string, value: string) {
        this.logEvent('widget_config_updated', { field, value });
    }

    // Scripture events
    logScriptureOpened() {
        this.logEvent('scripture_opened');
    }

    logSurahViewed(surahNumber: number) {
        this.logEvent('surah_viewed', { surah_number: surahNumber });
    }

    logVerseBookmarkedFromReader(surahNumber: number, verseNumber: number) {
        this.logEvent('verse_bookmarked_from_reader', { surah_number: surahNumber, verse_number: verseNumber });
    }

    logReadingPlanStarted(planId: string) {
        this.logEvent('reading_plan_started', { plan_id: planId });
    }

    logReadingPlanDayCompleted(planId: string, day: number) {
        this.logEvent('reading_plan_day_completed', { plan_id: planId, day_number: day });
    }

    logCollectionViewed(collectionId: string) {
        this.logEvent('collection_viewed', { collection_id: collectionId });
    }
}

export default new AnalyticsService();
