import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Platform,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { ClubhouseCard } from './clubhouse';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { VerseCardTemplateComponent } from './VerseCardTemplate';
import { HadithCardTemplate } from './HadithCardTemplate';
import { colors, typography, spacing, shadows } from '../theme';
import { Verse, Hadith, ContentType, Mood, VerseCardTemplate, VerseCardSize } from '../types';
import shareService from '../services/shareService';
import analyticsService from '../services/analyticsService';
import aiService from '../services/aiService';
import { AudioPlayer } from './AudioPlayer';

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
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const insets = useSafeAreaInsets();
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaveMode, setIsSaveMode] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isFetchingAI, setIsFetchingAI] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<VerseCardTemplate>('minimal');
    const [selectedSize, setSelectedSize] = useState<VerseCardSize>('post');
    const cardRef = useRef<ViewShot>(null);

    useEffect(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        setAiInsight(null);
        
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
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
            console.error('AI Error:', error);
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
        onShare();
    };

    const handleSaveToPhotos = () => {
        setShowShareOptions(false);
        setIsSaveMode(true);
        setShowTemplateSelector(true);
    };

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
                    }
                } else {
                    await shareService.shareImage(imageUri, isVerse(content) ? 'Share Verse' : 'Share Hadith');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    if (!isVerse(content)) {
                        analyticsService.logHadithShared(content.id, 'image', selectedTemplate);
                    }
                    onShare();
                }
                await shareService.cleanupTempFile(imageUri);
            }
        } catch (error) {
            console.error('Error generating card:', error);
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
                        {isV ? 'QURANIC VERSE' : 'PROPHETIC HADITH'}
                    </Text>
                </View>
                <Text style={styles.referenceBadge}>
                    {isV ? `${content.surah} ${content.verseNumber}` : content.reference}
                </Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (isVerse(content)) {
            return <Text style={styles.footerText}>VERSE {content.verseNumber}</Text>;
        } else {
            return (
                <View style={styles.hadithFooter}>
                    <Text style={styles.narratorText}>{content.narrator}</Text>
                    <Text style={styles.referenceText}>{content.reference}</Text>
                </View>
            );
        }
    };

    return (
        <Animated.View style={[
            styles.container, 
            { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingTop: insets.top + 100
            }
        ]}>
            <ClubhouseCard 
                backgroundColor={colors.white} 
                style={styles.card}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {renderHeader()}

                    <View style={styles.arabicContainer}>
                        <Text style={styles.arabic}>{content.arabic}</Text>
                        <View style={[styles.arabicDecoration, { backgroundColor: moodColor + '10' }]} />
                    </View>

                    <Text style={styles.english}>"{content.english}"</Text>

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
                                <Text style={[styles.aiHeaderText, { color: moodColor }]}>AI SPIRITUAL INSIGHT</Text>
                            </View>
                            <Text style={styles.aiText}>{aiInsight}</Text>
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
                        >
                            {isFetchingAI ? (
                                <ActivityIndicator size="small" color={moodColor} />
                            ) : (
                                <Ionicons 
                                    name={aiInsight ? "sparkles" : "sparkles-outline"} 
                                    size={22} 
                                    color={aiInsight ? moodColor : colors.textSecondary} 
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionsRight}>
                        <TouchableOpacity onPress={handleBookmark} style={styles.circleAction}>
                            <Ionicons
                                name={isBookmarked ? 'heart' : 'heart-outline'}
                                size={22}
                                color={isBookmarked ? colors.coral : colors.textSecondary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSharePress} style={styles.circleAction}>
                            <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.changeMoodPill} 
                    onPress={onChangeMood}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sync-outline" size={16} color={moodColor} />
                    <Text style={[styles.changeMoodText, { color: moodColor }]}>CHANGE MOOD</Text>
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

            {/* Share Options Modal */}
            {showShareOptions && (
                <TouchableOpacity
                    style={styles.shareOptionsOverlay}
                    activeOpacity={1}
                    onPress={() => setShowShareOptions(false)}
                >
                    <View style={styles.shareOptionsMenu}>
                        <TouchableOpacity
                            style={styles.shareOption}
                            onPress={handleShareAsImage}
                        >
                            <Ionicons name="image-outline" size={24} color={colors.purple} />
                            <Text style={styles.shareOptionText}>Share as Image</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.shareOption}
                            onPress={handleShareAsText}
                        >
                            <Ionicons name="text-outline" size={24} color={colors.purple} />
                            <Text style={styles.shareOptionText}>Share as Text</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.shareOption}
                            onPress={handleSaveToPhotos}
                        >
                            <Ionicons name="download-outline" size={24} color={colors.purple} />
                            <Text style={styles.shareOptionText}>Save to Photos</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}

            {/* Template Selector Modal */}
            <TemplateSelectorModal
                visible={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelectTemplate={handleTemplateSelect}
                moodColor={moodColor}
            />

            {/* Generating Indicator */}
            {isGenerating && (
                <View style={styles.generatingOverlay}>
                    <View style={styles.generatingCard}>
                        <ActivityIndicator size="large" color={colors.purple} />
                        <Text style={styles.generatingText}>Generating card...</Text>
                    </View>
                </View>
            )}
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
    shareOptionsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    shareOptionsMenu: {
        backgroundColor: colors.creamLight,
        borderRadius: 24,
        marginHorizontal: spacing.xl,
        width: '80%',
        overflow: 'hidden',
        ...shadows.large,
    },
    shareOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    shareOptionText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border + '10',
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
