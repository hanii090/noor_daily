import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, useTheme, typography, spacing } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { Verse, Hadith, JourneyDay, JourneyBadge } from '../../types';
import journeyService from '../../services/journeyService';
import analyticsService from '../../services/analyticsService';

const THEME_COLORS: Record<string, string> = {
    gratitude: colors.orange,
    patience: colors.purple,
    wisdom: colors.teal,
    peace: colors.green,
    purpose: colors.coral,
};

interface JourneyDayViewProps {
    day: number;
    visible: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export const JourneyDayView: React.FC<JourneyDayViewProps> = ({
    day,
    visible,
    onClose,
    onComplete,
}) => {
    const { colors: tc } = useTheme();
    const insets = useSafeAreaInsets();
    const { journeyProgress, completeJourneyDay } = useAppStore();

    const [isLoading, setIsLoading] = useState(true);
    const [journeyDay, setJourneyDay] = useState<JourneyDay | null>(null);
    const [verse, setVerse] = useState<Verse | null>(null);
    const [hadith, setHadith] = useState<Hadith | null>(null);
    const [journalText, setJournalText] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [earnedBadge, setEarnedBadge] = useState<JourneyBadge | null>(null);

    const celebrationAnim = useRef(new Animated.Value(0)).current;
    const isAlreadyCompleted = journeyProgress?.completedDays.includes(day) ?? false;

    useEffect(() => {
        if (visible) {
            loadDayContent();
        }
    }, [visible, day]);

    const loadDayContent = async () => {
        setIsLoading(true);
        try {
            const content = await journeyService.getDayContent(day);
            if (content) {
                setJourneyDay(content.journeyDay);
                setVerse(content.verse);
                setHadith(content.hadith);

                // Load existing journal entry if any
                const existingJournal = journeyProgress?.journalEntries[day];
                if (existingJournal) {
                    setJournalText(existingJournal);
                }
            }
        } catch (error) {
            console.error('Error loading day content:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async () => {
        if (isCompleting) return;
        setIsCompleting(true);

        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await completeJourneyDay(day, journalText || undefined);

            analyticsService.logJourneyDayCompleted(day, journalText.length > 0);

            // Check if a badge was earned
            if (journeyDay?.badge) {
                setEarnedBadge(journeyDay.badge);
                analyticsService.logJourneyBadgeEarned(journeyDay.badge.id);
            }

            // Check streak milestones
            const progress = await journeyService.getProgress();
            if (progress && [3, 7, 14, 21, 30].includes(progress.currentStreak)) {
                analyticsService.logJourneyStreakMilestone(progress.currentStreak);
            }

            // Check if journey is complete
            if (day === 30) {
                analyticsService.logJourneyCompleted();
            }

            // Show celebration
            setShowCelebration(true);
            Animated.sequence([
                Animated.timing(celebrationAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.delay(1500),
                Animated.timing(celebrationAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowCelebration(false);
                onComplete();
            });
        } catch (error) {
            console.error('Error completing day:', error);
        } finally {
            setIsCompleting(false);
        }
    };

    const themeColor = journeyDay ? THEME_COLORS[journeyDay.theme] : colors.purple;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: tc.creamLight }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top || spacing.lg, backgroundColor: tc.creamLight, borderBottomColor: tc.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={tc.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerDay, { color: tc.text }]}>Day {day}</Text>
                        {journeyDay && (
                            <View style={[styles.themePill, { backgroundColor: themeColor + '20' }]}>
                                <Text style={[styles.themePillText, { color: themeColor }]}>
                                    {journeyDay.theme.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.closeButton} />
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={themeColor} />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: insets.bottom + spacing.xxxl },
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Theme Title */}
                        <Text style={[styles.themeTitle, { color: tc.text }]}>{journeyDay?.themeTitle}</Text>

                        {/* Verse Section */}
                        {verse && (
                            <View style={[styles.contentCard, { backgroundColor: tc.cream }]}>
                                {/* Card Header */}
                                <View style={styles.cardHeaderRow}>
                                    <View style={[styles.typeBadge, { backgroundColor: themeColor + '15' }]}>
                                        <Ionicons name="book" size={12} color={themeColor} />
                                        <Text style={[styles.typeBadgeText, { color: themeColor }]}>QURAN</Text>
                                    </View>
                                    <Text style={[styles.refBadge, { color: tc.textTertiary, backgroundColor: tc.backgroundSecondary }]}>
                                        {verse.surah} {verse.verseNumber}
                                    </Text>
                                </View>

                                {/* Arabic */}
                                <View style={styles.arabicContainer}>
                                    <Text style={[styles.arabicText, { color: tc.text }]}>{verse.arabic}</Text>
                                    <View style={[styles.arabicDecoration, { backgroundColor: themeColor + '10' }]} />
                                </View>

                                {/* English */}
                                <Text style={[styles.englishText, { color: tc.text }]}>"{verse.english}"</Text>

                                {/* Footer */}
                                <Text style={[styles.footerLabel, { color: tc.textTertiary }]}>
                                    SURAH {verse.surah.toUpperCase()} — VERSE {verse.verseNumber}
                                </Text>
                            </View>
                        )}

                        {/* Hadith Section */}
                        {hadith && (
                            <View style={[styles.contentCard, { backgroundColor: tc.cream }]}>
                                {/* Card Header */}
                                <View style={styles.cardHeaderRow}>
                                    <View style={[styles.typeBadge, { backgroundColor: themeColor + '15' }]}>
                                        <Ionicons name="heart" size={12} color={themeColor} />
                                        <Text style={[styles.typeBadgeText, { color: themeColor }]}>HADITH</Text>
                                    </View>
                                    <Text style={[styles.refBadge, { color: tc.textTertiary, backgroundColor: tc.backgroundSecondary }]}>
                                        {hadith.reference}
                                    </Text>
                                </View>

                                {/* Arabic */}
                                <View style={styles.arabicContainer}>
                                    <Text style={[styles.arabicText, { color: tc.text }]}>{hadith.arabic}</Text>
                                    <View style={[styles.arabicDecoration, { backgroundColor: themeColor + '10' }]} />
                                </View>

                                {/* English */}
                                <Text style={[styles.englishText, { color: tc.text }]}>"{hadith.english}"</Text>

                                {/* Footer */}
                                <View style={styles.hadithFooterRow}>
                                    <Text style={[styles.narratorLabel, { color: tc.text }]}>{hadith.narrator}</Text>
                                    <Text style={[styles.footerLabel, { color: tc.textTertiary }]}>{hadith.reference}</Text>
                                </View>
                            </View>
                        )}

                        {/* Tafsir Brief */}
                        {journeyDay && (
                            <View style={styles.tafsirSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="bulb-outline" size={18} color={tc.orange} />
                                    <Text style={[styles.sectionHeaderText, { color: tc.text }]}>Brief Tafsir</Text>
                                </View>
                                <Text style={[styles.tafsirText, { color: tc.textSecondary }]}>{journeyDay.tafsirBrief}</Text>
                            </View>
                        )}

                        {/* Reflection Question */}
                        {journeyDay && (
                            <View style={styles.reflectionSection}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="help-circle-outline" size={18} color={tc.purple} />
                                    <Text style={[styles.sectionHeaderText, { color: tc.text }]}>Reflection</Text>
                                </View>
                                <Text style={[styles.reflectionQuestion, { color: tc.text }]}>
                                    {journeyDay.reflectionQuestion}
                                </Text>
                                <TextInput
                                    style={[styles.journalInput, { backgroundColor: tc.cream, borderColor: tc.border, color: tc.text }]}
                                    placeholder="Write your thoughts..."
                                    placeholderTextColor={tc.textTertiary}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    value={journalText}
                                    onChangeText={setJournalText}
                                />
                            </View>
                        )}

                        {/* Daily Challenge */}
                        {journeyDay && (
                            <View style={[styles.challengeSection, { backgroundColor: themeColor + '10' }]}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="flag-outline" size={18} color={themeColor} />
                                    <Text style={[styles.sectionHeaderText, { color: themeColor }]}>
                                        Today's Challenge
                                    </Text>
                                </View>
                                <Text style={[styles.challengeText, { color: tc.text }]}>
                                    {journeyDay.dailyChallenge}
                                </Text>
                            </View>
                        )}

                        {/* Badge Preview */}
                        {journeyDay?.badge && !isAlreadyCompleted && (
                            <View style={styles.badgePreview}>
                                <Text style={[styles.badgePreviewText, { color: tc.textSecondary }]}>
                                    Complete today to earn:
                                </Text>
                                <View style={styles.badgePreviewRow}>
                                    <Text style={styles.badgeEmoji}>{journeyDay.badge.emoji}</Text>
                                    <Text style={[styles.badgeName, { color: tc.text }]}>{journeyDay.badge.name}</Text>
                                </View>
                            </View>
                        )}

                        {/* Complete Button */}
                        {!isAlreadyCompleted ? (
                            <TouchableOpacity
                                style={[styles.completeButton, { backgroundColor: themeColor }]}
                                onPress={handleComplete}
                                disabled={isCompleting}
                                activeOpacity={0.8}
                            >
                                {isCompleting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                        <Text style={styles.completeButtonText}>Mark Day Complete</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.completedBanner, { backgroundColor: tc.green + '15' }]}>
                                <Ionicons name="checkmark-circle" size={22} color={tc.green} />
                                <Text style={[styles.completedBannerText, { color: tc.green }]}>Day Completed</Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* Celebration Overlay */}
                {showCelebration && (
                    <Animated.View
                        style={[
                            styles.celebrationOverlay, 
                            {
                                opacity: celebrationAnim,
                                transform: [
                                    {
                                        scale: celebrationAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={[styles.celebrationContent, { backgroundColor: tc.creamLight }]}>
                            {earnedBadge ? (
                                <>
                                    <Text style={styles.celebrationEmoji}>{earnedBadge.emoji}</Text>
                                    <Text style={[styles.celebrationTitle, { color: tc.text }]}>Badge Earned!</Text>
                                    <Text style={[styles.celebrationSubtitle, { color: tc.textSecondary }]}>{earnedBadge.name}</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.celebrationEmoji}>
                                        {day === 30 ? '👑' : '✨'}
                                    </Text>
                                    <Text style={[styles.celebrationTitle, { color: tc.text }]}>
                                        {day === 30 ? 'Journey Complete!' : 'MashaAllah!'}
                                    </Text>
                                    <Text style={[styles.celebrationSubtitle, { color: tc.textSecondary }]}>
                                        Day {day} completed
                                    </Text>
                                </>
                            )}
                        </View>
                    </Animated.View>
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.creamLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.creamLight,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    headerDay: {
        ...typography.title,
        color: colors.text,
    },
    themePill: {
        paddingHorizontal: spacing.md,
        paddingVertical: 2,
        borderRadius: 12,
    },
    themePillText: {
        ...typography.small,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    themeTitle: {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },

    // Content Cards (Verse / Hadith) — matches UnifiedGuidanceDisplay
    contentCard: {
        backgroundColor: colors.cream,
        borderRadius: 24,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.sm,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    refBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textTertiary,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    arabicContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.md,
        position: 'relative',
    },
    arabicText: {
        ...typography.arabicLarge,
        fontSize: 28,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 52,
        zIndex: 2,
    },
    arabicDecoration: {
        position: 'absolute',
        top: '10%',
        bottom: '10%',
        left: '5%',
        right: '5%',
        borderRadius: 40,
        zIndex: 1,
    },
    englishText: {
        ...typography.bodyLarge,
        fontSize: 17,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 28,
        width: '100%',
        paddingHorizontal: spacing.sm,
        fontWeight: '500',
    },
    footerLabel: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    hadithFooterRow: {
        alignItems: 'center',
        gap: 2,
        marginTop: spacing.sm,
    },
    narratorLabel: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },

    // Tafsir
    tafsirSection: {
        gap: spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionHeaderText: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.text,
    },
    tafsirText: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 26,
    },

    // Reflection
    reflectionSection: {
        gap: spacing.sm,
    },
    reflectionQuestion: {
        ...typography.body,
        color: colors.text,
        fontWeight: '500',
        lineHeight: 26,
    },
    journalInput: {
        backgroundColor: colors.cream,
        borderRadius: 16,
        padding: spacing.base,
        minHeight: 100,
        ...typography.body,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },

    // Challenge
    challengeSection: {
        borderRadius: 16,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    challengeText: {
        ...typography.body,
        color: colors.text,
        lineHeight: 24,
    },

    // Badge Preview
    badgePreview: {
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    badgePreviewText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    badgePreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    badgeEmoji: {
        fontSize: 28,
    },
    badgeName: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.text,
    },

    // Complete Button
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 24,
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    completeButtonText: {
        ...typography.button,
        color: colors.white,
    },
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 24,
        backgroundColor: colors.green + '15',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    completedBannerText: {
        ...typography.button,
        color: colors.green,
    },

    // Celebration Overlay
    celebrationOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    celebrationContent: {
        backgroundColor: colors.creamLight,
        borderRadius: 28,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
        minWidth: 220,
    },
    celebrationEmoji: {
        fontSize: 56,
        marginBottom: spacing.sm,
    },
    celebrationTitle: {
        ...typography.h3,
        color: colors.text,
    },
    celebrationSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
    },
});
