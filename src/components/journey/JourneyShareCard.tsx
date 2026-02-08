import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';
import analyticsService from '../../services/analyticsService';

interface JourneyShareCardProps {
    day: number;
    streak: number;
    totalCompleted: number;
    badgeEmoji?: string;
    badgeName?: string;
}

export const JourneyShareCard: React.FC<JourneyShareCardProps> = ({
    day,
    streak,
    totalCompleted,
    badgeEmoji,
    badgeName,
}) => {
    const viewShotRef = useRef<ViewShot>(null);

    const shareProgress = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (!viewShotRef.current?.capture) return;

            const uri = await viewShotRef.current.capture();
            const isAvailable = await Sharing.isAvailableAsync();

            if (isAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: 'Share your journey progress',
                });
                analyticsService.logJourneyShared(day, badgeEmoji ? 'badge' : 'progress');
            }
        } catch (error) {
            console.error('Error sharing journey progress:', error);
        }
    };

    return (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.appName}>Noor Daily</Text>
                    <Text style={styles.moonEmoji}>🌙</Text>
                </View>

                {badgeEmoji ? (
                    <View style={styles.badgeSection}>
                        <Text style={styles.badgeEmoji}>{badgeEmoji}</Text>
                        <Text style={styles.badgeTitle}>{badgeName}</Text>
                        <Text style={styles.badgeSubtitle}>Badge Earned!</Text>
                    </View>
                ) : (
                    <View style={styles.progressSection}>
                        <Text style={styles.dayNumber}>Day {day}</Text>
                        <Text style={styles.dayLabel}>of 30-Day Spiritual Journey</Text>
                    </View>
                )}

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalCompleted}</Text>
                        <Text style={styles.statLabel}>Days</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{streak}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </View>
                </View>

                <Text style={styles.hashtag}>#NoorDaily #30DayJourney</Text>
            </View>
        </ViewShot>
    );
};

export const shareJourneyProgress = async (
    viewShotRef: React.RefObject<ViewShot>,
    day: number,
    badgeEmoji?: string
) => {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!viewShotRef.current?.capture) return;

        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share your journey progress',
            });
            analyticsService.logJourneyShared(day, badgeEmoji ? 'badge' : 'progress');
        }
    } catch (error) {
        console.error('Error sharing journey progress:', error);
    }
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.cream,
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    appName: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
    },
    moonEmoji: {
        fontSize: 16,
    },
    badgeSection: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    badgeEmoji: {
        fontSize: 56,
    },
    badgeTitle: {
        ...typography.h3,
        color: colors.text,
    },
    badgeSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    progressSection: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    dayNumber: {
        ...typography.h1,
        color: colors.purple,
    },
    dayLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xl,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        ...typography.h3,
        color: colors.text,
    },
    statLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
    },
    hashtag: {
        ...typography.small,
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
});
