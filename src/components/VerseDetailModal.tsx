import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseCard } from './clubhouse';
import { colors, typography, spacing, shadows } from '../theme';
import { Verse, Hadith, GuidanceContent, ContentType } from '../types';
import { useAppStore } from '../store/appStore';
import shareService from '../services/shareService';

interface GuidanceDetailModalProps {
    visible: boolean;
    content: GuidanceContent | null;
    type: ContentType;
    onClose: () => void;
}

export const GuidanceDetailModal: React.FC<GuidanceDetailModalProps> = ({
    visible,
    content,
    type,
    onClose,
}) => {
    const insets = useSafeAreaInsets();
    const { 
        favoriteVerses, 
        favoriteHadiths, 
        addToFavorites, 
        removeFromFavorites,
        addHadithToFavorites,
        removeHadithFromFavorites
    } = useAppStore();

    if (!content) return null;

    const isVerse = type === 'verse';
    const moodColor = content.moods[0] ? colors.moods[content.moods[0]] : colors.purple;
    
    const isBookmarked = isVerse 
        ? favoriteVerses.some((v) => v.id === content.id)
        : favoriteHadiths.some((h) => h.id === content.id);

    const handleBookmark = () => {
        if (isBookmarked) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        if (isVerse) {
            if (isBookmarked) removeFromFavorites(content.id);
            else addToFavorites(content as Verse);
        } else {
            if (isBookmarked) removeHadithFromFavorites(content.id);
            else addHadithToFavorites(content as Hadith);
        }
    };

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            if (isVerse) await shareService.shareAsText(content as Verse);
            else await shareService.shareHadithAsText(content as Hadith);
        } catch (error) {
            console.error('Error sharing content:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Content Card */}
                    <View style={styles.cardContainer}>
                        <ClubhouseCard backgroundColor={colors.white} style={styles.card}>
                            <View style={styles.cardContent}>
                                {/* Header Tag */}
                                <View style={[styles.typeBadge, { backgroundColor: moodColor + '15' }]}>
                                    <Ionicons 
                                        name={isVerse ? "book" : "heart"} 
                                        size={12} 
                                        color={moodColor} 
                                    />
                                    <Text style={[styles.typeBadgeText, { color: moodColor }]}>
                                        {isVerse ? 'QURANIC VERSE' : 'PROPHETIC HADITH'}
                                    </Text>
                                </View>

                                {/* Arabic Container */}
                                <View style={styles.arabicContainer}>
                                    <Text style={styles.arabic}>{content.arabic}</Text>
                                    <View style={[styles.arabicDecoration, { backgroundColor: moodColor + '10' }]} />
                                </View>

                                {/* English Translation */}
                                <Text style={styles.english}>"{content.english}"</Text>

                                {/* Footer Info */}
                                <View style={styles.footerInfoContainer}>
                                    <Text style={styles.footerInfo}>
                                        {isVerse ? `SURAH ${(content as Verse).surah.toUpperCase()}` : (content as Hadith).narrator}
                                    </Text>
                                    <Text style={styles.referenceBadge}>
                                        {isVerse ? `VERSE ${(content as Verse).verseNumber}` : (content as Hadith).reference}
                                    </Text>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actions}>
                                    <TouchableOpacity onPress={handleBookmark} style={styles.circleAction}>
                                        <Ionicons
                                            name={isBookmarked ? 'heart' : 'heart-outline'}
                                            size={22}
                                            color={isBookmarked ? colors.coral : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleShare} style={styles.circleAction}>
                                        <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ClubhouseCard>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.creamLight,
    },
    content: {
        flexGrow: 1,
        paddingBottom: spacing.xl,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        alignItems: 'flex-end',
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        paddingHorizontal: spacing.lg,
    },
    card: {
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        ...shadows.large,
    },
    cardContent: {
        alignItems: 'center',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 8,
        marginBottom: spacing.xl,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    arabicContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xl,
        position: 'relative',
    },
    arabic: {
        ...typography.arabicLarge,
        fontSize: 28,
        color: colors.black,
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
    english: {
        ...typography.bodyLarge,
        fontSize: 18,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: spacing.xl,
        width: '100%',
        paddingHorizontal: spacing.sm,
        fontWeight: '500',
    },
    footerInfoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        gap: spacing.xs,
    },
    footerInfo: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    referenceBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
    },
    actions: {
        flexDirection: 'row',
        gap: 30,
        marginTop: spacing.md,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border + '10',
        width: '100%',
        justifyContent: 'center',
    },
    circleAction: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
