import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseButton } from '../components/clubhouse';
import { colors, useTheme, typography, spacing, shadows } from '../theme';
import { useAppStore } from '../store/appStore';
import { Mood } from '../types';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';

const TOTAL_STEPS = 2;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🇵🇰' },
    { code: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
];

const MOOD_PREVIEW: { mood: Mood; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { mood: 'grateful', icon: 'heart', label: 'Grateful' },
    { mood: 'peace', icon: 'leaf', label: 'Peace' },
    { mood: 'strength', icon: 'shield', label: 'Strength' },
    { mood: 'guidance', icon: 'navigate-circle', label: 'Guidance' },
    { mood: 'anxious', icon: 'pulse', label: 'Anxious' },
    { mood: 'hopeful', icon: 'sunny', label: 'Hopeful' },
];

// ── Floating Preview Card ──
const FloatingCard: React.FC<{
    children: React.ReactNode;
    style?: any;
    delay?: number;
    rotation?: number;
}> = ({ children, style, delay = 0, rotation = 0 }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const entryAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry animation
        Animated.spring(entryAnim, {
            toValue: 1,
            tension: 30,
            friction: 8,
            delay,
            useNativeDriver: true,
        }).start();

        // Continuous float
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

const OnboardingScreen = () => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [userName, setUserName] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [darkMode, setDarkMode] = useState(false);
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

    const setOnboardingCompleted = useAppStore((state) => state.setOnboardingCompleted);
    const updateSettings = useAppStore((state) => state.updateSettings);

    const animateTransition = (nextStep: number) => {
        const direction = nextStep > currentStep ? -1 : 1;
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: direction * 50, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setCurrentStep(nextStep);
            slideAnim.setValue(-direction * 50);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20 }),
            ]).start();
        });
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentStep < TOTAL_STEPS - 1) {
            animateTransition(currentStep + 1);
        } else {
            handleGetStarted();
        }
    };

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await handleGetStarted();
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentStep > 0) {
            animateTransition(currentStep - 1);
        }
    };

    const handleLanguageChange = (code: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedLanguage(code);
        i18n.changeLanguage(code);
    };

    const handleDarkModeToggle = (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDarkMode(value);
        updateSettings({ darkMode: value });
    };

    const handleGetStarted = async () => {
        await updateSettings({
            darkMode: darkMode,
            language: selectedLanguage,
            userName: userName.trim(),
        });
        await setOnboardingCompleted(true);
    };

    return (
        <View style={[styles.container, { backgroundColor: tc.creamLight }]}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
                {currentStep === 0 && (
                    <WelcomeStep
                        onNext={handleNext}
                        onSkip={handleSkip}
                    />
                )}
                {currentStep === 1 && (
                    <SetupStep
                        userName={userName}
                        setUserName={setUserName}
                        selectedLanguage={selectedLanguage}
                        onLanguageChange={handleLanguageChange}
                        darkMode={darkMode}
                        onDarkModeToggle={handleDarkModeToggle}
                        selectedMood={selectedMood}
                        onMoodSelect={setSelectedMood}
                        onGetStarted={handleGetStarted}
                        onBack={handleBack}
                    />
                )}
            </Animated.View>
        </View>
    );
};

// ══════════════════════════════════════════════════════════
// ── STEP 1: Hero Welcome Screen (inspired by Neuro app) ──
// ══════════════════════════════════════════════════════════
const WelcomeStep: React.FC<{
    onNext: () => void;
    onSkip: () => void;
}> = ({ onNext, onSkip }) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.welcomeContainer}>
            {/* ── Hero Section (top ~55%) ── */}
            <View style={[styles.heroSection, { backgroundColor: isDark ? '#1A1030' : '#EDE5F7' }]}>
                {/* Gradient overlay stripes (decorative) */}
                <View style={[styles.heroGradientOverlay, { backgroundColor: isDark ? '#2D1B69' : '#D8CCF0' }]} />
                <View style={[styles.heroGradientOverlay2, { backgroundColor: isDark ? '#1E1245' : '#E8DFF5' }]} />

                {/* Floating Preview Cards */}
                <View style={[styles.floatingCardsContainer, { paddingTop: insets.top + 20 }]}>
                    {/* Verse Card - main, slightly left */}
                    <FloatingCard
                        delay={200}
                        rotation={-3}
                        style={styles.floatingCardVerse}
                    >
                        <View style={[styles.previewCard, styles.previewCardLarge, {
                            backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                            shadowColor: isDark ? '#000' : '#7A5BE6',
                        }]}>
                            <View style={[styles.previewCardBadge, { backgroundColor: tc.purple + '15' }]}>
                                <Ionicons name="book-outline" size={12} color={tc.purple} />
                                <Text style={[styles.previewCardBadgeText, { color: tc.purple }]}>Quran</Text>
                            </View>
                            <Text style={[styles.previewArabic, { color: tc.text }]}>
                                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                            </Text>
                            <Text style={[styles.previewTranslation, { color: tc.textSecondary }]}>
                                In the name of Allah, the Most Gracious, the Most Merciful
                            </Text>
                            <View style={styles.previewCardFooter}>
                                <Text style={[styles.previewRef, { color: tc.textTertiary }]}>Al-Fatiha 1:1</Text>
                                <Ionicons name="heart" size={14} color={tc.coral} />
                            </View>
                        </View>
                    </FloatingCard>

                    {/* Hadith Card - right, overlapping */}
                    <FloatingCard
                        delay={500}
                        rotation={4}
                        style={styles.floatingCardHadith}
                    >
                        <View style={[styles.previewCard, styles.previewCardSmall, {
                            backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                            shadowColor: isDark ? '#000' : '#4DB579',
                        }]}>
                            <View style={[styles.previewCardBadge, { backgroundColor: tc.green + '15' }]}>
                                <Ionicons name="chatbubble-outline" size={10} color={tc.green} />
                                <Text style={[styles.previewCardBadgeText, { color: tc.green, fontSize: 9 }]}>Hadith</Text>
                            </View>
                            <Text style={[styles.previewSmallText, { color: tc.text }]} numberOfLines={3}>
                                "The best among you are those who have the best character."
                            </Text>
                            <Text style={[styles.previewRef, { color: tc.textTertiary, fontSize: 9 }]}>Sahih Bukhari</Text>
                        </View>
                    </FloatingCard>

                    {/* Mood Chip - floating top right */}
                    <FloatingCard
                        delay={800}
                        rotation={-2}
                        style={styles.floatingCardMood}
                    >
                        <View style={[styles.moodChipFloat, {
                            backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                            shadowColor: isDark ? '#000' : '#FBB81B',
                        }]}>
                            <View style={[styles.moodChipIcon, { backgroundColor: tc.moods.grateful + '20' }]}>
                                <Ionicons name="heart" size={14} color={tc.moods.grateful} />
                            </View>
                            <Text style={[styles.moodChipText, { color: tc.text }]}>Grateful</Text>
                            <View style={[styles.moodChipDot, { backgroundColor: tc.moods.grateful }]} />
                        </View>
                    </FloatingCard>

                    {/* AI Insight chip */}
                    <FloatingCard
                        delay={1100}
                        rotation={2}
                        style={styles.floatingCardAI}
                    >
                        <View style={[styles.aiChipFloat, {
                            backgroundColor: isDark ? '#2A2A3E' : '#FFFFFF',
                            shadowColor: isDark ? '#000' : '#7A5BE6',
                        }]}>
                            <Ionicons name="sparkles" size={12} color={tc.purple} />
                            <Text style={[styles.aiChipText, { color: tc.purple }]}>AI Tafsir</Text>
                        </View>
                    </FloatingCard>
                </View>
            </View>

            {/* ── Bottom Section (~45%) ── */}
            <View style={[styles.welcomeBottom, { backgroundColor: tc.creamLight }]}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={[styles.logoCircle, { backgroundColor: tc.purple }]}>
                        <Text style={styles.logoIcon}>☪</Text>
                    </View>
                    <Text style={[styles.logoText, { color: tc.text }]}>Noor Daily</Text>
                </View>

                {/* Headline */}
                <Text style={[styles.heroHeadline, { color: tc.text }]}>
                    Your Daily Spiritual{'\n'}Companion
                </Text>

                {/* Subtitle */}
                <Text style={[styles.heroSubtitle, { color: tc.textSecondary }]}>
                    Full Quran reader, verses & Hadith matched to your mood.{'\n'}Reading plans, collections & AI insights.
                </Text>

                {/* CTA Button */}
                <View style={[styles.welcomeCTAContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
                    <ClubhouseButton
                        title={t('onboarding.get_started') || 'Get Started'}
                        onPress={onNext}
                        variant="primary"
                        style={styles.heroCTA}
                    />
                    <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
                        <Text style={[styles.skipLinkText, { color: tc.textTertiary }]}>
                            {t('onboarding.skip_intro') || 'Skip for now'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// ══════════════════════════════════════════════════════════
// ── STEP 2: Quick Setup (Name + Language + Mood) ──
// ══════════════════════════════════════════════════════════
const SetupStep: React.FC<{
    userName: string;
    setUserName: (name: string) => void;
    selectedLanguage: string;
    onLanguageChange: (code: string) => void;
    darkMode: boolean;
    onDarkModeToggle: (v: boolean) => void;
    selectedMood: Mood | null;
    onMoodSelect: (mood: Mood) => void;
    onGetStarted: () => Promise<void>;
    onBack: () => void;
}> = ({ userName, setUserName, selectedLanguage, onLanguageChange, darkMode, onDarkModeToggle, selectedMood, onMoodSelect, onGetStarted, onBack }) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const sectionAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.stagger(120, sectionAnims.map(a =>
            Animated.spring(a, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true })
        )).start();
    }, []);

    const handleMoodSelect = (mood: Mood) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onMoodSelect(mood);
    };

    const animStyle = (index: number) => ({
        opacity: sectionAnims[index],
        transform: [{ translateY: sectionAnims[index].interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }],
    });

    return (
        <View style={[styles.setupContainer, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.setupHeader}>
                <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-back" size={26} color={tc.text} />
                </TouchableOpacity>
                <View style={styles.setupDots}>
                    <View style={[styles.dot, { backgroundColor: tc.textTertiary }]} />
                    <View style={[styles.dot, styles.dotActive, { backgroundColor: tc.purple }]} />
                </View>
                <View style={{ width: 26 }} />
            </View>

            {/* Title */}
            <Animated.View style={[styles.setupTitleContainer, animStyle(0)]}>
                <Text style={[styles.setupTitle, { color: tc.text }]}>
                    {t('onboarding.make_it_yours') || 'Make It Yours'}
                </Text>
                <Text style={[styles.setupSubtitle, { color: tc.textSecondary }]}>
                    {t('onboarding.personalize_desc') || 'Personalize your experience in seconds'}
                </Text>
            </Animated.View>

            <ScrollView
                style={styles.setupScroll}
                contentContainerStyle={[styles.setupScrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
            >
                {/* ── Name Section ── */}
                <Animated.View style={animStyle(0)}>
                    <Text style={[styles.setupSectionLabel, { color: tc.textTertiary }]}>YOUR NAME</Text>
                    <TextInput
                        style={[styles.setupNameInput, {
                            backgroundColor: isDark ? tc.backgroundSecondary : '#FFFFFF',
                            borderColor: tc.border,
                            color: tc.text,
                        }]}
                        placeholder={t('onboarding.name_placeholder') || 'Enter your name'}
                        placeholderTextColor={tc.textTertiary}
                        value={userName}
                        onChangeText={setUserName}
                        maxLength={30}
                        autoCapitalize="words"
                        returnKeyType="done"
                    />
                </Animated.View>

                {/* ── Language Section ── */}
                <Animated.View style={animStyle(1)}>
                    <Text style={[styles.setupSectionLabel, { color: tc.textTertiary }]}>
                        {t('onboarding.language') || 'LANGUAGE'}
                    </Text>
                    <View style={styles.setupLanguageGrid}>
                        {LANGUAGES.map((lang) => {
                            const isSelected = selectedLanguage === lang.code;
                            return (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.setupLangChip,
                                        {
                                            backgroundColor: isDark ? tc.backgroundSecondary : '#FFFFFF',
                                            borderColor: isSelected ? tc.purple : tc.border,
                                            borderWidth: isSelected ? 2 : 1,
                                        },
                                    ]}
                                    onPress={() => onLanguageChange(lang.code)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.setupLangFlag}>{lang.flag}</Text>
                                    <Text style={[styles.setupLangNative, { color: isSelected ? tc.purple : tc.text }]}>
                                        {lang.native}
                                    </Text>
                                    {isSelected && (
                                        <View style={[styles.setupCheckCircle, { backgroundColor: tc.purple }]}>
                                            <Ionicons name="checkmark" size={10} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* ── Mood Section ── */}
                <Animated.View style={animStyle(2)}>
                    <Text style={[styles.setupSectionLabel, { color: tc.textTertiary }]}>
                        {t('onboarding.try_mood_title') || 'HOW ARE YOU FEELING?'}
                    </Text>
                    <View style={styles.setupMoodGrid}>
                        {MOOD_PREVIEW.map((m) => {
                            const moodColor = tc.moods[m.mood];
                            const isSelected = selectedMood === m.mood;
                            return (
                                <TouchableOpacity
                                    key={m.mood}
                                    style={[
                                        styles.setupMoodChip,
                                        {
                                            backgroundColor: isSelected ? moodColor + '18' : (isDark ? tc.backgroundSecondary : '#FFFFFF'),
                                            borderColor: isSelected ? moodColor : tc.border,
                                            borderWidth: isSelected ? 2 : 1,
                                        },
                                    ]}
                                    onPress={() => handleMoodSelect(m.mood)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.setupMoodIcon, { backgroundColor: moodColor + '18' }]}>
                                        <Ionicons name={m.icon} size={18} color={moodColor} />
                                    </View>
                                    <Text style={[styles.setupMoodLabel, { color: isSelected ? moodColor : tc.text }]}>
                                        {t(`mood.${m.mood}`) || m.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* ── Dark Mode Toggle ── */}
                <Animated.View style={animStyle(3)}>
                    <View style={[styles.setupDarkModeCard, {
                        backgroundColor: isDark ? tc.backgroundSecondary : '#FFFFFF',
                        borderColor: tc.border,
                    }]}>
                        <View style={[styles.setupDarkModeIcon, { backgroundColor: isDark ? '#2C2C3E' : '#F2F2F7' }]}>
                            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#FFD60A' : tc.orange} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.setupDarkModeTitle, { color: tc.text }]}>
                                {t('settings.dark_mode') || 'Dark Mode'}
                            </Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={onDarkModeToggle}
                            trackColor={{ false: tc.border, true: tc.purple }}
                            thumbColor="#fff"
                            ios_backgroundColor={tc.border}
                        />
                    </View>
                </Animated.View>
            </ScrollView>

            {/* ── Fixed Bottom CTA ── */}
            <View style={[styles.setupBottomCTA, {
                paddingBottom: insets.bottom + spacing.sm,
                backgroundColor: tc.creamLight,
                borderTopColor: tc.border,
            }]}>
                <ClubhouseButton
                    title={t('onboarding.get_started') || 'Start Your Journey'}
                    onPress={onGetStarted}
                    variant="primary"
                    style={styles.setupCTAButton}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // ── Root ──
    container: {
        flex: 1,
    },

    // ══════════════════════════════════
    // ── STEP 1: Welcome Hero Screen ──
    // ══════════════════════════════════
    welcomeContainer: {
        flex: 1,
    },
    heroSection: {
        flex: 0.52,
        overflow: 'hidden',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroGradientOverlay: {
        position: 'absolute',
        top: 0,
        right: -40,
        width: SCREEN_WIDTH * 0.6,
        height: '100%',
        opacity: 0.3,
        transform: [{ skewX: '-12deg' }],
    },
    heroGradientOverlay2: {
        position: 'absolute',
        top: 0,
        left: -20,
        width: SCREEN_WIDTH * 0.4,
        height: '100%',
        opacity: 0.2,
        transform: [{ skewX: '8deg' }],
    },
    floatingCardsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },

    // Floating card positions
    floatingCardVerse: {
        position: 'absolute',
        left: spacing.lg,
        top: '18%',
        zIndex: 3,
    },
    floatingCardHadith: {
        position: 'absolute',
        right: spacing.md,
        top: '45%',
        zIndex: 2,
    },
    floatingCardMood: {
        position: 'absolute',
        right: spacing.xl,
        top: '12%',
        zIndex: 4,
    },
    floatingCardAI: {
        position: 'absolute',
        left: spacing.xl + 10,
        bottom: '12%',
        zIndex: 4,
    },

    // Preview cards
    previewCard: {
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
    previewCardLarge: {
        width: SCREEN_WIDTH * 0.58,
        gap: spacing.sm,
    },
    previewCardSmall: {
        width: SCREEN_WIDTH * 0.42,
        gap: spacing.xs,
    },
    previewCardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
    },
    previewCardBadgeText: {
        ...typography.small,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    previewArabic: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 18,
        lineHeight: 30,
        textAlign: 'right',
    },
    previewTranslation: {
        ...typography.small,
        fontSize: 11,
        lineHeight: 16,
    },
    previewSmallText: {
        ...typography.small,
        fontSize: 11,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    previewCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previewRef: {
        ...typography.small,
        fontSize: 10,
        fontWeight: '600',
    },

    // Floating chips
    moodChipFloat: {
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
    moodChipIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moodChipText: {
        ...typography.small,
        fontSize: 12,
        fontWeight: '700',
    },
    moodChipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    aiChipFloat: {
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
    aiChipText: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '700',
    },

    // Welcome bottom section
    welcomeBottom: {
        flex: 0.48,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    logoCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoIcon: {
        fontSize: 18,
        color: '#FFFFFF',
    },
    logoText: {
        ...typography.h3,
        fontSize: 20,
        fontWeight: '700',
    },
    heroHeadline: {
        ...typography.h1,
        fontSize: 32,
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: spacing.md,
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        ...typography.body,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    welcomeCTAContainer: {
        width: '100%',
        paddingHorizontal: spacing.sm,
    },
    heroCTA: {
        height: 56,
        borderRadius: 28,
        ...shadows.medium,
    },
    skipLink: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    skipLinkText: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '600',
    },

    // ══════════════════════════════════
    // ── STEP 2: Quick Setup Screen ──
    // ══════════════════════════════════
    setupContainer: {
        flex: 1,
    },
    setupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    setupDots: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 0.4,
    },
    dotActive: {
        width: 24,
        borderRadius: 4,
        opacity: 1,
    },
    setupTitleContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    setupTitle: {
        ...typography.h1,
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    setupSubtitle: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 22,
    },
    setupScroll: {
        flex: 1,
    },
    setupScrollContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
    },

    // Name input
    setupSectionLabel: {
        ...typography.small,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
    },
    setupNameInput: {
        ...typography.body,
        fontSize: 16,
        paddingVertical: 14,
        paddingHorizontal: spacing.base,
        borderRadius: 14,
        borderWidth: 1,
    },

    // Language grid
    setupLanguageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    setupLangChip: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
        borderRadius: 14,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative' as const,
        gap: 2,
    },
    setupLangFlag: {
        fontSize: 22,
        marginBottom: 2,
    },
    setupLangNative: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '700',
    },
    setupCheckCircle: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Mood grid
    setupMoodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    setupMoodChip: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3,
        borderRadius: 14,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    setupMoodIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    setupMoodLabel: {
        ...typography.small,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Dark mode card
    setupDarkModeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.base,
        borderRadius: 14,
        borderWidth: 1,
    },
    setupDarkModeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    setupDarkModeTitle: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '600',
    },

    // Bottom CTA
    setupBottomCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
    },
    setupCTAButton: {
        height: 56,
        borderRadius: 28,
        ...shadows.medium,
    },
});

export default OnboardingScreen;
