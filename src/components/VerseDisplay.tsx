import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseCard } from './clubhouse';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { VerseCardTemplateComponent } from './VerseCardTemplate';
import { colors, typography, spacing } from '../theme';
import { Verse, VerseCardTemplate, VerseCardSize } from '../types';
import shareService from '../services/shareService';
import { AudioPlayer } from './AudioPlayer';

interface VerseDisplayProps {
    verse: Verse;
    moodColor: string;
    isBookmarked: boolean;
    onBookmark: () => void;
    onShare: () => void;
}

export const VerseDisplay: React.FC<VerseDisplayProps> = ({
    verse,
    moodColor,
    isBookmarked,
    onBookmark,
    onShare,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaveMode, setIsSaveMode] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<VerseCardTemplate>('minimal');
    const [selectedSize, setSelectedSize] = useState<VerseCardSize>('post');
    const cardRef = useRef<ViewShot>(null);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [verse.id]);

    const handleBookmark = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onBookmark();
    };

    const handleSharePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowShareOptions(true);
    };

    const handleShareAsImage = () => {
        setShowShareOptions(false);
        setShowTemplateSelector(true);
    };

    const handleShareAsText = async () => {
        setShowShareOptions(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await shareService.shareAsText(verse);
        onShare();
    };

    const handleTemplateSelect = async (template: VerseCardTemplate, size: VerseCardSize) => {
        setSelectedTemplate(template);
        setSelectedSize(size);
        setShowTemplateSelector(false);
        setIsGenerating(true);

        try {
            // Wait a moment for the card to render
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Capture the card
            const imageUri = await shareService.captureVerseCard(cardRef.current);

            if (imageUri) {
                if (isSaveMode) {
                    // Save to gallery
                    const saved = await shareService.saveToGallery(imageUri);
                    if (saved) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                } else {
                    // Share the image
                    await shareService.shareVerseImage(imageUri);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onShare();
                }

                // Clean up
                await shareService.cleanupTempFile(imageUri);
            }
        } catch (error) {
            console.error('Error generating verse card:', error);
        } finally {
            setIsGenerating(false);
            setIsSaveMode(false); // Reset save mode
        }
    };

    const handleSaveToPhotos = () => {
        setShowShareOptions(false);
        setIsSaveMode(true); // Flag to determine if we're saving vs sharing
        setShowTemplateSelector(true);
    };


    return (
        <>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <ClubhouseCard backgroundColor={colors.backgroundSecondary} style={styles.card}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Header Row: Mood and Reference */}
                        <View style={styles.cardHeader}>
                            <View style={[styles.moodTag, { backgroundColor: moodColor + '15' }]}>
                                <Text style={[styles.moodTagText, { color: moodColor }]}>
                                    {verse.moods[0]?.toUpperCase() || 'DAILY'}
                                </Text>
                            </View>
                            <Text style={styles.referenceText}>
                                {verse.surah} {verse.verseNumber}
                            </Text>
                        </View>

                        {/* Arabic Text */}
                        <Text style={styles.arabic}>{verse.arabic}</Text>

                        {/* English Translation */}
                        <Text style={styles.english}>"{verse.english}"</Text>

                        {/* Verse Number */}
                        <Text style={styles.verseNumber}>VERSE {verse.verseNumber}</Text>

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            <AudioPlayer verse={verse} moodColor={moodColor} variant="compact" />
                            <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
                                <Ionicons
                                    name={isBookmarked ? 'heart' : 'heart-outline'}
                                    size={24}
                                    color={colors.textTertiary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSharePress} style={styles.actionButton}>
                                <Ionicons name="share-outline" size={24} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </ClubhouseCard>
            </Animated.View>

            {/* Hidden ViewShot for capturing verse cards */}
            <View style={styles.hiddenCard}>
                <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
                    <VerseCardTemplateComponent
                        verse={verse}
                        template={selectedTemplate}
                        size={selectedSize}
                        moodColor={moodColor}
                    />
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
                        <Text style={styles.generatingText}>Generating verse card...</Text>
                    </View>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: 100, // Make room for floating elements
        justifyContent: 'center',
    },
    card: {
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        minHeight: 450,
        maxHeight: 700,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        alignItems: 'center',
        flexGrow: 1,
        paddingBottom: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: spacing.xl,
    },
    moodTag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    moodTagText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    referenceText: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    arabic: {
        ...typography.arabicLarge,
        fontSize: 32,
        color: colors.black,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 60,
        width: '100%',
    },
    english: {
        ...typography.bodyLarge,
        fontSize: 18,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: spacing.lg,
        width: '100%',
        paddingHorizontal: spacing.sm,
    },
    verseNumber: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '500',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginBottom: spacing.xl,
    },
    actions: {
        flexDirection: 'row',
        gap: 30,
        marginTop: spacing.base,
        alignItems: 'center',
    },
    actionButton: {
        padding: spacing.sm,
    },
    action: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    actionLabel: {
        ...typography.caption,
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
    },
    shareOptionsMenu: {
        backgroundColor: colors.creamLight,
        borderRadius: 24,
        marginHorizontal: spacing.xl,
        overflow: 'hidden',
    },
    shareOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    shareOptionText: {
        ...typography.body,
        color: colors.text,
    },
    divider: {
        height: 0.5,
        backgroundColor: colors.border,
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
        color: colors.text,
    },
});
