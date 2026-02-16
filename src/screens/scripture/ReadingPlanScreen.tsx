import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';
import { ReadingPlan, ReadingPlanProgress } from '../../types';
import { useAppStore } from '../../store/appStore';
import scriptureService from '../../services/scriptureService';
import analyticsService from '../../services/analyticsService';
import { useTranslation } from 'react-i18next';

interface ReadingPlanScreenProps {
    onOpenReader: (surahNumber: number, verseNumber: number) => void;
    onClose: () => void;
}

const PlanCard: React.FC<{
    plan: ReadingPlan;
    onStart: () => void;
    tc: any;
    t: any;
}> = ({ plan, onStart, tc, t }) => (
    <TouchableOpacity
        style={[styles.planCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
        onPress={onStart}
        activeOpacity={0.7}
    >
        <Text style={styles.planIcon}>{plan.icon}</Text>
        <Text style={[styles.planName, { color: tc.text }]}>
            {t(plan.nameKey, { defaultValue: plan.nameKey })}
        </Text>
        <Text style={[styles.planDesc, { color: tc.textSecondary }]}>
            {t(plan.descKey, { defaultValue: plan.descKey })}
        </Text>
        <View style={[styles.planMeta, { borderTopColor: tc.border }]}>
            <Text style={[styles.planMetaText, { color: tc.textTertiary }]}>
                {plan.totalDays} {t('scripture.days', { defaultValue: 'days' })}
            </Text>
            <Text style={[styles.planMetaText, { color: tc.textTertiary }]}>
                ~{plan.dailyReadings[0]?.estimatedMinutes || 15} {t('scripture.min_day', { defaultValue: 'min/day' })}
            </Text>
        </View>
    </TouchableOpacity>
);

export const ReadingPlanScreen: React.FC<ReadingPlanScreenProps> = ({ onOpenReader, onClose }) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const {
        readingPlanProgress,
        startReadingPlan,
        completeReadingDay,
        abandonReadingPlan,
    } = useAppStore();

    const plans = scriptureService.getReadingPlans();
    const activePlan = readingPlanProgress
        ? scriptureService.getReadingPlan(readingPlanProgress.planId)
        : null;

    const handleStartPlan = useCallback((planId: string) => {
        if (readingPlanProgress) {
            Alert.alert(
                t('scripture.switch_plan_title', { defaultValue: 'Switch Plan?' }),
                t('scripture.switch_plan_msg', { defaultValue: 'Starting a new plan will abandon your current progress. Continue?' }),
                [
                    { text: t('scripture.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                    {
                        text: t('scripture.switch', { defaultValue: 'Switch' }),
                        style: 'destructive',
                        onPress: async () => {
                            await abandonReadingPlan();
                            await startReadingPlan(planId);
                            analyticsService.logReadingPlanStarted(planId);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        },
                    },
                ]
            );
        } else {
            startReadingPlan(planId);
            analyticsService.logReadingPlanStarted(planId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [readingPlanProgress, startReadingPlan, abandonReadingPlan, t]);

    const handleReadToday = useCallback(() => {
        if (!activePlan || !readingPlanProgress) return;
        const todayReading = activePlan.dailyReadings.find(
            (r) => r.day === readingPlanProgress.currentDay
        );
        if (todayReading) {
            onOpenReader(todayReading.startSurah, todayReading.startVerse);
        }
    }, [activePlan, readingPlanProgress, onOpenReader]);

    const handleCompleteToday = useCallback(() => {
        if (!readingPlanProgress) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        completeReadingDay(readingPlanProgress.currentDay);
        if (readingPlanProgress.planId) {
            analyticsService.logReadingPlanDayCompleted(readingPlanProgress.planId, readingPlanProgress.currentDay);
        }
    }, [readingPlanProgress, completeReadingDay]);

    const handleAbandon = useCallback(() => {
        Alert.alert(
            t('scripture.abandon_title', { defaultValue: 'Abandon Plan?' }),
            t('scripture.abandon_msg', { defaultValue: 'All progress will be lost. Are you sure?' }),
            [
                { text: t('scripture.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                {
                    text: t('scripture.abandon', { defaultValue: 'Abandon' }),
                    style: 'destructive',
                    onPress: () => abandonReadingPlan(),
                },
            ]
        );
    }, [abandonReadingPlan, t]);

    const progressPercent = readingPlanProgress && activePlan
        ? Math.round((readingPlanProgress.completedDays.length / activePlan.totalDays) * 100)
        : 0;

    const todayReading = activePlan && readingPlanProgress
        ? activePlan.dailyReadings.find((r) => r.day === readingPlanProgress.currentDay)
        : null;

    const isCompleted = !!readingPlanProgress?.completedAt;

    return (
        <View style={[styles.container, { backgroundColor: tc.background }]}>
            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.headerBlur, { borderBottomColor: tc.border }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.headerBackBtn}
                    >
                        <Ionicons name="chevron-back" size={24} color={tc.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: tc.text }]}>
                            {t('scripture.reading_plans', { defaultValue: 'Reading Plans' })}
                        </Text>
                    </View>
                    <View style={styles.headerRight} />
                </BlurView>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Active Plan Progress */}
                {readingPlanProgress && activePlan && !isCompleted && (
                    <View style={[styles.activeCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
                        <View style={styles.activeHeader}>
                            <Text style={styles.activeIcon}>{activePlan.icon}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.activeName, { color: tc.text }]}>
                                    {t(activePlan.nameKey, { defaultValue: activePlan.nameKey })}
                                </Text>
                                <Text style={[styles.activeProgress, { color: tc.textSecondary }]}>
                                    {readingPlanProgress.completedDays.length} / {activePlan.totalDays} {t('scripture.days', { defaultValue: 'days' })}
                                </Text>
                            </View>
                            <Text style={[styles.activePercent, { color: tc.teal }]}>{progressPercent}%</Text>
                        </View>

                        {/* Progress bar */}
                        <View style={[styles.progressBarBg, { backgroundColor: tc.border }]}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: tc.teal }]} />
                        </View>

                        {/* Today's reading */}
                        {todayReading && (
                            <View style={styles.todaySection}>
                                <Text style={[styles.todayLabel, { color: tc.textTertiary }]}>
                                    {t('scripture.todays_reading', { defaultValue: "TODAY'S READING" })}
                                </Text>
                                <Text style={[styles.todayRange, { color: tc.text }]}>
                                    {t('scripture.day', { defaultValue: 'Day' })} {todayReading.day}: {t('scripture.surah', { defaultValue: 'Surah' })} {todayReading.startSurah}:{todayReading.startVerse} – {todayReading.endSurah}:{todayReading.endVerse}
                                </Text>
                                <Text style={[styles.todayEst, { color: tc.textTertiary }]}>
                                    ~{todayReading.estimatedMinutes} {t('scripture.minutes', { defaultValue: 'minutes' })}
                                </Text>

                                <View style={styles.todayActions}>
                                    <TouchableOpacity
                                        style={[styles.readBtn, { backgroundColor: tc.teal }]}
                                        onPress={handleReadToday}
                                    >
                                        <Ionicons name="book-outline" size={16} color="#fff" />
                                        <Text style={styles.readBtnText}>
                                            {t('scripture.read_now', { defaultValue: 'Read Now' })}
                                        </Text>
                                    </TouchableOpacity>

                                    {!readingPlanProgress.completedDays.includes(readingPlanProgress.currentDay) && (
                                        <TouchableOpacity
                                            style={[styles.completeBtn, { borderColor: tc.teal }]}
                                            onPress={handleCompleteToday}
                                        >
                                            <Ionicons name="checkmark" size={16} color={tc.teal} />
                                            <Text style={[styles.completeBtnText, { color: tc.teal }]}>
                                                {t('scripture.mark_complete', { defaultValue: 'Mark Complete' })}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        <TouchableOpacity onPress={handleAbandon} style={styles.abandonBtn}>
                            <Text style={[styles.abandonText, { color: tc.coral }]}>
                                {t('scripture.abandon_plan', { defaultValue: 'Abandon Plan' })}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Completed state */}
                {isCompleted && activePlan && (
                    <View style={[styles.completedCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.teal }]}>
                        <Text style={styles.completedIcon}>🎉</Text>
                        <Text style={[styles.completedTitle, { color: tc.text }]}>
                            {t('scripture.plan_complete', { defaultValue: 'MashaAllah!' })}
                        </Text>
                        <Text style={[styles.completedDesc, { color: tc.textSecondary }]}>
                            {t('scripture.plan_complete_desc', { defaultValue: 'You completed the reading plan. May Allah accept your efforts.' })}
                        </Text>
                        <TouchableOpacity
                            style={[styles.readBtn, { backgroundColor: tc.teal, marginTop: spacing.base }]}
                            onPress={() => {
                                abandonReadingPlan();
                            }}
                        >
                            <Text style={styles.readBtnText}>
                                {t('scripture.start_new', { defaultValue: 'Start a New Plan' })}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Plan Selection */}
                <View style={styles.plansSection}>
                    <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>
                        {readingPlanProgress && !isCompleted
                            ? t('scripture.other_plans', { defaultValue: 'OTHER PLANS' })
                            : t('scripture.choose_plan', { defaultValue: 'CHOOSE A PLAN' })}
                    </Text>

                    {plans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onStart={() => handleStartPlan(plan.id)}
                            tc={tc}
                            t={t}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h3,
        fontSize: 17,
        fontWeight: '700',
    },
    headerRight: {
        width: 40,
    },
    activeCard: {
        marginHorizontal: spacing.base,
        marginBottom: spacing.lg,
        borderRadius: 16,
        padding: spacing.base,
        borderWidth: 1,
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.base,
    },
    activeIcon: {
        fontSize: 28,
    },
    activeName: {
        ...typography.body,
        fontSize: 16,
        fontWeight: '700',
    },
    activeProgress: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 2,
    },
    activePercent: {
        fontSize: 20,
        fontWeight: '800',
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.base,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    todaySection: {
        paddingTop: spacing.sm,
    },
    todayLabel: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: spacing.xs,
    },
    todayRange: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '600',
    },
    todayEst: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 2,
    },
    todayActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.base,
    },
    readBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    readBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    completeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    completeBtnText: {
        fontWeight: '700',
        fontSize: 14,
    },
    abandonBtn: {
        alignItems: 'center',
        marginTop: spacing.base,
        paddingVertical: spacing.xs,
    },
    abandonText: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '600',
    },
    completedCard: {
        marginHorizontal: spacing.base,
        marginBottom: spacing.lg,
        borderRadius: 16,
        padding: spacing.xl,
        borderWidth: 2,
        alignItems: 'center',
    },
    completedIcon: {
        fontSize: 48,
        marginBottom: spacing.sm,
    },
    completedTitle: {
        ...typography.h2,
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    completedDesc: {
        ...typography.body,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    plansSection: {
        paddingHorizontal: spacing.base,
    },
    sectionTitle: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: spacing.base,
    },
    planCard: {
        borderRadius: 16,
        padding: spacing.base,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    planIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    planName: {
        ...typography.body,
        fontSize: 16,
        fontWeight: '700',
    },
    planDesc: {
        ...typography.body,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
    },
    planMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 0.5,
    },
    planMetaText: {
        ...typography.caption,
        fontSize: 12,
    },
});

export default ReadingPlanScreen;
