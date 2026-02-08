import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseBackground, ClubhouseButton, ClubhouseCard } from '../components/clubhouse';
import { colors, useTheme, typography, spacing, shadows } from '../theme';
import { useAppStore } from '../store/appStore';
import notificationService from '../services/notificationService';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';

const OnboardingScreen = () => {
    const { colors: tc } = useTheme();
    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date(2024, 0, 1, 8, 0)); // 8:00 AM
    const [userName, setUserName] = useState('');

    const setOnboardingCompleted = useAppStore((state) => state.setOnboardingCompleted);
    const updateSettings = useAppStore((state) => state.updateSettings);

    const animateTransition = (nextStep: number) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setCurrentStep(nextStep);
            slideAnim.setValue(30);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20 }),
            ]).start();
        });
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentStep < 2) {
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

    const handleGetStarted = async () => {
        // Save notification settings
        const hours = reminderTime.getHours();
        const minutes = reminderTime.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        await updateSettings({
            notificationTime: timeString,
            notificationsEnabled: notificationsEnabled,
            darkMode: false,
            language: 'en',
            userName: userName.trim(),
        });

        // If enabled, schedule the notifications
        if (notificationsEnabled) {
            const hasPermission = await notificationService.requestPermissions();
            if (hasPermission) {
                const store = useAppStore.getState();
                await notificationService.scheduleRandomDailyNotifications(
                    store.settings.notificationFrequency,
                    store.settings.notificationContentType,
                    {
                        start: store.settings.quietHoursStart,
                        end: store.settings.quietHoursEnd,
                    },
                    store.settings.weekendMode
                );
            } else {
                // If permission was denied, force disabled in settings
                await updateSettings({ notificationsEnabled: false });
            }
        }

        await setOnboardingCompleted(true);
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (selectedDate) {
            setReminderTime(selectedDate);
        }
    };

    const toggleNotifications = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setNotificationsEnabled(!notificationsEnabled);
    };

    return (
        <ClubhouseBackground color="creamLight">
            <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
                    {currentStep === 0 && <WelcomeScreen onNext={handleNext} onSkip={handleSkip} userName={userName} setUserName={setUserName} />}
                    {currentStep === 1 && <HowItWorksScreen onNext={handleNext} onSkip={handleSkip} />}
                    {currentStep === 2 && (
                        <DailyReminderScreen
                            onBack={handleBack}
                            onGetStarted={handleGetStarted}
                            notificationsEnabled={notificationsEnabled}
                            toggleNotifications={toggleNotifications}
                            reminderTime={reminderTime}
                            onTimeChange={handleTimeChange}
                        />
                    )}
                </Animated.View>
            </View>
        </ClubhouseBackground>
    );
};

// Screen 1: Welcome
const WelcomeScreen: React.FC<{ onNext: () => void; onSkip: () => void; userName: string; setUserName: (name: string) => void }> = ({ onNext, onSkip, userName, setUserName }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
    <View style={styles.screenWrapper}>
        <View style={styles.topSection}>
            {/* App Icon */}
            <View style={styles.iconContainer}>
                <View style={[styles.iconBackground, { backgroundColor: tc.white, borderColor: tc.border }]}>
                    <Ionicons name="book" size={56} color={tc.text} />
                </View>
            </View>

            {/* App Name */}
            <Text style={[styles.appName, { color: tc.text }]}>Noor Daily</Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: tc.textSecondary }]}>{t('onboarding.daily_guidance')}</Text>
        </View>

        <View style={styles.middleSection}>
            {/* Main Heading */}
            <Text style={[styles.heading, { color: tc.text }]}>{t('onboarding.whats_your_name')}</Text>

            {/* Name Input */}
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

            {/* Description */}
            <Text style={[styles.description, { color: tc.textSecondary }]}>
                {t('onboarding.name_desc')}
            </Text>
        </View>

        <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                <View style={[styles.dot, { backgroundColor: tc.border }, styles.dotActive]} />
                <View style={[styles.dot, { backgroundColor: tc.border }]} />
                <View style={[styles.dot, { backgroundColor: tc.border }]} />
            </View>

            {/* Get Started Button */}
            <View style={styles.buttonContainer}>
                <ClubhouseButton
                    title={t('onboarding.continue')}
                    onPress={onNext}
                    variant="primary"
                    style={styles.actionButton}
                />
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                    <Text style={[styles.skipText, { color: tc.textTertiary }]}>{t('onboarding.skip_intro')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
    );
};

// Screen 2: How It Works
const HowItWorksScreen: React.FC<{ onNext: () => void; onSkip: () => void }> = ({ onNext, onSkip }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
    <View style={styles.screenWrapper}>
        <View style={styles.topSection}>
            <Text style={[styles.howItWorksTitle, { color: tc.text }]}>{t('onboarding.how_it_works')}</Text>
            <Text style={[styles.howItWorksSubtitle, { color: tc.textSecondary }]}>
                {t('onboarding.how_it_works_desc')}
            </Text>
        </View>

        <View style={styles.middleSection}>
            {/* Feature Cards */}
            <View style={styles.featureCards}>
                <View style={[styles.featureCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: tc.purple + '10' }]}>
                        <Ionicons name="heart" size={24} color={tc.purple} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={[styles.featureTitle, { color: tc.text }]}>{t('onboarding.step_mood')}</Text>
                        <Text style={[styles.featureDescription, { color: tc.textSecondary }]}>
                            {t('onboarding.step_mood_desc')}
                        </Text>
                    </View>
                </View>

                <View style={[styles.featureCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: tc.green + '10' }]}>
                        <Ionicons name="book" size={24} color={tc.green} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={[styles.featureTitle, { color: tc.text }]}>{t('onboarding.step_read')}</Text>
                        <Text style={[styles.featureDescription, { color: tc.textSecondary }]}>
                            {t('onboarding.step_read_desc')}
                        </Text>
                    </View>
                </View>

                <View style={[styles.featureCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                    <View style={[styles.featureIconContainer, { backgroundColor: tc.teal + '10' }]}>
                        <Ionicons name="share-social" size={24} color={tc.teal} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={[styles.featureTitle, { color: tc.text }]}>{t('onboarding.step_share')}</Text>
                        <Text style={[styles.featureDescription, { color: tc.textSecondary }]}>
                            {t('onboarding.step_share_desc')}
                        </Text>
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                <View style={[styles.dot, { backgroundColor: tc.border }]} />
                <View style={[styles.dot, { backgroundColor: tc.border }, styles.dotActive]} />
                <View style={[styles.dot, { backgroundColor: tc.border }]} />
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
                <ClubhouseButton
                    title={t('onboarding.continue')}
                    onPress={onNext}
                    variant="primary"
                    style={styles.actionButton}
                />
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                    <Text style={[styles.skipText, { color: tc.textTertiary }]}>{t('onboarding.skip_intro')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
    );
};

// Screen 3: Daily Reminder
const DailyReminderScreen: React.FC<{
    onBack: () => void;
    onGetStarted: () => void;
    notificationsEnabled: boolean;
    toggleNotifications: () => void;
    reminderTime: Date;
    onTimeChange: (event: any, date?: Date) => void;
}> = ({ onBack, onGetStarted, notificationsEnabled, toggleNotifications, reminderTime, onTimeChange }) => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    return (
    <View style={styles.screenWrapper}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color={tc.text} />
            </TouchableOpacity>
            <Text style={[styles.stepIndicator, { color: tc.textTertiary }]}>{t('onboarding.step_of', { current: 3, total: 3 })}</Text>
        </View>

        <View style={styles.topSection}>
            <Text style={[styles.reminderTitle, { color: tc.text }]}>{t('onboarding.daily_reminder')}</Text>
            <Text style={[styles.reminderSubtitle, { color: tc.textSecondary }]}>
                {t('onboarding.when_verse')}
            </Text>
        </View>

        <View style={styles.middleSection}>
            {/* Time Picker Card */}
            <View style={[styles.timePickerCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                    textColor={tc.text}
                    style={styles.timePicker}
                />

                {/* Notifications Toggle */}
                <View style={[styles.notificationRow, { borderTopColor: tc.border + '10' }]}>
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
                        thumbColor={tc.white}
                    />
                </View>
            </View>
        </View>

        <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                <View style={[styles.dot, { backgroundColor: tc.border }]} />
                <View style={[styles.dot, { backgroundColor: tc.border }]} />
                <View style={[styles.dot, { backgroundColor: tc.border }, styles.dotActive]} />
            </View>

            {/* Get Started Button */}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: spacing.xl,
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
        justifyContent: 'center',
        paddingVertical: spacing.lg,
    },
    bottomSection: {
        paddingBottom: spacing.lg,
    },

    // Welcome Screen
    iconContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconBackground: {
        width: 100,
        height: 100,
        backgroundColor: colors.white,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.medium,
    },
    appName: {
        ...typography.h1,
        fontSize: 32,
        color: colors.black,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        letterSpacing: 2,
        fontWeight: '700',
    },
    heading: {
        ...typography.h2,
        fontSize: 28,
        color: colors.black,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    description: {
        ...typography.body,
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: spacing.xl,
    },
    nameInput: {
        ...typography.body,
        fontSize: 18,
        textAlign: 'center',
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.lg,
    },

    // How It Works Screen
    howItWorksTitle: {
        ...typography.h1,
        fontSize: 28,
        color: colors.black,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    howItWorksSubtitle: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: spacing.xl,
    },
    featureCards: {
        gap: spacing.md,
    },
    featureCard: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.small,
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        ...typography.title,
        fontSize: 17,
        color: colors.black,
        marginBottom: 2,
    },
    featureDescription: {
        ...typography.body,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },

    // Daily Reminder Screen
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    backButton: {
        zIndex: 10,
    },
    stepIndicator: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '800',
        letterSpacing: 1,
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
    },
    reminderTitle: {
        ...typography.h1,
        fontSize: 28,
        color: colors.black,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    reminderSubtitle: {
        ...typography.body,
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    timePickerCard: {
        backgroundColor: colors.white,
        borderRadius: 28,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
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
        borderTopColor: colors.border + '10',
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
        color: colors.text,
        fontWeight: '700',
    },
    notificationSubtitle: {
        ...typography.caption,
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Common
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: spacing.xl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    dotActive: {
        backgroundColor: colors.purple,
        width: 24,
    },
    buttonContainer: {
        paddingHorizontal: spacing.base,
    },
    actionButton: {
        height: 60,
        borderRadius: 24,
        ...shadows.medium,
    },
    blueButton: { // Keep for backward compatibility if needed, but using actionButton
        backgroundColor: colors.purple,
        height: 60,
        borderRadius: 24,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    skipText: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: '800',
        letterSpacing: 1,
    },
    changeText: {
        ...typography.caption,
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});

export default OnboardingScreen;
