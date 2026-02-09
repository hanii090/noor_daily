import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseBackground, ClubhouseCard, ClubhouseButton, ClubhouseHeader } from '../components/clubhouse';
import { JourneyDayView } from '../components/journey/JourneyDayView';
import { JourneyBadgeCard } from '../components/journey/JourneyBadgeCard';
import { JourneyShareCard, shareJourneyProgress } from '../components/journey/JourneyShareCard';
import ViewShot from 'react-native-view-shot';
import { colors, useTheme, typography, spacing } from '../theme';
import { ConfettiOverlay } from '../components/common';
import { useAppStore } from '../store/appStore';
import { JourneyBadge, JourneyDay } from '../types';
import journeyService from '../services/journeyService';
import analyticsService from '../services/analyticsService';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CALENDAR_COLS = 6;
const CALENDAR_GAP = 10;
const CALENDAR_DAY_SIZE = Math.floor(
    (SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2 - CALENDAR_GAP * (CALENDAR_COLS - 1)) / CALENDAR_COLS
);

// ── Floating Preview Card (matches onboarding style) ──
const FloatingCard: React.FC<{
    children: React.ReactNode;
    style?: any;
    delay?: number;
    rotation?: number;
}> = ({ children, style, delay = 0, rotation = 0 }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const entryAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(entryAnim, {
            toValue: 1,
            tension: 30,
            friction: 8,
            delay,
            useNativeDriver: true,
        }).start();

        const float = () => {
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 2500 + delay, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2500 + delay, useNativeDriver: true }),
            ]).start(() => float());
        };
        setTimeout(float, delay);
    }, []);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
    });

    return (
        <Animated.View
            style={[
                {
                    opacity: entryAnim,
                    transform: [
                        { translateY: Animated.add(translateY, entryAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] })) },
                        { scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                        { rotate: `${rotation}deg` },
                    ],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
};

const THEME_COLORS: Record<string, string> = {
    gratitude: '#D4A853',
    patience: '#8B7EC8',
    wisdom: '#5AAFA0',
    peace: '#6BAF8D',
    purpose: '#C97B7B',
};

const THEME_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    gratitude: 'heart',
    patience: 'hourglass',
    wisdom: 'bulb',
    peace: 'leaf',
    purpose: 'compass',
};

const THEME_LABELS: Record<string, string> = {
    gratitude: 'Gratitude',
    patience: 'Patience',
    wisdom: 'Wisdom',
    peace: 'Peace',
    purpose: 'Purpose',
};

const JourneyScreen = () => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const {
        journeyProgress,
        journeyStatus,
        loadJourneyProgress,
        startJourney,
        resetJourney,
    } = useAppStore();

    const [showDayView, setShowDayView] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [currentDay, setCurrentDay] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const [allBadges, setAllBadges] = useState<JourneyBadge[]>([]);
    const [journeyDays, setJourneyDays] = useState<JourneyDay[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [canUseFreeze, setCanUseFreeze] = useState(false);
    const [accessibleDays, setAccessibleDays] = useState<Set<number>>(new Set([1]));
    const certificateRef = React.useRef<ViewShot>(null);

    const progressAnim = React.useRef(new Animated.Value(0)).current;
    const heroAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadData();
        Animated.spring(heroAnim, {
            toValue: 1,
            tension: 30,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        if (journeyProgress) {
            const pct = journeyProgress.completedDays.length / 30;
            Animated.timing(progressAnim, {
                toValue: pct,
                duration: 800,
                useNativeDriver: false,
            }).start();
        }
    }, [journeyProgress?.completedDays.length]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await loadJourneyProgress();
            const day = await journeyService.getCurrentDay();
            setCurrentDay(day);
            setAllBadges(journeyService.getAllBadges());
            setJourneyDays(journeyService.getJourneyData());
            const freezeAvailable = await journeyService.canUseStreakFreeze();
            setCanUseFreeze(freezeAvailable);

            // Build set of accessible (unlocked) days — computed locally to avoid 30 async calls
            const accessible = new Set<number>([1]); // Day 1 is always accessible
            const progress = useAppStore.getState().journeyProgress;
            if (progress) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                for (let d = 2; d <= 30; d++) {
                    if (!progress.completedDays.includes(d - 1)) continue;
                    const prevDate = progress.completionDates?.[d - 1];
                    if (!prevDate) {
                        // Legacy data — fall back to calendar day check
                        if (d <= day) accessible.add(d);
                    } else {
                        const completedOn = new Date(prevDate);
                        completedOn.setHours(0, 0, 0, 0);
                        if (today.getTime() > completedOn.getTime()) accessible.add(d);
                    }
                }
            }
            setAccessibleDays(accessible);
        } catch (error) {
            console.error('Error loading journey data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartJourney = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await startJourney();
        analyticsService.logJourneyStarted();
        await loadData();
    };

    // Find the next day the user can work on (accessible + not completed)
    const nextAvailableDay = (() => {
        for (let d = 1; d <= 30; d++) {
            if (accessibleDays.has(d) && !(journeyProgress?.completedDays.includes(d))) {
                return d;
            }
        }
        return null; // All accessible days are completed — wait for tomorrow
    })();

    const handleContinueJourney = () => {
        if (!nextAvailableDay) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedDay(nextAvailableDay);
        setShowDayView(true);
    };

    const handleDaySelect = (day: number) => {
        if (!journeyProgress) return;
        if (accessibleDays.has(day)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedDay(day);
            setShowDayView(true);
        }
    };

    const handleDayComplete = async () => {
        setShowDayView(false);
        await loadData();
        // Show confetti on milestone days (every 5 days)
        const completed = (journeyProgress?.completedDays.length ?? 0) + 1;
        if (completed % 5 === 0 || completed === 30) {
            setShowConfetti(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleStreakFreeze = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            t('journey.use_freeze_title'),
            t('journey.use_freeze_message'),
            [
                { text: t('journey.cancel'), style: 'cancel' },
                {
                    text: t('journey.use_freeze'),
                    onPress: async () => {
                        await journeyService.useStreakFreeze();
                        setCanUseFreeze(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const handleResetJourney = () => {
        Alert.alert(
            t('journey.reset_title'),
            t('journey.reset_message'),
            [
                { text: t('journey.cancel'), style: 'cancel' },
                {
                    text: t('journey.reset'),
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        if (journeyProgress) {
                            analyticsService.logJourneyAbandoned(
                                journeyProgress.completedDays.length
                            );
                        }
                        await resetJourney();
                        await loadData();
                    },
                },
            ]
        );
    };

    const getCompletedCount = () => journeyProgress?.completedDays.length ?? 0;
    const getStreakCount = () => journeyProgress?.currentStreak ?? 0;

    const isBadgeEarned = (badge: JourneyBadge) => {
        if (!journeyProgress) return false;
        return journeyProgress.completedDays.includes(badge.dayRequired);
    };

    const BOTTOM_PAD = insets.bottom + 120;

    // ── Loading State ──
    if (isLoading) {
        return (
            <ClubhouseBackground>
                <ClubhouseHeader title="30-Day Journey" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tc.purple} />
                </View>
            </ClubhouseBackground>
        );
    }

    // ── Not Started State (Onboarding-style hero) ──
    if (journeyStatus === 'not_started') {
        return (
            <View style={[styles.notStartedContainer, { backgroundColor: tc.creamLight }]}>
                {/* ── Hero Section (top ~50%) ── */}
                <View style={[styles.nsHeroSection, { backgroundColor: isDark ? '#1A1030' : '#EDE5F7' }]}>
                    <View style={[styles.nsHeroOverlay1, { backgroundColor: isDark ? '#2D1B69' : '#D8CCF0' }]} />
                    <View style={[styles.nsHeroOverlay2, { backgroundColor: isDark ? '#1E1245' : '#E8DFF5' }]} />

                    <View style={[styles.nsFloatingContainer, { paddingTop: insets.top + 20 }]}>
                        {/* Day card — main floating card */}
                        <FloatingCard delay={200} rotation={-3} style={styles.nsFloatDay}>
                            <View style={[styles.nsPreviewCard, styles.nsPreviewLarge, {
                                backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                                shadowColor: isDark ? '#000' : '#7A5BE6',
                            }]}>
                                <View style={[styles.nsPreviewBadge, { backgroundColor: THEME_COLORS.gratitude + '15' }]}>
                                    <Ionicons name="heart" size={12} color={THEME_COLORS.gratitude} />
                                    <Text style={[styles.nsPreviewBadgeText, { color: THEME_COLORS.gratitude }]}>DAY 1 · GRATITUDE</Text>
                                </View>
                                <Text style={[styles.nsPreviewArabic, { color: tc.text }]}>
                                    وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ
                                </Text>
                                <Text style={[styles.nsPreviewTranslation, { color: tc.textSecondary }]}>
                                    "If you are grateful, I will surely increase you."
                                </Text>
                                <View style={styles.nsPreviewFooter}>
                                    <Text style={[styles.nsPreviewRef, { color: tc.textTertiary }]}>Ibrahim 14:7</Text>
                                    <Ionicons name="heart" size={14} color={tc.coral} />
                                </View>
                            </View>
                        </FloatingCard>

                        {/* Journal card — right side */}
                        <FloatingCard delay={500} rotation={4} style={styles.nsFloatJournal}>
                            <View style={[styles.nsPreviewCard, styles.nsPreviewSmall, {
                                backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                                shadowColor: isDark ? '#000' : '#4DB579',
                            }]}>
                                <View style={[styles.nsPreviewBadge, { backgroundColor: tc.green + '15' }]}>
                                    <Ionicons name="journal-outline" size={10} color={tc.green} />
                                    <Text style={[styles.nsPreviewBadgeText, { color: tc.green, fontSize: 9 }]}>Journal</Text>
                                </View>
                                <Text style={[styles.nsPreviewSmallText, { color: tc.text }]} numberOfLines={3}>
                                    "Today I reflected on the blessings I often overlook..."
                                </Text>
                                <Text style={[styles.nsPreviewRef, { color: tc.textTertiary, fontSize: 9 }]}>Day 1 Reflection</Text>
                            </View>
                        </FloatingCard>

                        {/* Streak chip */}
                        <FloatingCard delay={800} rotation={-2} style={styles.nsFloatStreak}>
                            <View style={[styles.nsChipFloat, {
                                backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                                shadowColor: isDark ? '#000' : '#FBB81B',
                            }]}>
                                <View style={[styles.nsChipIcon, { backgroundColor: tc.orange + '20' }]}>
                                    <Ionicons name="flame" size={14} color={tc.orange} />
                                </View>
                                <Text style={[styles.nsChipText, { color: tc.text }]}>7-Day Streak</Text>
                                <View style={[styles.nsChipDot, { backgroundColor: tc.orange }]} />
                            </View>
                        </FloatingCard>

                        {/* Badge chip */}
                        <FloatingCard delay={1100} rotation={2} style={styles.nsFloatBadge}>
                            <View style={[styles.nsBadgeChip, {
                                backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                                shadowColor: isDark ? '#000' : '#7A5BE6',
                            }]}>
                                <Text style={{ fontSize: 14 }}>🏆</Text>
                                <Text style={[styles.nsBadgeChipText, { color: tc.purple }]}>Badge Earned!</Text>
                            </View>
                        </FloatingCard>
                    </View>
                </View>

                {/* ── Bottom Section (~50%) ── */}
                <ScrollView
                    style={[styles.nsBottom, { backgroundColor: tc.creamLight }]}
                    contentContainerStyle={[styles.nsBottomContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo */}
                    <View style={styles.nsLogoRow}>
                        <View style={[styles.nsLogoCircle, { backgroundColor: tc.purple }]}>
                            <Ionicons name="moon" size={18} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.nsLogoText, { color: tc.text }]}>30-Day Journey</Text>
                    </View>

                    {/* Headline */}
                    <Text style={[styles.nsHeadline, { color: tc.text }]}>
                        Transform Your{'\n'}Spiritual Life
                    </Text>

                    {/* Subtitle */}
                    <Text style={[styles.nsSubtitle, { color: tc.textSecondary }]}>
                        Daily Quran verses, guided reflections,{'\n'}journaling & badges. One day at a time.
                    </Text>

                    {/* Theme pills row */}
                    <View style={styles.nsThemePills}>
                        {Object.entries(THEME_LABELS).map(([key, label]) => (
                            <View key={key} style={[styles.nsThemePill, { backgroundColor: THEME_COLORS[key] + '12' }]}>
                                <Ionicons name={THEME_ICONS[key]} size={12} color={THEME_COLORS[key]} />
                                <Text style={[styles.nsThemePillText, { color: THEME_COLORS[key] }]}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* CTA */}
                    <View style={styles.nsCTAContainer}>
                        <ClubhouseButton
                            title={t('journey.begin') || 'Begin Your Journey'}
                            onPress={handleStartJourney}
                            variant="primary"
                            style={styles.nsCTAButton}
                        />
                    </View>
                </ScrollView>
            </View>
        );
    }

    // ── Completed State ──
    if (journeyStatus === 'completed') {
        return (
            <ClubhouseBackground>
                <ClubhouseHeader title={t('journey.title')} subtitle={t('journey.complete')} />
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_PAD }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.completedHero}>
                        <View style={[styles.heroIconCircle, { backgroundColor: tc.beige, width: 80, height: 80, borderRadius: 40 }]}>
                            <Text style={{ fontSize: 40 }}>👑</Text>
                        </View>
                        <Text style={[styles.completedTitle, { color: tc.text }]}>{t('journey.completed_title')}</Text>
                        <Text style={[styles.heroDescription, { color: tc.textSecondary }]}>
                            {t('journey.completed_desc')}
                        </Text>
                    </View>

                    {/* Final Stats */}
                    <View style={styles.completedStatsRow}>
                        <View style={[styles.completedStatCard, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                            <Text style={[styles.completedStatNum, { color: tc.text }]}>30</Text>
                            <Text style={[styles.completedStatLabel, { color: tc.textSecondary }]}>{t('journey.days')}</Text>
                        </View>
                        <View style={[styles.completedStatCard, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                            <Text style={[styles.completedStatNum, { color: tc.text }]}>
                                {journeyProgress?.longestStreak ?? 0}
                            </Text>
                            <Text style={[styles.completedStatLabel, { color: tc.textSecondary }]}>{t('journey.best_streak')}</Text>
                        </View>
                        <View style={[styles.completedStatCard, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                            <Text style={[styles.completedStatNum, { color: tc.text }]}>
                                {Object.keys(journeyProgress?.journalEntries ?? {}).length}
                            </Text>
                            <Text style={[styles.completedStatLabel, { color: tc.textSecondary }]}>{t('journey.journals')}</Text>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('journey.badges_earned')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
                        {allBadges.map((badge) => (
                            <JourneyBadgeCard key={badge.id} badge={badge} earned={true} />
                        ))}
                    </ScrollView>

                    {/* Completion Certificate */}
                    <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('journey.share_achievement')}</Text>
                    <ViewShot ref={certificateRef} options={{ format: 'png', quality: 1 }}>
                        <View style={styles.certificateCard}>
                            <Text style={styles.certificateHeader}>{t('journey.certificate_header')}</Text>
                            <Text style={styles.certificateTitle}>{t('journey.certificate_title')}</Text>
                            <View style={styles.certificateDivider} />
                            <Text style={styles.certificateEmoji}>👑</Text>
                            <Text style={styles.certificateBody}>
                                {t('journey.certificate_body')}
                            </Text>
                            <View style={styles.certificateStatsRow}>
                                <View style={styles.certificateStat}>
                                    <Text style={styles.certificateStatNum}>30</Text>
                                    <Text style={styles.certificateStatLabel}>Days</Text>
                                </View>
                                <View style={styles.certificateStat}>
                                    <Text style={styles.certificateStatNum}>{journeyProgress?.longestStreak ?? 0}</Text>
                                    <Text style={styles.certificateStatLabel}>Best Streak</Text>
                                </View>
                                <View style={styles.certificateStat}>
                                    <Text style={styles.certificateStatNum}>{allBadges.length}</Text>
                                    <Text style={styles.certificateStatLabel}>Badges</Text>
                                </View>
                            </View>
                            <Text style={styles.certificateHashtag}>{t('journey.certificate_hashtag')}</Text>
                        </View>
                    </ViewShot>

                    <ClubhouseButton
                        title={t('journey.share_certificate')}
                        onPress={() => shareJourneyProgress(certificateRef as any, 30)}
                        variant="primary"
                        style={{ marginTop: spacing.md }}
                    />

                    <ClubhouseButton
                        title={t('journey.start_again')}
                        onPress={handleResetJourney}
                        variant="coral"
                        style={styles.resetButton}
                    />
                </ScrollView>
            </ClubhouseBackground>
        );
    }

    // ── In Progress State ──
    const completedCount = getCompletedCount();
    const streakCount = getStreakCount();
    const currentDayData = journeyDays.find((d) => d.day === currentDay);
    const themeColor = currentDayData ? THEME_COLORS[currentDayData.theme] : tc.purple;

    return (
        <ClubhouseBackground>
            <ClubhouseHeader
                title={t('journey.title')}
                subtitle={`DAY ${currentDay} OF 30`}
                rightIcons={[
                    { name: 'refresh-outline', onPress: handleResetJourney },
                ]}
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_PAD }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Today's Card */}
                <ClubhouseCard backgroundColor={tc.cream} style={styles.todayCard}>
                    <View style={styles.todayHeader}>
                        <View style={[styles.todayThemeBadge, { backgroundColor: themeColor + '12' }]}>
                            <Ionicons
                                name={currentDayData ? THEME_ICONS[currentDayData.theme] : 'flame'}
                                size={14}
                                color={themeColor}
                            />
                            <Text style={[styles.todayThemeText, { color: themeColor }]}>
                                {currentDayData ? THEME_LABELS[currentDayData.theme].toUpperCase() : ''}
                            </Text>
                        </View>
                        {streakCount > 0 && (
                            <View style={[styles.streakBadge, { backgroundColor: tc.orange + '12' }]}>
                                <Ionicons name="flame" size={16} color={tc.orange} />
                                <Text style={[styles.streakText, { color: tc.orange }]}>{t('journey.day_streak', { count: streakCount })}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.todayTitle, { color: tc.text }]}>
                        {currentDayData?.themeTitle ?? 'Loading...'}
                    </Text>

                    {currentDayData && (
                        <Text style={[styles.todayChallenge, { color: tc.textSecondary }]} numberOfLines={2}>
                            {currentDayData.dailyChallenge}
                        </Text>
                    )}

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressLabelRow}>
                            <Text style={[styles.progressLabel, { color: tc.textSecondary }]}>Progress</Text>
                            <Text style={[styles.progressPercent, { color: themeColor }]}>
                                {Math.round((completedCount / 30) * 100)}%
                            </Text>
                        </View>
                        <View style={[styles.progressBarContainer, { backgroundColor: tc.backgroundSecondary }]}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        backgroundColor: themeColor,
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%'],
                                        }),
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressSubtext, { color: tc.textTertiary }]}>
                            {completedCount} of 30 days completed
                        </Text>
                    </View>

                    <ClubhouseButton
                        title={
                            nextAvailableDay
                                ? t('journey.continue_day', { day: nextAvailableDay })
                                : t('journey.come_back')
                        }
                        onPress={handleContinueJourney}
                        variant="primary"
                        style={styles.continueButton}
                        disabled={!nextAvailableDay}
                    />
                </ClubhouseCard>

                {/* Stats Row */}
                <View style={styles.miniStatsRow}>
                    {[
                        { num: completedCount, label: t('journey.completed'), icon: 'checkmark-circle' as const, color: tc.green },
                        { num: streakCount, label: t('journey.streak'), icon: 'flame' as const, color: tc.orange },
                        { num: Object.keys(journeyProgress?.journalEntries ?? {}).length, label: t('journey.journals'), icon: 'journal' as const, color: tc.purple },
                    ].map((s, i) => (
                        <View key={i} style={[styles.miniStatCard, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                            <Ionicons name={s.icon} size={18} color={s.color} style={{ marginBottom: 4 }} />
                            <Text style={[styles.miniStatNumber, { color: tc.text }]}>{s.num}</Text>
                            <Text style={[styles.miniStatLabel, { color: tc.textSecondary }]}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Streak Freeze Card — Task 18 */}
                {canUseFreeze && streakCount > 0 && (
                    <TouchableOpacity
                        style={[styles.freezeCard, { backgroundColor: tc.cream, borderColor: tc.border }]}
                        onPress={handleStreakFreeze}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.freezeIconCircle, { backgroundColor: tc.backgroundSecondary }]}>
                            <Ionicons name="snow" size={20} color={tc.teal} />
                        </View>
                        <View style={styles.freezeTextContainer}>
                            <Text style={[styles.freezeTitle, { color: tc.text }]}>{t('journey.streak_freeze')}</Text>
                            <Text style={[styles.freezeSubtitle, { color: tc.textSecondary }]}>{t('journey.streak_freeze_desc')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={tc.textTertiary} />
                    </TouchableOpacity>
                )}

                {/* Badges */}
                <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('journey.badges')}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.badgeScrollContent}
                    style={styles.badgeScroll}
                >
                    {allBadges.map((badge) => (
                        <JourneyBadgeCard key={badge.id} badge={badge} earned={isBadgeEarned(badge)} />
                    ))}
                </ScrollView>

                {/* Calendar Grid */}
                <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('journey.your_progress')}</Text>
                <ClubhouseCard backgroundColor={tc.cream} style={styles.calendarCard}>
                    {/* Theme legend */}
                    <View style={styles.calendarLegend}>
                        {Object.entries(THEME_LABELS).map(([key, label]) => (
                            <View key={key} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: THEME_COLORS[key] }]} />
                                <Text style={[styles.legendText, { color: tc.textSecondary }]}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.calendarGrid}>
                        {journeyDays.map((day) => {
                            const isCompleted = journeyProgress?.completedDays.includes(day.day) ?? false;
                            const isAccessible = accessibleDays.has(day.day);
                            const isCurrent = isAccessible && !isCompleted;
                            const isLocked = !isAccessible && !isCompleted;
                            const dayColor = THEME_COLORS[day.theme];

                            return (
                                <TouchableOpacity
                                    key={day.day}
                                    style={[
                                        styles.calendarDay,
                                        { backgroundColor: tc.creamLight, borderColor: dayColor + '30' },
                                        isCompleted && { backgroundColor: dayColor + '18', borderColor: dayColor },
                                        isCurrent && { borderColor: dayColor, borderWidth: 2, backgroundColor: dayColor + '08' },
                                        isLocked && styles.calendarDayLocked,
                                    ]}
                                    onPress={() => handleDaySelect(day.day)}
                                    disabled={isLocked}
                                    activeOpacity={0.7}
                                >
                                    {isCompleted ? (
                                        <Ionicons name="checkmark" size={16} color={dayColor} />
                                    ) : (
                                        <Text style={[
                                            styles.calendarDayText,
                                            { color: tc.text },
                                            isCurrent && { color: dayColor, fontWeight: '800' },
                                            isLocked && { color: tc.textTertiary },
                                        ]}>
                                            {day.day}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ClubhouseCard>
            </ScrollView>

            {/* Day View Modal */}
            {showDayView && (
                <JourneyDayView
                    day={selectedDay}
                    visible={showDayView}
                    onClose={() => setShowDayView(false)}
                    onComplete={handleDayComplete}
                />
            )}

            {/* Confetti on milestones — Task 17 */}
            <ConfettiOverlay
                visible={showConfetti}
                onComplete={() => setShowConfetti(false)}
            />
        </ClubhouseBackground>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Not Started: Onboarding-style Hero ──
    notStartedContainer: {
        flex: 1,
    },
    nsHeroSection: {
        flex: 0.50,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    nsHeroOverlay1: {
        position: 'absolute',
        top: 0,
        right: -40,
        width: SCREEN_WIDTH * 0.6,
        height: '100%',
        opacity: 0.3,
        transform: [{ skewX: '-12deg' }],
    },
    nsHeroOverlay2: {
        position: 'absolute',
        top: 0,
        left: -20,
        width: SCREEN_WIDTH * 0.4,
        height: '100%',
        opacity: 0.2,
        transform: [{ skewX: '8deg' }],
    },
    nsFloatingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },

    // Floating card positions
    nsFloatDay: {
        position: 'absolute',
        left: spacing.lg,
        top: '18%',
        zIndex: 3,
    },
    nsFloatJournal: {
        position: 'absolute',
        right: spacing.md,
        top: '45%',
        zIndex: 2,
    },
    nsFloatStreak: {
        position: 'absolute',
        right: spacing.xl,
        top: '12%',
        zIndex: 4,
    },
    nsFloatBadge: {
        position: 'absolute',
        left: spacing.xl + 10,
        bottom: '12%',
        zIndex: 4,
    },

    // Preview cards
    nsPreviewCard: {
        borderRadius: 16,
        padding: spacing.base,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    nsPreviewLarge: {
        width: SCREEN_WIDTH * 0.58,
        gap: spacing.sm,
    },
    nsPreviewSmall: {
        width: SCREEN_WIDTH * 0.42,
        gap: spacing.xs,
    },
    nsPreviewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
    },
    nsPreviewBadgeText: {
        ...typography.small,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    nsPreviewArabic: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 17,
        lineHeight: 28,
        textAlign: 'right',
    },
    nsPreviewTranslation: {
        ...typography.small,
        fontSize: 11,
        lineHeight: 16,
    },
    nsPreviewSmallText: {
        ...typography.small,
        fontSize: 11,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    nsPreviewFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nsPreviewRef: {
        ...typography.small,
        fontSize: 10,
        fontWeight: '600',
    },

    // Floating chips
    nsChipFloat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
        }),
    },
    nsChipIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nsChipText: {
        ...typography.small,
        fontSize: 12,
        fontWeight: '700',
    },
    nsChipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    nsBadgeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
        }),
    },
    nsBadgeChipText: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '700',
    },

    // Bottom section
    nsBottom: {
        flex: 0.50,
    },
    nsBottomContent: {
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        paddingTop: spacing.lg,
    },
    nsLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    nsLogoCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nsLogoText: {
        ...typography.h3,
        fontSize: 20,
        fontWeight: '700',
    },
    nsHeadline: {
        ...typography.h1,
        fontSize: 32,
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: spacing.md,
        letterSpacing: -0.5,
    },
    nsSubtitle: {
        ...typography.body,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    nsThemePills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    nsThemePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 16,
    },
    nsThemePillText: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '700',
    },
    nsCTAContainer: {
        width: '100%',
        paddingHorizontal: spacing.sm,
    },
    nsCTAButton: {
        height: 56,
        borderRadius: 28,
    },

    // Keep heroIconCircle for completed state
    heroIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroDescription: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 23,
        paddingHorizontal: spacing.md,
    },

    // ── Completed ──
    completedHero: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.base,
    },
    completedTitle: {
        ...typography.h1,
        fontSize: 30,
        color: colors.text,
        letterSpacing: -0.3,
    },
    completedStatsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    completedStatCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    completedStatNum: {
        ...typography.h2,
        color: colors.text,
    },
    completedStatLabel: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // ── In Progress: Today Card ──
    todayCard: {
        padding: spacing.lg,
        gap: spacing.sm,
    },
    todayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    todayThemeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    todayThemeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    todayTitle: {
        ...typography.h3,
        color: colors.text,
    },
    todayChallenge: {
        ...typography.body,
        fontSize: 14,
        lineHeight: 21,
        marginBottom: spacing.xs,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.orange + '12',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    streakText: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '700',
        color: colors.orange,
    },
    progressSection: {
        gap: 6,
        marginTop: spacing.xs,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        ...typography.small,
        fontSize: 12,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: colors.beige,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressPercent: {
        ...typography.small,
        fontSize: 13,
        fontWeight: '800',
    },
    progressSubtext: {
        ...typography.small,
        fontSize: 11,
    },
    continueButton: {
        marginTop: spacing.xs,
    },

    // ── Mini Stats ──
    miniStatsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    miniStatCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 18,
        paddingVertical: spacing.base,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    miniStatNumber: {
        ...typography.title,
        fontSize: 22,
        color: colors.text,
    },
    miniStatLabel: {
        ...typography.small,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
        fontWeight: '500',
    },

    // ── Shared ──
    sectionTitle: {
        ...typography.caption,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: spacing.sm,
    },
    badgeScroll: {
        marginHorizontal: -spacing.lg,
    },
    badgeScrollContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    resetButton: {
        marginTop: spacing.lg,
    },

    // ── Calendar Grid ──
    calendarCard: {
        padding: spacing.base,
    },
    calendarLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.base,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        ...typography.small,
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CALENDAR_GAP,
        justifyContent: 'center',
    },
    calendarDay: {
        width: CALENDAR_DAY_SIZE,
        height: CALENDAR_DAY_SIZE,
        borderRadius: CALENDAR_DAY_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.creamLight,
        borderWidth: 1.5,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    calendarDayLocked: {
        opacity: 0.3,
        shadowOpacity: 0,
    },
    calendarDayText: {
        ...typography.small,
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    calendarDayTextLocked: {
        color: colors.textTertiary,
    },

    // ── Streak Freeze ──
    freezeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.base,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: '#007AFF20',
    },
    freezeIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    freezeTextContainer: {
        flex: 1,
    },
    freezeTitle: {
        ...typography.body,
        fontWeight: '600',
        fontSize: 14,
    },
    freezeSubtitle: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 2,
    },

    // ── Completion Certificate ──
    certificateCard: {
        backgroundColor: colors.cream,
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    certificateHeader: {
        ...typography.caption,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 2,
        fontSize: 11,
    },
    certificateTitle: {
        ...typography.h2,
        color: colors.purple,
        textAlign: 'center',
    },
    certificateDivider: {
        width: 60,
        height: 2,
        backgroundColor: colors.purple + '30',
        borderRadius: 1,
    },
    certificateEmoji: {
        fontSize: 56,
    },
    certificateBody: {
        ...typography.body,
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '600',
    },
    certificateStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xl,
        marginTop: spacing.sm,
    },
    certificateStat: {
        alignItems: 'center',
    },
    certificateStatNum: {
        ...typography.h3,
        color: colors.text,
    },
    certificateStatLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    certificateHashtag: {
        ...typography.small,
        color: colors.textTertiary,
        letterSpacing: 0.5,
        marginTop: spacing.sm,
    },
});

export default JourneyScreen;
