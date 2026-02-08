import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator, Modal, Platform, ScrollView, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseBackground, ClubhouseButton, ClubhouseHeader } from '../components/clubhouse';
import { UnifiedGuidanceDisplay } from '../components/UnifiedGuidanceDisplay';
import { MoodSelector } from '../components/MoodSelector';
import { SituationGuidanceModal } from '../components/SituationGuidanceModal';
import { GuidanceSkeleton } from '../components/common/SkeletonLoader';
import { colors, useTheme, typography, spacing } from '../theme';
import { useAppStore } from '../store/appStore';
import verseService from '../services/verseService';
import hadithService from '../services/hadithService';
import notificationHandler from '../services/notificationHandler';
import analyticsService from '../services/analyticsService';
import shareService from '../services/shareService';
import { Verse, Hadith, Mood, ContentType, GuidanceContent } from '../types';
import { useTranslation } from 'react-i18next';
import { toHijri } from '../utils/hijriDate';
import ExamModeScreen from './ExamModeScreen';

const getGreeting = (name: string | undefined, t: (key: string, opts?: any) => string): string => {
    const hour = new Date().getHours();
    let greeting: string;
    if (hour < 5) greeting = t('home.assalamu_alaikum', { defaultValue: 'Assalamu Alaikum' });
    else if (hour < 12) greeting = t('home.good_morning', { defaultValue: 'Good Morning' });
    else if (hour < 17) greeting = t('home.good_afternoon', { defaultValue: 'Good Afternoon' });
    else if (hour < 21) greeting = t('home.good_evening', { defaultValue: 'Good Evening' });
    else greeting = t('home.assalamu_alaikum', { defaultValue: 'Assalamu Alaikum' });
    return name ? `${greeting}, ${name}` : greeting;
};

const HomeScreen = () => {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [showMoodSelector, setShowMoodSelector] = useState(true);
    const [showAIModal, setShowAIModal] = useState(false);
    const [selectedContent, setSelectedContent] = useState<GuidanceContent | null>(null);
    const [contentType, setContentType] = useState<ContentType>('verse');
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showExamMode, setShowExamMode] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fadeAnim = React.useRef(new Animated.Value(1)).current;

    const { 
        favoriteVerses, 
        favoriteHadiths, 
        addToFavorites, 
        removeFromFavorites, 
        addHadithToFavorites, 
        removeHadithFromFavorites, 
        addToHistory,
        settings,
    } = useAppStore();

    // Auto-save to history after 5 seconds of viewing
    useEffect(() => {
        if (!selectedContent) return;

        const timer = setTimeout(() => {
            addToHistory(selectedContent, contentType, selectedMood || undefined);
        }, 5000);

        return () => clearTimeout(timer);
    }, [selectedContent?.id, selectedMood, contentType]);

    // Check for pending notification on mount (deep linking)
    useEffect(() => {
        const loadNotificationContent = async () => {
            const pendingNotification = notificationHandler.getPendingNotification();

            if (pendingNotification && (pendingNotification.type === 'daily_verse' || pendingNotification.type === 'daily_hadith')) {
                // User opened app from notification

                try {
                    setIsLoading(true);
                    const type: ContentType = pendingNotification.type === 'daily_verse' ? 'verse' : 'hadith';
                    setContentType(type);

                    let content: GuidanceContent | undefined;
                    if (type === 'verse') {
                        content = await verseService.getVerseById(pendingNotification.id);
                    } else {
                        content = hadithService.getHadithById(pendingNotification.id);
                    }
                    
                    if (content) {
                        setSelectedContent(content);
                        setSelectedMood(null);
                        setShowMoodSelector(false);
                        setError(null);
                    } else {
                        throw new Error('Content not found');
                    }
                } catch (err) {
                    console.error('Error loading content from notification:', err);
                    setError('Unable to load content. Please check your connection.');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadNotificationContent();
    }, []);


    const handleMoodSelect = async (mood: Mood) => {
        try {
            // Fade out
            await new Promise<void>((resolve) => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => resolve());
            });

            setIsLoading(true);
            setShowMoodSelector(false);
            setError(null);

            // Fade in loading
            await new Promise<void>((resolve) => {
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => resolve());
            });

            // Randomly decide between Verse and Hadith (50/50)
            const type: ContentType = Math.random() > 0.5 ? 'verse' : 'hadith';
            setContentType(type);

            let content: GuidanceContent;
            if (type === 'verse') {
                content = await verseService.getVerseByMood(mood);
            } else {
                content = await hadithService.getHadithByMood(mood);
            }

            setSelectedContent(content);
            setSelectedMood(mood);
            setIsLoading(false);

            if (type === 'hadith') {
                analyticsService.logHadithViewed(content.id, mood);
            }
        } catch (err) {
            setError('Unable to load content. Please check your connection and try again.');
            setShowMoodSelector(true);
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        try {
            await new Promise<void>((resolve) => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => resolve());
            });

            setIsLoading(true);
            setShowMoodSelector(false);
            setError(null);

            await new Promise<void>((resolve) => {
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => resolve());
            });

            // Cycle through content types on skip
            const nextType: ContentType = contentType === 'verse' ? 'hadith' : 'verse';
            setContentType(nextType);

            let content: GuidanceContent;
            if (nextType === 'verse') {
                content = await verseService.getDailyVerse();
            } else {
                content = await hadithService.getDailyHadith();
            }

            setSelectedContent(content);
            setSelectedMood(null);
            setIsLoading(false);
        } catch (err) {
            setError('Unable to load content. Please check your connection and try again.');
            setShowMoodSelector(true);
            setIsLoading(false);
        }
    };

    const handleChangeMood = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowMoodSelector(true);
            setSelectedContent(null);
            setSelectedMood(null);
            setError(null);

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            if (selectedContent && selectedMood) {
                // Refresh with new content for the same mood
                const type: ContentType = Math.random() > 0.5 ? 'verse' : 'hadith';
                setContentType(type);
                let content: GuidanceContent;
                if (type === 'verse') {
                    content = await verseService.getVerseByMood(selectedMood);
                } else {
                    content = await hadithService.getHadithByMood(selectedMood);
                }
                setSelectedContent(content);
            }
        } catch (err) {
            // Silently fail on refresh
        } finally {
            setRefreshing(false);
        }
    };

    const handleBookmark = () => {
        if (!selectedContent) return;

        if (contentType === 'verse') {
            const isBookmarked = favoriteVerses.some((v) => v.id === selectedContent.id);
            if (isBookmarked) {
                removeFromFavorites(selectedContent.id);
            } else {
                addToFavorites(selectedContent as Verse);
            }
        } else {
            const isBookmarked = favoriteHadiths.some((h) => h.id === selectedContent.id);
            if (isBookmarked) {
                removeHadithFromFavorites(selectedContent.id);
            } else {
                addHadithToFavorites(selectedContent as Hadith);
            }
        }
    };

    const handleShare = async () => {
        if (!selectedContent) return;

        try {
            if (contentType === 'verse') {
                await shareService.shareAsText(selectedContent as Verse);
            } else {
                await shareService.shareHadithAsText(selectedContent as Hadith);
            }
            
            if (contentType === 'hadith') {
                analyticsService.logHadithShared(selectedContent.id, 'text');
            }
        } catch (error) {
        }
    };

    const isBookmarked = selectedContent
        ? contentType === 'verse'
            ? favoriteVerses.some((v) => v.id === selectedContent.id)
            : favoriteHadiths.some((h) => h.id === selectedContent.id)
        : false;


    const moodColor = selectedMood ? colors.moods[selectedMood] : colors.purple;

    return (
        <ClubhouseBackground color="creamLight">
            <View style={styles.container}>
                {/* Fixed Glass Header */}
                <View style={styles.headerFixedContainer}>
                    <ClubhouseHeader 
                        title={selectedContent ? (contentType === 'verse' ? t('home.quran') : t('home.hadith')) : getGreeting(settings.userName || undefined, t)}
                        subtitle={selectedContent ? (selectedMood ? `${t(`mood.${selectedMood}`).toUpperCase()} · ${t('home.daily_guidance')}` : t('home.daily_guidance')) : toHijri().formatted.toUpperCase()}
                        onBack={selectedContent ? handleChangeMood : undefined}
                    />
                </View>

                {/* Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    refreshControl={
                        !showMoodSelector && selectedContent ? (
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={colors.purple}
                                colors={[colors.purple]}
                            />
                        ) : undefined
                    }
                >
                    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                        {isLoading && (
                            <GuidanceSkeleton />
                        )}

                        {!isLoading && error && (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle-outline" size={60} color={colors.textTertiary} />
                                <Text style={[styles.errorTitle, { color: colors.text }]}>{t('home.error_title')}</Text>
                                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                                <ClubhouseButton
                                    title={t('home.error_retry')}
                                    onPress={() => {
                                        setError(null);
                                        setShowMoodSelector(true);
                                    }}
                                    variant="primary"
                                    style={styles.retryButton}
                                />
                            </View>
                        )}

                        {!isLoading && !error && showMoodSelector && (
                            <MoodSelector 
                                onMoodSelect={handleMoodSelect} 
                                onSkip={handleSkip} 
                                onAskAI={() => setShowAIModal(true)}
                            />
                        )}

                        {!isLoading && !error && !showMoodSelector && selectedContent && (
                            <>
                                <UnifiedGuidanceDisplay
                                    content={selectedContent}
                                    type={contentType}
                                    moodColor={moodColor}
                                    isBookmarked={isBookmarked}
                                    onBookmark={handleBookmark}
                                    onShare={handleShare}
                                    onChangeMood={handleChangeMood}
                                />
                            </>
                        )}
                    </Animated.View>
                </ScrollView>

                {/* AI Guidance Modal */}
                <SituationGuidanceModal
                    visible={showAIModal}
                    onClose={() => setShowAIModal(false)}
                />

                {/* Floating dual-action bar — matches tab bar design */}
                {showMoodSelector && !isLoading && !error && (
                    <View style={styles.floatingBarOuter}>
                        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.floatingBar, { borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={styles.floatingBarBtn}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={t('home.ai_mentor', { defaultValue: 'AI Mentor' })}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setShowAIModal(true);
                                }}
                            >
                                <Ionicons name="sparkles" size={18} color={colors.purple} />
                                <Text style={[styles.floatingBarLabel, { color: colors.purple }]} numberOfLines={1}>{t('home.ai_mentor', { defaultValue: 'AI Mentor' })}</Text>
                            </TouchableOpacity>

                            <View style={[styles.floatingBarDivider, { backgroundColor: colors.border }]} />

                            <TouchableOpacity
                                style={styles.floatingBarBtn}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={t('home.exam_mode', { defaultValue: 'Exam Mode' })}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setShowExamMode(true);
                                }}
                            >
                                <Ionicons name="school-outline" size={18} color={colors.teal} />
                                <Text style={[styles.floatingBarLabel, { color: colors.teal }]} numberOfLines={1}>{t('home.exam_mode', { defaultValue: 'Exam Mode' })}</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                )}

                {/* Exam Mode Modal */}
                <Modal
                    visible={showExamMode}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowExamMode(false)}
                >
                    <ExamModeScreen onClose={() => setShowExamMode(false)} />
                </Modal>
            </View>
        </ClubhouseBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerFixedContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    content: {
        flex: 1,
        paddingTop: 0,
    },
    changeMoodContainer: {
        position: 'absolute',
        bottom: 110, // Increased to avoid overlap with floating tab bar
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    changeMoodButton: {
        paddingHorizontal: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.base,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorTitle: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.base,
        marginBottom: spacing.sm,
    },
    errorText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    retryButton: {
        paddingHorizontal: spacing.xl,
    },
    floatingBarOuter: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? spacing.xl + 76 : spacing.lg + 76,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'box-none',
    },
    floatingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 24,
        paddingHorizontal: spacing.sm,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    floatingBarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.base,
        height: '100%',
        justifyContent: 'center',
    },
    floatingBarLabel: {
        ...typography.caption,
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.2,
    },
    floatingBarDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
    },
});

export default React.memo(HomeScreen);
