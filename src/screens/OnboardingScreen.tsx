import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseBackground, ClubhouseButton, ClubhouseCard } from '../components/clubhouse';
import { colors, typography, spacing, shadows } from '../theme';
import { useAppStore } from '../store/appStore';
import notificationService from '../services/notificationService';
import DateTimePicker from '@react-native-community/datetimepicker';

const OnboardingScreen = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date(2024, 0, 1, 8, 0)); // 8:00 AM

    const setOnboardingCompleted = useAppStore((state) => state.setOnboardingCompleted);
    const updateSettings = useAppStore((state) => state.updateSettings);

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentStep < 2) {
            setCurrentStep(currentStep + 1);
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
            setCurrentStep(currentStep - 1);
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
                {currentStep === 0 && <WelcomeScreen onNext={handleNext} onSkip={handleSkip} />}
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
            </View>
        </ClubhouseBackground>
    );
};

// Screen 1: Welcome
const WelcomeScreen: React.FC<{ onNext: () => void; onSkip: () => void }> = ({ onNext, onSkip }) => (
    <View style={styles.screenWrapper}>
        <View style={styles.topSection}>
            {/* App Icon */}
            <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                    <Ionicons name="book" size={56} color={colors.black} />
                </View>
            </View>

            {/* App Name */}
            <Text style={styles.appName}>Noor Daily</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>YOUR DAILY GUIDANCE</Text>
        </View>

        <View style={styles.middleSection}>
            {/* Main Heading */}
            <Text style={styles.heading}>Let's get you started</Text>

            {/* Description */}
            <Text style={styles.description}>
                Join a community dedicated to daily reflection and spiritual growth.
            </Text>
        </View>

        <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
            </View>

            {/* Get Started Button */}
            <View style={styles.buttonContainer}>
                <ClubhouseButton
                    title="Continue"
                    onPress={onNext}
                    variant="primary"
                    style={styles.actionButton}
                />
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>SKIP INTRO</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

// Screen 2: How It Works
const HowItWorksScreen: React.FC<{ onNext: () => void; onSkip: () => void }> = ({ onNext, onSkip }) => (
    <View style={styles.screenWrapper}>
        <View style={styles.topSection}>
            <Text style={styles.howItWorksTitle}>How It Works</Text>
            <Text style={styles.howItWorksSubtitle}>
                Your daily spiritual journey in three simple steps
            </Text>
        </View>

        <View style={styles.middleSection}>
            {/* Feature Cards */}
            <View style={styles.featureCards}>
                <View style={styles.featureCard}>
                    <View style={[styles.featureIconContainer, { backgroundColor: colors.purple + '10' }]}>
                        <Ionicons name="heart" size={24} color={colors.purple} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>Choose Your Mood</Text>
                        <Text style={styles.featureDescription}>
                            Tell us how you feel, and we'll find the perfect verse for your soul.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIconContainer, { backgroundColor: colors.green + '10' }]}>
                        <Ionicons name="book" size={24} color={colors.green} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>Read Your Verse</Text>
                        <Text style={styles.featureDescription}>
                            Deep dive into the wisdom of the Quran with clear, curated translations.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIconContainer, { backgroundColor: colors.teal + '10' }]}>
                        <Ionicons name="share-social" size={24} color={colors.teal} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>Share the Beauty</Text>
                        <Text style={styles.featureDescription}>
                            Inspire others by sharing beautifully designed verses with your community.
                        </Text>
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
                <ClubhouseButton
                    title="Continue"
                    onPress={onNext}
                    variant="primary"
                    style={styles.actionButton}
                />
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>SKIP INTRO</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

// Screen 3: Daily Reminder
const DailyReminderScreen: React.FC<{
    onBack: () => void;
    onGetStarted: () => void;
    notificationsEnabled: boolean;
    toggleNotifications: () => void;
    reminderTime: Date;
    onTimeChange: (event: any, date?: Date) => void;
}> = ({ onBack, onGetStarted, notificationsEnabled, toggleNotifications, reminderTime, onTimeChange }) => (
    <View style={styles.screenWrapper}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.stepIndicator}>3 OF 3</Text>
        </View>

        <View style={styles.topSection}>
            <Text style={styles.reminderTitle}>Daily Reminder</Text>
            <Text style={styles.reminderSubtitle}>
                When would you like your daily verse?
            </Text>
        </View>

        <View style={styles.middleSection}>
            {/* Time Picker Card */}
            <View style={styles.timePickerCard}>
                <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                    textColor={colors.black}
                    style={styles.timePicker}
                />

                {/* Notifications Toggle */}
                <View style={styles.notificationRow}>
                    <View style={styles.notificationLeft}>
                        <View style={[styles.iconBadge, { backgroundColor: colors.purple + '10' }]}>
                            <Ionicons name="notifications" size={20} color={colors.purple} />
                        </View>
                        <View style={styles.notificationText}>
                            <Text style={styles.notificationTitle}>Notifications</Text>
                            <Text style={styles.notificationSubtitle}>Enable push alerts</Text>
                        </View>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={toggleNotifications}
                        trackColor={{ false: colors.border, true: colors.purple }}
                        thumbColor={colors.white}
                    />
                </View>
            </View>
        </View>

        <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
            </View>

            {/* Get Started Button */}
            <View style={styles.buttonContainer}>
                <ClubhouseButton
                    title="Get Started"
                    onPress={onGetStarted}
                    variant="primary"
                    style={styles.actionButton}
                />
                <Text style={styles.changeText}>You can change this anytime</Text>
            </View>
        </View>
    </View>
);

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
