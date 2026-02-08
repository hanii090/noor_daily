import React, { useRef, useEffect, useState } from 'react';
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
import { colors, useTheme, typography, spacing } from '../theme';
import { Mood, NameOfAllah } from '../types';
import { useTranslation } from 'react-i18next';
import namesOfAllahService from '../services/namesOfAllahService';

interface MoodSelectorProps {
    onMoodSelect: (mood: Mood) => void;
    onSkip: () => void;
    onAskAI?: () => void;
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
        arabic: 'Farḥ',
        icon: 'sparkles',
        iconColor: colors.moods.celebrating,
        bgColor: colors.moods.celebrating + '15',
    },
    {
        mood: 'anxious',
        label: 'Anxious',
        arabic: 'Qalaq',
        icon: 'pulse',
        iconColor: colors.moods.anxious,
        bgColor: colors.moods.anxious + '15',
    },
    {
        mood: 'sad',
        label: 'Sad',
        arabic: 'Ḥuzn',
        icon: 'rainy',
        iconColor: colors.moods.sad,
        bgColor: colors.moods.sad + '15',
    },
    {
        mood: 'hopeful',
        label: 'Hopeful',
        arabic: 'Rajā\'',
        icon: 'sunny',
        iconColor: colors.moods.hopeful,
        bgColor: colors.moods.hopeful + '15',
    },
];

const MoodCard: React.FC<{
    config: MoodConfig;
    onPress: () => void;
    translatedLabel?: string;
}> = React.memo(({ config, onPress, translatedLabel }) => {
    const { colors: tc } = useTheme();
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
                accessibilityRole="button"
                accessibilityLabel={`${translatedLabel || config.label} mood`}
            >
                <View style={[styles.moodCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
                    <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
                        <Ionicons name={config.icon} size={22} color={config.iconColor} />
                    </View>
                    <Text style={[styles.moodLabel, { color: tc.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{translatedLabel || config.label}</Text>
                    <Text style={[styles.moodArabic, { color: tc.textSecondary }]} numberOfLines={1}>{config.arabic}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export const MoodSelector: React.FC<MoodSelectorProps> = ({ onMoodSelect }) => {
    const { colors: themeColors } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [dailyName, setDailyName] = useState<NameOfAllah | null>(null);
    const [nameExpanded, setNameExpanded] = useState(false);

    // Stagger animations
    const nameCardAnim = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(moods.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Fetch daily Name of Allah
        namesOfAllahService.getDailyName().then(setDailyName).catch(() => {});

        // Stagger: name card, then mood cards
        const animations = [
            Animated.timing(nameCardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ...cardAnims.map((anim) =>
                Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true })
            ),
        ];
        Animated.stagger(80, animations).start();
    }, []);
    
    const handleMoodPress = (mood: Mood) => {
        onMoodSelect(mood);
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { paddingTop: insets.top + 90 } // Clear compact header
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
        >
            <Text style={[styles.title, { color: themeColors.text }]}>{t('mood.how_feeling')}</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                {t('mood.select_desc', { defaultValue: 'Select a mood to find relevant verses for your heart.' })}
            </Text>

            {/* Daily Name of Allah */}
            {dailyName && (
                <Animated.View style={[
                    styles.nameCardContainer,
                    { opacity: nameCardAnim, transform: [{ translateY: nameCardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }
                ]}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setNameExpanded(!nameExpanded);
                        }}
                    >
                        <View style={[styles.nameCard, { backgroundColor: themeColors.white, borderColor: themeColors.teal + '25' }]}>
                            <View style={styles.nameCardHeader}>
                                <View style={[styles.nameIconCircle, { backgroundColor: themeColors.teal + '12' }]}>
                                    <Ionicons name="star" size={14} color={themeColors.teal} />
                                </View>
                                <Text style={[styles.nameHeaderLabel, { color: themeColors.teal }]}>{t('guidance.name_of_day')}</Text>
                                <Ionicons name={nameExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={themeColors.textTertiary} />
                            </View>
                            <Text style={[styles.nameArabic, { color: themeColors.text }]}>{dailyName.arabic}</Text>
                            <Text style={[styles.nameEnglish, { color: themeColors.text }]}>{dailyName.english}</Text>
                            <Text style={[styles.nameMeaning, { color: themeColors.teal }]}>{dailyName.meaning}</Text>
                            {nameExpanded && (
                                <View style={styles.nameExpandedContent}>
                                    <View style={[styles.nameDivider, { backgroundColor: themeColors.teal + '15' }]} />
                                    <Text style={[styles.nameDescription, { color: themeColors.textSecondary }]}>
                                        {dailyName.summary || dailyName.description}
                                    </Text>
                                    {dailyName.location && dailyName.location.length > 0 && (
                                        <View style={styles.nameLocationRow}>
                                            <Ionicons name="book-outline" size={12} color={themeColors.textTertiary} />
                                            <Text style={[styles.nameLocation, { color: themeColors.textTertiary }]}>
                                                {dailyName.location.slice(0, 3).join(' · ')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <View style={styles.grid}>
                {moods.map((config, index) => (
                    <Animated.View
                        key={`${config.mood}-${index}`}
                        style={{
                            opacity: cardAnims[index],
                            transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                            width: cardWidth,
                        }}
                    >
                        <MoodCard
                            config={config}
                            onPress={() => handleMoodPress(config.mood)}
                            translatedLabel={t(`mood.${config.mood}`)}
                        />
                    </Animated.View>
                ))}
            </View>

        </ScrollView>
    );
};

const { width } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const cardWidth = (width - spacing.lg * 2 - GRID_GAP * 2) / 3;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 220, // Clear floating bar + tab bar
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
        gap: GRID_GAP,
    },
    moodCardWrapper: {
        width: cardWidth,
    },
    moodCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 20,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    moodLabel: {
        ...typography.body,
        fontSize: 13,
        color: colors.black,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 1,
    },
    moodArabic: {
        ...typography.caption,
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    nameCardContainer: {
        marginBottom: spacing.lg,
    },
    nameCard: {
        borderRadius: 20,
        padding: spacing.lg,
        borderWidth: 1,
    },
    nameCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    nameIconCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameHeaderLabel: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        flex: 1,
    },
    nameArabic: {
        fontSize: 28,
        textAlign: 'center',
        lineHeight: 44,
        marginBottom: spacing.xs,
        color: colors.text,
    },
    nameEnglish: {
        ...typography.h3,
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '700',
        marginBottom: 2,
    },
    nameMeaning: {
        ...typography.body,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    nameExpandedContent: {
        marginTop: spacing.sm,
    },
    nameDivider: {
        height: 1,
        marginVertical: spacing.sm,
        borderRadius: 0.5,
    },
    nameDescription: {
        ...typography.body,
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
    },
    nameLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: spacing.sm,
    },
    nameLocation: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '600',
    },
});
