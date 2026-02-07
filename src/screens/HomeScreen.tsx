import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseBackground, ClubhouseButton, ClubhouseHeader } from '../components/clubhouse';
import { UnifiedGuidanceDisplay } from '../components/UnifiedGuidanceDisplay';
import { MoodSelector } from '../components/MoodSelector';
import { SituationGuidanceModal } from '../components/SituationGuidanceModal';
import { colors, typography, spacing } from '../theme';
import { useAppStore } from '../store/appStore';
import verseService from '../services/verseService';
import hadithService from '../services/hadithService';
import notificationHandler from '../services/notificationHandler';
import analyticsService from '../services/analyticsService';
import shareService from '../services/shareService';
import { Verse, Hadith, Mood, ContentType, GuidanceContent } from '../types';

const HomeScreen = () => {
    const [showMoodSelector, setShowMoodSelector] = useState(true);
    const [showAIModal, setShowAIModal] = useState(false);
    const [selectedContent, setSelectedContent] = useState<GuidanceContent | null>(null);
    const [contentType, setContentType] = useState<ContentType>('verse');
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fadeAnim = React.useRef(new Animated.Value(1)).current;

    const { 
        favoriteVerses, 
        favoriteHadiths, 
        addToFavorites, 
        removeFromFavorites, 
        addHadithToFavorites, 
        removeHadithFromFavorites, 
        addToHistory 
    } = useAppStore();

    // Auto-save to history after 5 seconds of viewing
    useEffect(() => {
        if (!selectedContent) return;

        const timer = setTimeout(() => {
            addToHistory(selectedContent, contentType, selectedMood || undefined);
            console.log(`${contentType} auto-saved to history`);
        }, 5000);

        return () => clearTimeout(timer);
    }, [selectedContent?.id, selectedMood, contentType]);

    // Check for pending notification on mount (deep linking)
    useEffect(() => {
        const loadNotificationContent = async () => {
            const pendingNotification = notificationHandler.getPendingNotification();

            if (pendingNotification && (pendingNotification.type === 'daily_verse' || pendingNotification.type === 'daily_hadith')) {
                // User opened app from notification
                console.log('Opening from notification, loading content');

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

    // Get current date
    const getCurrentDate = () => {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        const now = new Date();
        return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    };

    const handleMoodSelect = async (mood: Mood) => {
        console.log('=== MOOD SELECT START ===', mood);
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
            setIsLoading(true); // Temporary to ensure UI update? No, let's keep it consistent.
            setIsLoading(false);

            if (type === 'hadith') {
                analyticsService.logHadithViewed(content.id, mood);
            }
        } catch (err) {
            console.error('=== MOOD SELECT ERROR ===', err);
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
            console.error('Error loading daily content:', err);
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
            console.error('Error sharing content:', error);
        }
    };

    const isBookmarked = selectedContent
        ? contentType === 'verse'
            ? favoriteVerses.some((v) => v.id === selectedContent.id)
            : favoriteHadiths.some((h) => h.id === selectedContent.id)
        : false;


    const moodColor = selectedMood ? colors.moods[selectedMood] : colors.purple;

    // Debug logging
    console.log('=== RENDER STATE ===', {
        isLoading,
        error,
        showMoodSelector,
        hasSelectedContent: !!selectedContent,
        contentType,
        shouldShowDisplay: !isLoading && !error && !showMoodSelector && !!selectedContent
    });

    return (
        <ClubhouseBackground color="creamLight">
            <View style={styles.container}>
                {/* Fixed Glass Header */}
                <View style={styles.headerFixedContainer}>
                    <ClubhouseHeader 
                        title={selectedContent ? (contentType === 'verse' ? 'Quran' : 'Hadith') : 'Noor Daily'}
                        subtitle={selectedContent ? (selectedMood ? `${selectedMood.toUpperCase()} GUIDANCE` : 'DAILY GUIDANCE') : getCurrentDate()}
                        onBack={selectedContent ? handleChangeMood : undefined}
                    />
                </View>

                {/* Content */}
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.purple} />
                            <Text style={styles.loadingText}>Loading guidance...</Text>
                        </View>
                    )}

                    {!isLoading && error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={60} color={colors.textTertiary} />
                            <Text style={styles.errorTitle}>Unable to Load Content</Text>
                            <Text style={styles.errorText}>{error}</Text>
                            <ClubhouseButton
                                title="Try Again"
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

                {/* AI Guidance Modal */}
                <SituationGuidanceModal
                    visible={showAIModal}
                    onClose={() => setShowAIModal(false)}
                />
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
});

export default HomeScreen;
