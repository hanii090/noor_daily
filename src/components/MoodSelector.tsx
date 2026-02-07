import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseCard } from './clubhouse';
import { colors, typography, spacing } from '../theme';
import { Mood } from '../types';
import { useAppStore } from '../store/appStore';

interface MoodSelectorProps {
    onMoodSelect: (mood: Mood) => void;
    onSkip: () => void;
    onAskAI: () => void;
}

interface MoodConfig {
    mood: Mood;
    label: string;
    arabic: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    bgColor: string;
}

const moods: MoodConfig[] = [
    {
        mood: 'grateful',
        label: 'Grateful',
        arabic: 'Alhamdulillah',
        icon: 'heart',
        iconColor: colors.moods.grateful,
        bgColor: colors.moods.grateful + '15',
    },
    {
        mood: 'peace',
        label: 'Peaceful',
        arabic: 'Salaam',
        icon: 'leaf',
        iconColor: colors.moods.peace,
        bgColor: colors.moods.peace + '15',
    },
    {
        mood: 'strength',
        label: 'Strength',
        arabic: 'Tawakkul',
        icon: 'shield',
        iconColor: colors.moods.strength,
        bgColor: colors.moods.strength + '15',
    },
    {
        mood: 'guidance',
        label: 'Guidance',
        arabic: 'Hidayah',
        icon: 'navigate-circle',
        iconColor: colors.moods.guidance,
        bgColor: colors.moods.guidance + '15',
    },
    {
        mood: 'celebrating',
        label: 'Celebrating',
        arabic: 'Sabr',
        icon: 'sparkles',
        iconColor: colors.moods.celebrating,
        bgColor: colors.moods.celebrating + '15',
    },
];

const MoodCard: React.FC<{
    config: MoodConfig;
    onPress: () => void;
}> = ({ config, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 3,
            tension: 40,
        }).start();
    };

    return (
        <Animated.View style={[styles.moodCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                activeOpacity={0.9}
            >
                <View style={styles.moodCard}>
                    <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
                        <Ionicons name={config.icon} size={28} color={config.iconColor} />
                    </View>
                    <Text style={styles.moodLabel}>{config.label}</Text>
                    <Text style={styles.moodArabic}>{config.arabic}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const MoodSelector: React.FC<MoodSelectorProps> = ({ onMoodSelect, onSkip, onAskAI }) => {
    const { dailyInspiration } = useAppStore();
    const insets = useSafeAreaInsets();
    
    const handleMoodPress = (mood: Mood) => {
        onMoodSelect(mood);
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: insets.top + 100 } // Dynamic padding based on notch + header
            ]}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>How are you feeling today?</Text>
            <Text style={styles.subtitle}>
                Select a mood to find relevant verses for your heart.
            </Text>

            {dailyInspiration && (
                <View style={styles.dailyCardContainer}>
                    <ClubhouseCard style={styles.dailyCard} backgroundColor={colors.white}>
                        <View style={styles.dailyHeader}>
                            <Ionicons name="sparkles" size={16} color={colors.purple} />
                            <Text style={styles.dailyHeaderText}>DAILY AI REFLECTION</Text>
                        </View>
                        <Text style={styles.dailyContent} numberOfLines={2}>
                            "{dailyInspiration.content.english}"
                        </Text>
                        <View style={styles.dailyDivider} />
                        <Text style={styles.dailyReflection}>
                            {dailyInspiration.reflection}
                        </Text>
                        <View style={styles.dailyFooter}>
                            <Text style={styles.dailyReference}>
                                {dailyInspiration.type === 'verse' 
                                    ? (dailyInspiration.content as any).surah + ' ' + (dailyInspiration.content as any).verseNumber
                                    : (dailyInspiration.content as any).reference}
                            </Text>
                        </View>
                    </ClubhouseCard>
                </View>
            )}

            <View style={styles.grid}>
                {moods.map((config, index) => (
                    <MoodCard
                        key={`${config.mood}-${index}`}
                        config={config}
                        onPress={() => handleMoodPress(config.mood)}
                    />
                ))}
            </View>

            <TouchableOpacity 
                style={styles.aiMentorButton} 
                onPress={onAskAI}
                activeOpacity={0.8}
            >
                <View style={styles.aiMentorContent}>
                    <View style={styles.aiIconBadge}>
                        <Ionicons name="sparkles" size={20} color={colors.purple} />
                    </View>
                    <View style={styles.aiTextContainer}>
                        <Text style={styles.aiTitle}>Talk to AI Mentor</Text>
                        <Text style={styles.aiSubtitle}>Describe your situation for personalized guidance</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>
            </TouchableOpacity>
        </ScrollView>
    );
};

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.lg * 3) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 160, // Clear floating tab bar
    },
    title: {
        ...typography.h1,
        fontSize: 32,
        color: colors.black,
        fontWeight: '700',
        marginBottom: spacing.sm,
        lineHeight: 38,
    },
    subtitle: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    moodCardWrapper: {
        width: cardWidth,
        marginBottom: spacing.base,
    },
    moodCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 24,
        padding: spacing.lg,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    moodLabel: {
        ...typography.body,
        fontSize: 18,
        color: colors.black,
        fontWeight: '700',
        marginBottom: 2,
    },
    moodArabic: {
        ...typography.caption,
        fontSize: 13,
        color: colors.textSecondary,
    },
    dailyCardContainer: {
        marginBottom: spacing.xl,
    },
    dailyCard: {
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.purple + '20',
    },
    dailyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    dailyHeaderText: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '800',
        color: colors.purple,
        letterSpacing: 1,
    },
    dailyContent: {
        ...typography.body,
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginBottom: spacing.sm,
    },
    dailyDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
        opacity: 0.5,
    },
    dailyReflection: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 22,
        color: colors.text,
        fontWeight: '500',
    },
    dailyFooter: {
        marginTop: spacing.sm,
        alignItems: 'flex-end',
    },
    dailyReference: {
        ...typography.caption,
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '700',
    },
    aiMentorButton: {
        marginTop: spacing.md,
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    aiMentorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    aiIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.purple + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiTextContainer: {
        flex: 1,
    },
    aiTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.black,
    },
    aiSubtitle: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textSecondary,
    },
});
