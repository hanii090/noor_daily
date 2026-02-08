import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, TextInput, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseBackground, ClubhouseButton, ClubhouseCard } from '../components/clubhouse';
import { colors, useTheme, typography, spacing, shadows } from '../theme';
import { useAppStore } from '../store/appStore';
import { Mood } from '../types';
import notificationService from '../services/notificationService';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import DateTimePicker from '@react-native-community/datetimepicker';

const TOTAL_STEPS = 5;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ar', label: 'Arabic', native: 'العربية' },
    { code: 'ur', label: 'Urdu', native: 'اردو' },
    { code: 'tr', label: 'Turkish', native: 'Türkçe' },
];

// ── Progress Bar Component ──
const ProgressBar: React.FC<{ step: number; total: number; color: string; bgColor: string }> = ({ step, total, color, bgColor }) => {
    const widthAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(widthAnim, {
            toValue: (step + 1) / total,
            tension: 40,
            friction: 8,
            useNativeDriver: false,
        }).start();
    }, [step]);
    return (
        <View style={[styles.progressBarBg, { backgroundColor: bgColor }]}>
            <Animated.View style={[styles.progressBarFill, { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
    );
};

const OnboardingScreen = () => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date(2024, 0, 1, 8, 0));
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
            Animated.timing(slideAnim, { toValue: direction * 30, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setCurrentStep(nextStep);
            slideAnim.setValue(-direction * 30);
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
        const hours = reminderTime.getHours();
        const minutes = reminderTime.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        await updateSettings({
            notificationTime: timeString,
            notificationsEnabled: notificationsEnabled,
            darkMode: darkMode,
            language: selectedLanguage,
            userName: userName.trim(),
        });

        if (notificationsEnabled) {
            const hasPermission = await notificationService.requestPermissions();
            if (hasPermission) {
                const settings = useAppStore.getState().settings;
                await notificationService.scheduleRandomDailyNotifications(
                    settings.notificationFrequency,
                    settings.notificationContentType,
                    { start: settings.quietHoursStart, end: settings.quietHoursEnd },
                    settings.weekendMode
                );
            } else {
                await updateSettings({ notificationsEnabled: false });
            }
        }

        await setOnboardingCompleted(true);
    };

    const handleTimeChange = (_event: any, selectedDate?: Date) => {
        if (selectedDate) setReminderTime(selectedDate);
    };

    const toggleNotifications = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setNotificationsEnabled(!notificationsEnabled);
    };

    return (
        <ClubhouseBackground color="creamLight">
            <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
                {/* Header: Back + Progress + Step */}
                <View style={styles.headerRow}>
                    {currentStep > 0 ? (
                        <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="chevron-back" size={26} color={tc.text} />
                        </TouchableOpacity>
                    ) : <View style={{ width: 26 }} />}
                    <View style={styles.progressBarWrapper}>
                        <ProgressBar step={currentStep} total={TOTAL_STEPS} color={tc.purple} bgColor={tc.border} />
                    </View>
                    <Text style={[styles.stepCounter, { color: tc.textTertiary }]}>{currentStep + 1}/{TOTAL_STEPS}</Text>
                </View>

                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
                    {currentStep === 0 && (
                        <WelcomeStep onNext={handleNext} onSkip={handleSkip} userName={userName} setUserName={setUserName} />
                    )}
                    {currentStep === 1 && (
                        <LanguageAppearanceStep
                            selectedLanguage={selectedLanguage}
                            onLanguageChange={handleLanguageChange}
                            darkMode={darkMode}
                            onDarkModeToggle={handleDarkModeToggle}
                            onNext={handleNext}
                            onSkip={handleSkip}
                        />
                    )}
                    {currentStep === 2 && (
                        <FeatureShowcaseStep onNext={handleNext} onSkip={handleSkip} />
                    )}
                    {currentStep === 3 && (
                        <MoodPreviewStep
                            selectedMood={selectedMood}
                            onMoodSelect={setSelectedMood}
                            onNext={handleNext}
                            onSkip={handleSkip}
                        />
                    )}
                    {currentStep === 4 && (
                        <NotificationStep
                            notificationsEnabled={notificationsEnabled}
                            toggleNotifications={toggleNotifications}
                            reminderTime={reminderTime}
                            onTimeChange={handleTimeChange}
                            onGetStarted={handleGetStarted}
                        />
                    )}
                </Animated.View>
            </View>
        </ClubhouseBackground>
    );
};

// ── Step 1: Welcome + Name ──
const WelcomeStep: React.FC<{
    onNext: () => void; onSkip: () => void;
    userName: string; setUserName: (name: string) => void;
}> = ({ onNext, onSkip, userName, setUserName }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
        <View style={styles.screenWrapper}>
            <View style={styles.topSection}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconBackground, { backgroundColor: tc.white, borderColor: tc.border }]}>
                        <Ionicons name="book" size={56} color={tc.text} />
                    </View>
                </View>
                <Text style={[styles.appName, { color: tc.text }]}>Noor Daily</Text>
                <Text style={[styles.subtitle, { color: tc.textSecondary }]}>{t('onboarding.daily_guidance')}</Text>
            </View>
            <View style={[styles.middleSection, { justifyContent: 'center' }]}>
                <Text style={[styles.heading, { color: tc.text }]}>{t('onboarding.whats_your_name')}</Text>
                <TextInput
                    style={[styles.nameInput, { backgroundColor: tc.white, borderColor: tc.border, color: tc.text }]}
                    placeholder={t('onboarding.name_placeholder')}
                    placeholderTextColor={tc.textTertiary}
                    value={userName}
                    onChangeText={setUserName}
                    maxLength={30}
                    autoCapitalize="words"
                    returnKeyType="done"
                />
                <Text style={[styles.description, { color: tc.textSecondary }]}>{t('onboarding.name_desc')}</Text>
            </View>
            <BottomButtons onNext={onNext} onSkip={onSkip} nextLabel={t('onboarding.continue')} />
        </View>
    );
};

// ── Step 2: Language & Appearance ──
const LanguageAppearanceStep: React.FC<{
    selectedLanguage: string;
    onLanguageChange: (code: string) => void;
    darkMode: boolean;
    onDarkModeToggle: (v: boolean) => void;
    onNext: () => void;
    onSkip: () => void;
}> = ({ selectedLanguage, onLanguageChange, darkMode, onDarkModeToggle, onNext, onSkip }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
        <View style={styles.screenWrapper}>
            <View style={styles.topSection}>
                <Text style={[styles.heading, { color: tc.text }]}>{t('onboarding.personalize_title')}</Text>
                <Text style={[styles.howItWorksSubtitle, { color: tc.textSecondary }]}>{t('onboarding.personalize_desc')}</Text>
            </View>
            <ScrollView style={styles.middleSection} contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false}>
                {/* Language Selection */}
                <Text style={[styles.sectionLabel, { color: tc.textTertiary }]}>{t('onboarding.choose_language')}</Text>
                <View style={styles.languageGrid}>
                    {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                styles.languageChip,
                                { backgroundColor: tc.white, borderColor: tc.border },
                                selectedLanguage === lang.code && { borderColor: tc.purple, backgroundColor: tc.purple + '10' },
                            ]}
                            onPress={() => onLanguageChange(lang.code)}
                        >
                            <Text style={[styles.languageNative, { color: selectedLanguage === lang.code ? tc.purple : tc.text }]}>{lang.native}</Text>
                            <Text style={[styles.languageLabel, { color: tc.textSecondary }]}>{lang.label}</Text>
                            {selectedLanguage === lang.code && (
                                <View style={[styles.checkCircle, { backgroundColor: tc.purple }]}>
                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Dark Mode */}
                <Text style={[styles.sectionLabel, { color: tc.textTertiary, marginTop: spacing.md }]}>{t('onboarding.choose_appearance')}</Text>
                <View style={[styles.appearanceCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                    <View style={styles.appearanceRow}>
                        <View style={[styles.iconBadge, { backgroundColor: '#1C1C1E' }]}>
                            <Ionicons name="moon" size={20} color="#FFD60A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.featureTitle, { color: tc.text }]}>{t('settings.dark_mode')}</Text>
                            <Text style={[styles.featureDescription, { color: tc.textSecondary }]}>{t('onboarding.dark_mode_desc')}</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={onDarkModeToggle}
                            trackColor={{ false: tc.border, true: tc.purple }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>
            </ScrollView>
            <BottomButtons onNext={onNext} onSkip={onSkip} nextLabel={t('onboarding.continue')} />
        </View>
    );
};

// ── Step 3: Feature Showcase ──
const FEATURES = [
    { icon: 'heart' as const, color: 'purple', titleKey: 'onboarding.feat_mood', descKey: 'onboarding.feat_mood_desc' },
    { icon: 'flame' as const, color: 'orange', titleKey: 'onboarding.feat_journey', descKey: 'onboarding.feat_journey_desc' },
    { icon: 'school-outline' as const, color: 'teal', titleKey: 'onboarding.feat_exam', descKey: 'onboarding.feat_exam_desc' },
    { icon: 'star' as const, color: 'green', titleKey: 'onboarding.feat_names', descKey: 'onboarding.feat_names_desc' },
    { icon: 'sparkles' as const, color: 'coral', titleKey: 'onboarding.feat_ai', descKey: 'onboarding.feat_ai_desc' },
];

const FeatureShowcaseStep: React.FC<{ onNext: () => void; onSkip: () => void }> = ({ onNext, onSkip }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    const anims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.stagger(100, anims.map(a => Animated.spring(a, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }))).start();
    }, []);

    const getColor = (c: string) => {
        const map: Record<string, string> = { purple: tc.purple, orange: tc.orange, teal: tc.teal, green: tc.green, coral: tc.coral };
        return map[c] || tc.purple;
    };

    return (
        <View style={styles.screenWrapper}>
            <View style={styles.topSection}>
                <Text style={[styles.heading, { color: tc.text }]}>{t('onboarding.discover_features')}</Text>
                <Text style={[styles.howItWorksSubtitle, { color: tc.textSecondary }]}>{t('onboarding.discover_features_desc')}</Text>
            </View>
            <ScrollView style={styles.middleSection} contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
                {FEATURES.map((f, i) => {
                    const c = getColor(f.color);
                    return (
                        <Animated.View key={i} style={{ opacity: anims[i], transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                            <View style={[styles.featureCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                                <View style={[styles.featureIconContainer, { backgroundColor: c + '12' }]}>
                                    <Ionicons name={f.icon} size={22} color={c} />
                                </View>
                                <View style={styles.featureContent}>
                                    <Text style={[styles.featureTitle, { color: tc.text }]}>{t(f.titleKey)}</Text>
                                    <Text style={[styles.featureDescription, { color: tc.textSecondary }]}>{t(f.descKey)}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    );
                })}
            </ScrollView>
            <BottomButtons onNext={onNext} onSkip={onSkip} nextLabel={t('onboarding.continue')} />
        </View>
    );
};

// ── Step 4: Mood Preview ──
const MOOD_PREVIEW: { mood: Mood; icon: keyof typeof Ionicons.glyphMap; arabic: string }[] = [
    { mood: 'grateful', icon: 'heart', arabic: 'Alhamdulillah' },
    { mood: 'peace', icon: 'leaf', arabic: 'Salaam' },
    { mood: 'strength', icon: 'shield', arabic: 'Tawakkul' },
    { mood: 'guidance', icon: 'navigate-circle', arabic: 'Hidayah' },
    { mood: 'anxious', icon: 'pulse', arabic: 'Qalaq' },
    { mood: 'hopeful', icon: 'sunny', arabic: "Rajā'" },
];

const MoodPreviewStep: React.FC<{
    selectedMood: Mood | null;
    onMoodSelect: (mood: Mood) => void;
    onNext: () => void;
    onSkip: () => void;
}> = ({ selectedMood, onMoodSelect, onNext, onSkip }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    const anims = useRef(MOOD_PREVIEW.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.stagger(80, anims.map(a => Animated.spring(a, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }))).start();
    }, []);

    const handleSelect = (mood: Mood) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onMoodSelect(mood);
    };

    return (
        <View style={styles.screenWrapper}>
            <View style={styles.topSection}>
                <Text style={[styles.heading, { color: tc.text }]}>{t('onboarding.try_mood_title')}</Text>
                <Text style={[styles.howItWorksSubtitle, { color: tc.textSecondary }]}>{t('onboarding.try_mood_desc')}</Text>
            </View>
            <View style={[styles.middleSection, { justifyContent: 'flex-start', paddingTop: spacing.lg }]}>
                <View style={styles.moodGrid}>
                    {MOOD_PREVIEW.map((m, i) => {
                        const moodColor = tc.moods[m.mood];
                        const isSelected = selectedMood === m.mood;
                        return (
                            <Animated.View
                                key={m.mood}
                                style={{
                                    opacity: anims[i],
                                    transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                                    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3,
                                }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.moodCard,
                                        { backgroundColor: tc.white, borderColor: tc.border },
                                        isSelected && { borderColor: moodColor, borderWidth: 2, backgroundColor: moodColor + '10' },
                                    ]}
                                    onPress={() => handleSelect(m.mood)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.moodIconCircle, { backgroundColor: moodColor + '15' }]}>
                                        <Ionicons name={m.icon} size={22} color={moodColor} />
                                    </View>
                                    <Text style={[styles.moodLabel, { color: isSelected ? moodColor : tc.text }]}>{t(`mood.${m.mood}`)}</Text>
                                    <Text style={[styles.moodArabic, { color: tc.textSecondary }]}>{m.arabic}</Text>
                                    {isSelected && (
                                        <View style={[styles.moodCheck, { backgroundColor: moodColor }]}>
                                            <Ionicons name="checkmark" size={10} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>
                {selectedMood && (
                    <Animated.View style={[styles.moodHint, { backgroundColor: tc.moods[selectedMood] + '10', borderColor: tc.moods[selectedMood] + '30' }]}>
                        <Ionicons name="sparkles" size={16} color={tc.moods[selectedMood]} />
                        <Text style={[styles.moodHintText, { color: tc.moods[selectedMood] }]}>
                            {t('onboarding.mood_selected_hint')}
                        </Text>
                    </Animated.View>
                )}
            </View>
            <BottomButtons onNext={onNext} onSkip={onSkip} nextLabel={t('onboarding.continue')} />
        </View>
    );
};

// ── Step 5: Notifications ──
const NotificationStep: React.FC<{
    notificationsEnabled: boolean;
    toggleNotifications: () => void;
    reminderTime: Date;
    onTimeChange: (event: any, date?: Date) => void;
    onGetStarted: () => void;
}> = ({ notificationsEnabled, toggleNotifications, reminderTime, onTimeChange, onGetStarted }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
        <View style={styles.screenWrapper}>
            <View style={styles.topSection}>
                <Text style={[styles.heading, { color: tc.text }]}>{t('onboarding.daily_reminder')}</Text>
                <Text style={[styles.howItWorksSubtitle, { color: tc.textSecondary }]}>{t('onboarding.when_verse')}</Text>
            </View>
            <View style={[styles.middleSection, { justifyContent: 'center' }]}>
                <View style={[styles.timePickerCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                    <DateTimePicker
                        value={reminderTime}
                        mode="time"
                        display="spinner"
                        onChange={onTimeChange}
                        textColor={tc.text}
                        style={styles.timePicker}
                    />
                    <View style={[styles.notificationRow, { borderTopColor: tc.border + '30' }]}>
                        <View style={styles.notificationLeft}>
                            <View style={[styles.iconBadge, { backgroundColor: tc.purple + '10' }]}>
                                <Ionicons name="notifications" size={20} color={tc.purple} />
                            </View>
                            <View style={styles.notificationText}>
                                <Text style={[styles.notificationTitle, { color: tc.text }]}>{t('onboarding.notifications')}</Text>
                                <Text style={[styles.notificationSubtitle, { color: tc.textSecondary }]}>{t('onboarding.enable_push')}</Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: tc.border, true: tc.purple }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>
            </View>
            <View style={styles.bottomSection}>
                <View style={styles.buttonContainer}>
                    <ClubhouseButton
                        title={t('onboarding.get_started')}
                        onPress={onGetStarted}
                        variant="primary"
                        style={styles.actionButton}
                    />
                    <Text style={[styles.changeText, { color: tc.textTertiary }]}>{t('onboarding.change_anytime')}</Text>
                </View>
            </View>
        </View>
    );
};

// ── Shared Bottom Buttons ──
const BottomButtons: React.FC<{ onNext: () => void; onSkip: () => void; nextLabel: string }> = ({ onNext, onSkip, nextLabel }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
        <View style={styles.bottomSection}>
            <View style={styles.buttonContainer}>
                <ClubhouseButton title={nextLabel} onPress={onNext} variant="primary" style={styles.actionButton} />
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                    <Text style={[styles.skipText, { color: tc.textTertiary }]}>{t('onboarding.skip_intro')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    screenWrapper: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topSection: {
        alignItems: 'center',
        paddingTop: spacing.base,
    },
    middleSection: {
        flex: 1,
        paddingVertical: spacing.md,
    },
    bottomSection: {
        paddingBottom: spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
    },
    backButton: {
        width: 26,
    },
    progressBarWrapper: {
        flex: 1,
    },
    progressBarBg: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    stepCounter: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        minWidth: 28,
        textAlign: 'right',
    },

    // Welcome
    iconContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        ...shadows.medium,
    },
    appName: {
        ...typography.h1,
        fontSize: 32,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.caption,
        fontSize: 12,
        textAlign: 'center',
        letterSpacing: 2,
        fontWeight: '700',
    },
    heading: {
        ...typography.h2,
        fontSize: 26,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        ...typography.body,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: spacing.md,
    },
    nameInput: {
        ...typography.body,
        fontSize: 18,
        textAlign: 'center',
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },

    // Language & Appearance
    sectionLabel: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: spacing.xs,
    },
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    languageChip: {
        width: (SCREEN_WIDTH - spacing.lg * 4 - spacing.sm) / 2,
        borderRadius: 16,
        padding: spacing.base,
        borderWidth: 1.5,
        alignItems: 'center',
        position: 'relative',
    },
    languageNative: {
        ...typography.h3,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    languageLabel: {
        ...typography.caption,
        fontSize: 12,
    },
    checkCircle: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appearanceCard: {
        borderRadius: 20,
        padding: spacing.lg,
        borderWidth: 1,
    },
    appearanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    howItWorksSubtitle: {
        ...typography.body,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: spacing.md,
    },

    // Feature Showcase
    featureCard: {
        borderRadius: 20,
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    featureIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    featureDescription: {
        ...typography.body,
        fontSize: 13,
        lineHeight: 18,
    },

    // Mood Preview
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        justifyContent: 'center',
    },
    moodCard: {
        borderRadius: 18,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.xs,
        alignItems: 'center',
        borderWidth: 1,
        position: 'relative',
    },
    moodIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    moodLabel: {
        ...typography.body,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    moodArabic: {
        ...typography.caption,
        fontSize: 10,
        textAlign: 'center',
    },
    moodCheck: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moodHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: spacing.lg,
        alignSelf: 'center',
    },
    moodHintText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '700',
    },

    // Notifications
    timePickerCard: {
        borderRadius: 24,
        padding: spacing.lg,
        borderWidth: 1,
        ...shadows.medium,
    },
    timePicker: {
        height: 160,
    },
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.lg,
        marginTop: spacing.md,
        borderTopWidth: 1,
    },
    notificationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    notificationText: {
        flex: 1,
    },
    notificationTitle: {
        ...typography.body,
        fontSize: 16,
        fontWeight: '700',
    },
    notificationSubtitle: {
        ...typography.caption,
        fontSize: 13,
    },

    // Common
    buttonContainer: {
        paddingHorizontal: 0,
    },
    actionButton: {
        height: 56,
        borderRadius: 20,
        ...shadows.medium,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    skipText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    changeText: {
        ...typography.caption,
        fontSize: 13,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});

export default OnboardingScreen;
