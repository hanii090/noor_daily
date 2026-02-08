import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    PanResponder,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { ClubhouseCard } from './clubhouse';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { VerseCardTemplateComponent } from './VerseCardTemplate';
import { HadithCardTemplate } from './HadithCardTemplate';
import { colors, useTheme, typography, spacing, shadows } from '../theme';
import { Verse, Hadith, ContentType, Mood, VerseCardTemplate, VerseCardSize } from '../types';
import shareService from '../services/shareService';
import analyticsService from '../services/analyticsService';
import aiService from '../services/aiService';
import { AudioPlayer } from './AudioPlayer';
import { useTranslation } from 'react-i18next';
import { ShareBottomSheet } from './common/ShareBottomSheet';
import type { ShareOption } from './common/ShareBottomSheet';
import { Toast } from './common/Toast';

interface UnifiedGuidanceDisplayProps {
    content: Verse | Hadith;
    type: ContentType;
    moodColor: string;
    isBookmarked: boolean;
    onBookmark: () => void;
    onShare: () => void;
    onChangeMood: () => void;
}

export const UnifiedGuidanceDisplay: React.FC<UnifiedGuidanceDisplayProps> = ({
    content,
    type,
    moodColor,
    isBookmarked,
    onBookmark,
    onShare,
    onChangeMood,
}) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const swipeX = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaveMode, setIsSaveMode] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isFetchingAI, setIsFetchingAI] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<VerseCardTemplate>('minimal');
    const [selectedSize, setSelectedSize] = useState<VerseCardSize>('post');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const cardRef = useRef<ViewShot>(null);
    const bookmarkScale = useRef(new Animated.Value(1)).current;
    const shareScale = useRef(new Animated.Value(1)).current;

    const animatePress = (scale: Animated.Value, callback: () => void) => {
        Animated.sequence([
            Animated.spring(scale, { toValue: 0.8, useNativeDriver: true, speed: 50, bounciness: 4 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }),
        ]).start();
        callback();
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setToastVisible(true);
    };

    // Task 7: Swipe gesture to get next content
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 20 && Math.abs(gs.dy) < 40,
            onPanResponderGrant: () => {
                // Reset to 0 at start of gesture to avoid __startX error
                swipeX.setValue(0);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: swipeX }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gs) => {
                if (Math.abs(gs.dx) > 100) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Animated.timing(swipeX, { toValue: gs.dx > 0 ? 400 : -400, duration: 200, useNativeDriver: false }).start(() => {
                        swipeX.setValue(0);
                        onChangeMood();
                    });
                } else {
                    Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        setAiInsight(null);
        
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: false,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 7,
                useNativeDriver: false,
            })
        ]).start();
    }, [content.id]);

    const fetchAIInsight = async () => {
        if (aiInsight) {
            setAiInsight(null);
            return;
        }

        try {
            setIsFetchingAI(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const insight = await aiService.getGuidanceInsight(content, type);
            setAiInsight(insight);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            setAiInsight('Unable to load AI insight at this time.');
        } finally {
            setIsFetchingAI(false);
        }
    };

    const handleBookmark = () => {
        if (isBookmarked) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onBookmark();
        if (!isBookmarked && type === 'hadith') {
            analyticsService.logHadithBookmarked(content.id);
        }
    };

    const handleSharePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowShareOptions(true);
    };

    const handleShareAsImage = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowShareOptions(false);
        setShowTemplateSelector(true);
    };

    const handleShareAsText = async () => {
        setShowShareOptions(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isVerse(content)) {
            await shareService.shareAsText(content);
        } else {
            await shareService.shareHadithAsText(content);
            analyticsService.logHadithShared(content.id, 'text');
        }
        showToast(t('guidance.shared_success', { defaultValue: 'Shared successfully' }));
        onShare();
    };

    const handleSaveToPhotos = () => {
        setShowShareOptions(false);
        setIsSaveMode(true);
        setShowTemplateSelector(true);
    };

    const shareOptions: ShareOption[] = [
        { id: 'image', icon: 'image-outline', label: t('guidance.share_as_image'), subtitle: t('guidance.share_as_image_desc'), color: tc.purple, onPress: handleShareAsImage },
        { id: 'text', icon: 'text-outline', label: t('guidance.share_as_text'), subtitle: t('guidance.share_as_text_desc'), color: tc.purple, onPress: handleShareAsText },
        { id: 'save', icon: 'download-outline', label: t('guidance.save_to_photos'), subtitle: t('guidance.save_to_photos_desc'), color: tc.green, onPress: handleSaveToPhotos },
    ];

    const handleTemplateSelect = async (template: VerseCardTemplate, size: VerseCardSize) => {
        setSelectedTemplate(template);
        setSelectedSize(size);
        setShowTemplateSelector(false);
        setIsGenerating(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const imageUri = await shareService.captureCard(cardRef.current);

            if (imageUri) {
                if (isSaveMode) {
                    const saved = await shareService.saveToGallery(imageUri);
                    if (saved) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showToast(t('guidance.saved_success', { defaultValue: 'Saved to Photos' }));
                    }
                } else {
                    await shareService.shareImage(imageUri, isVerse(content) ? 'Share Verse' : 'Share Hadith');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showToast(t('guidance.shared_success', { defaultValue: 'Shared successfully' }));
                    if (!isVerse(content)) {
                        analyticsService.logHadithShared(content.id, 'image', selectedTemplate);
                    }
                    onShare();
                }
                await shareService.cleanupTempFile(imageUri);
            }
        } catch (_e) {
            // Card generation or share cancelled
        } finally {
            setIsGenerating(false);
            setIsSaveMode(false);
        }
    };

    const isVerse = (item: Verse | Hadith): item is Verse => type === 'verse';

    const renderHeader = () => {
        const isV = isVerse(content);
        return (
            <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: moodColor + '15' }]}>
                    <Ionicons 
                        name={isV ? "book" : "heart"} 
                        size={12} 
                        color={moodColor} 
                    />
                    <Text style={[styles.typeBadgeText, { color: moodColor }]}>
                        {isV ? t('guidance.quranic_verse') : t('guidance.prophetic_hadith')}
                    </Text>
                </View>
                <Text style={[styles.referenceBadge, { color: tc.textTertiary, backgroundColor: tc.backgroundSecondary }]}>
                    {isV ? `${content.surah} ${content.verseNumber}` : content.reference}
                </Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (isVerse(content)) {
            return <Text style={[styles.footerText, { color: tc.textTertiary }]}>VERSE {content.verseNumber}</Text>;
        } else {
            return (
                <View style={styles.hadithFooter}>
                    <Text style={[styles.narratorText, { color: tc.text }]}>{content.narrator}</Text>
                    <Text style={[styles.referenceText, { color: tc.textTertiary }]}>{content.reference}</Text>
                </View>
            );
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }, { translateX: swipeX }],
                    paddingTop: insets.top + 90,
                },
            ]}
            {...panResponder.panHandlers}
        >
            <ClubhouseCard 
                backgroundColor={tc.white} 
                style={styles.card}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {renderHeader()}

                    <View style={styles.arabicContainer}>
                        <Text style={[styles.arabic, { color: tc.text }]}>{content.arabic}</Text>
                        <View style={[styles.arabicDecoration, { backgroundColor: moodColor + '10' }]} />
                    </View>

                    {/* Task 9: Swipe hint */}
                    {isVerse(content) && content.english && (
                        <Text style={[styles.transliteration, { color: tc.textTertiary }]}>
                            {t('guidance.swipe_hint')}
                        </Text>
                    )}

                    <Text style={[styles.english, { color: tc.text }]}>"{content.english}"</Text>

                    {aiInsight && (
                        <Animated.View style={[
                            styles.aiInsightContainer, 
                            { 
                                backgroundColor: moodColor + '08',
                                borderColor: moodColor + '20' 
                            }
                        ]}>
                            <View style={styles.aiHeader}>
                                <Ionicons name="sparkles" size={14} color={moodColor} />
                                <Text style={[styles.aiHeaderText, { color: moodColor }]}>{t('guidance.ai_insight')}</Text>
                            </View>
                            <Text style={[styles.aiText, { color: tc.text }]}>{aiInsight}</Text>
                        </Animated.View>
                    )}

                    {renderFooter()}
                </ScrollView>

                <View style={styles.actions}>
                    <View style={styles.actionsLeft}>
                        {isVerse(content) && (
                            <AudioPlayer verse={content} moodColor={moodColor} variant="compact" />
                        )}
                        <TouchableOpacity 
                            onPress={fetchAIInsight} 
                            style={[styles.circleAction, aiInsight && { backgroundColor: moodColor + '15' }]}
                            disabled={isFetchingAI}
                            accessibilityRole="button"
                            accessibilityLabel={aiInsight ? 'Hide AI insight' : 'Get AI spiritual insight'}
                        >
                            {isFetchingAI ? (
                                <ActivityIndicator size="small" color={moodColor} />
                            ) : (
                                <Ionicons 
                                    name={aiInsight ? "sparkles" : "sparkles-outline"} 
                                    size={22} 
                                    color={aiInsight ? moodColor : tc.textSecondary} 
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionsRight}>
                        <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                            <TouchableOpacity onPress={() => animatePress(bookmarkScale, handleBookmark)} style={[styles.circleAction, { backgroundColor: tc.backgroundSecondary }]} accessibilityRole="button" accessibilityLabel={isBookmarked ? 'Remove from saved' : 'Save to favorites'}>
                                <Ionicons
                                    name={isBookmarked ? 'heart' : 'heart-outline'}
                                    size={22}
                                    color={isBookmarked ? tc.coral : tc.textSecondary}
                                />
                            </TouchableOpacity>
                        </Animated.View>
                        <Animated.View style={{ transform: [{ scale: shareScale }] }}>
                            <TouchableOpacity onPress={() => animatePress(shareScale, handleSharePress)} style={[styles.circleAction, { backgroundColor: tc.backgroundSecondary }]} accessibilityRole="button" accessibilityLabel="Share this guidance">
                                <Ionicons name="share-social-outline" size={22} color={tc.textSecondary} />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.changeMoodPill, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]} 
                    onPress={onChangeMood}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sync-outline" size={16} color={moodColor} />
                    <Text style={[styles.changeMoodText, { color: moodColor }]}>{t('guidance.change_mood')}</Text>
                </TouchableOpacity>
            </ClubhouseCard>

            {/* Hidden ViewShot for capturing cards */}
            <View style={styles.hiddenCard}>
                <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
                    {isVerse(content) ? (
                        <VerseCardTemplateComponent
                            verse={content}
                            template={selectedTemplate}
                            size={selectedSize}
                            moodColor={moodColor}
                        />
                    ) : (
                        <HadithCardTemplate
                            hadith={content}
                            template={selectedTemplate}
                            size={selectedSize}
                            moodColor={moodColor}
                        />
                    )}
                </ViewShot>
            </View>

            {/* Share Options Bottom Sheet */}
            <ShareBottomSheet
                visible={showShareOptions}
                onClose={() => setShowShareOptions(false)}
                options={shareOptions}
                title={t('actions.share')}
            />

            {/* Template Selector Modal */}
            <TemplateSelectorModal
                visible={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelectTemplate={handleTemplateSelect}
                moodColor={moodColor}
            />

            {/* Generating Indicator — Modal so it renders above the fixed header */}
            <Modal visible={isGenerating} transparent animationType="fade">
                <View style={styles.generatingOverlay}>
                    <View style={[styles.generatingCard, { backgroundColor: tc.creamLight }]}>
                        <ActivityIndicator size="large" color={tc.purple} />
                        <Text style={[styles.generatingText, { color: tc.text }]}>{t('guidance.generating')}</Text>
                    </View>
                </View>
            </Modal>

            {/* Success Toast */}
            <Toast
                visible={toastVisible}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: 120,
    },
    card: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        flex: 1,
        maxHeight: Dimensions.get('window').height * 0.75,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.xl,
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
    referenceBadge: {
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
        marginBottom: spacing.xl,
        position: 'relative',
    },
    arabic: {
        ...typography.arabicLarge,
        fontSize: 30,
        color: colors.black,
        textAlign: 'center',
        lineHeight: 56,
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
    transliteration: {
        ...typography.caption,
        fontSize: 12,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    english: {
        ...typography.bodyLarge,
        fontSize: 19,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: spacing.xl,
        width: '100%',
        paddingHorizontal: spacing.sm,
        fontWeight: '500',
    },
    footerText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    hadithFooter: {
        alignItems: 'center',
    },
    narratorText: {
        ...typography.body,
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    referenceText: {
        ...typography.caption,
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border + '10',
    },
    actionsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    circleAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiInsightContainer: {
        borderRadius: 20,
        padding: spacing.lg,
        marginVertical: spacing.xl,
        width: '100%',
        borderWidth: 1,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    aiHeaderText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    aiText: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 24,
        color: colors.text,
        fontStyle: 'italic',
    },
    hiddenCard: {
        position: 'absolute',
        left: -10000,
        top: -10000,
    },
    generatingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    generatingCard: {
        backgroundColor: colors.creamLight,
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.base,
    },
    generatingText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    changeMoodPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginTop: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    changeMoodText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
