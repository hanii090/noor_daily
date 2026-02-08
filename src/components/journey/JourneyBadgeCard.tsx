import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, useTheme, typography, spacing } from '../../theme';
import { JourneyBadge } from '../../types';

interface JourneyBadgeCardProps {
    badge: JourneyBadge;
    earned: boolean;
}

const BADGE_COLORS: Record<string, string> = {
    first_step: colors.green,
    week_one: colors.teal,
    consistent: colors.purple,
    halfway: colors.orange,
    dedicated: colors.coral,
    journaler: colors.purple,
    completionist: '#FFB800',
};

export const JourneyBadgeCard: React.FC<JourneyBadgeCardProps> = ({ badge, earned }) => {
    const { colors: tc } = useTheme();
    const accentColor = BADGE_COLORS[badge.id] || tc.orange;

    return (
        <View style={[
            styles.container,
            { backgroundColor: tc.white, borderColor: tc.border },
            earned && { backgroundColor: accentColor + '08', borderColor: accentColor + '35' },
        ]}>
            <View style={[
                styles.emojiCircle,
                { backgroundColor: tc.backgroundSecondary },
                earned && { backgroundColor: accentColor + '15' },
            ]}>
                {earned ? (
                    <Text style={styles.emoji}>{badge.emoji}</Text>
                ) : (
                    <Ionicons name="lock-closed" size={18} color={tc.textTertiary} />
                )}
            </View>
            <Text
                style={[styles.name, { color: tc.text }, !earned && { color: tc.textTertiary }]}
                numberOfLines={2}
            >
                {badge.name}
            </Text>
            <View style={[
                styles.dayPill,
                { backgroundColor: tc.backgroundSecondary },
                earned && { backgroundColor: accentColor + '18' },
            ]}>
                {earned && <Ionicons name="checkmark-circle" size={10} color={accentColor} />}
                <Text style={[
                    styles.dayText,
                    { color: tc.textTertiary },
                    earned && { color: accentColor },
                ]}>
                    Day {badge.dayRequired}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 100,
        alignItems: 'center',
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.sm,
        borderRadius: 22,
        borderWidth: 1,
        gap: spacing.xs,
    },
    emojiCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 26,
    },
    name: {
        ...typography.small,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 16,
    },
    dayPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    dayText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
