import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme, spacing } from '../../theme';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

const SkeletonBlock: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}) => {
    const { colors, isDark } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: isDark ? '#2C2C2C' : '#E5E5E5',
                    opacity,
                },
                style,
            ]}
        />
    );
};

export const GuidanceSkeleton: React.FC = () => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.card, { backgroundColor: colors.cream, borderColor: colors.border }]}>
                {/* Badge skeleton */}
                <View style={styles.badgeRow}>
                    <SkeletonBlock width={80} height={20} borderRadius={10} />
                    <SkeletonBlock width={60} height={16} borderRadius={8} />
                </View>

                {/* Arabic text skeleton */}
                <View style={styles.arabicBlock}>
                    <SkeletonBlock width="80%" height={28} borderRadius={6} />
                    <SkeletonBlock width="60%" height={28} borderRadius={6} style={{ marginTop: 8 }} />
                </View>

                {/* English text skeleton */}
                <View style={styles.englishBlock}>
                    <SkeletonBlock width="100%" height={16} />
                    <SkeletonBlock width="90%" height={16} style={{ marginTop: 6 }} />
                    <SkeletonBlock width="70%" height={16} style={{ marginTop: 6 }} />
                </View>

                {/* Action buttons skeleton */}
                <View style={styles.actionsRow}>
                    <SkeletonBlock width={44} height={44} borderRadius={22} />
                    <SkeletonBlock width={44} height={44} borderRadius={22} />
                    <SkeletonBlock width={44} height={44} borderRadius={22} />
                </View>
            </View>
        </View>
    );
};

export const MoodSelectorSkeleton: React.FC = () => {
    return (
        <View style={styles.moodContainer}>
            <SkeletonBlock width="60%" height={28} borderRadius={8} style={{ alignSelf: 'center', marginBottom: 8 }} />
            <SkeletonBlock width="80%" height={16} borderRadius={6} style={{ alignSelf: 'center', marginBottom: 24 }} />
            <View style={styles.moodGrid}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonBlock key={i} width={100} height={120} borderRadius={20} />
                ))}
            </View>
        </View>
    );
};

export { SkeletonBlock };

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        paddingTop: 180,
    },
    card: {
        borderRadius: 28,
        padding: spacing.xl,
        borderWidth: 0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    arabicBlock: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    englishBlock: {
        marginBottom: spacing.xl,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: spacing.md,
    },
    moodContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: 120,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'center',
    },
});
