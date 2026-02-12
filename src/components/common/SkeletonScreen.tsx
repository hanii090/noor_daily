import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SkeletonScreenProps {
    showHeader?: boolean;
}

export const SkeletonScreen: React.FC<SkeletonScreenProps> = ({ showHeader = true }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header Skeleton */}
            {showHeader && (
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Skeleton width={120} height={24} borderRadius={12} />
                        <Skeleton width={40} height={40} borderRadius={20} />
                    </View>
                    <Skeleton width={180} height={32} borderRadius={8} style={{ marginTop: spacing.sm }} />
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Mood Selector Skeleton */}
                <View style={styles.section}>
                    <View style={styles.moodGrid}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} width="30%" height={80} borderRadius={16} />
                        ))}
                    </View>
                </View>

                {/* Main Content Card Skeleton */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Skeleton width={80} height={20} borderRadius={4} />
                        <Skeleton width={60} height={20} borderRadius={4} />
                    </View>
                    <View style={styles.cardBody}>
                        <Skeleton width="80%" height={40} borderRadius={4} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
                        <Skeleton width="60%" height={40} borderRadius={4} style={{ alignSelf: 'center', marginBottom: spacing.xl }} />

                        <Skeleton width="100%" height={16} borderRadius={4} style={{ marginBottom: spacing.sm }} />
                        <Skeleton width="90%" height={16} borderRadius={4} style={{ marginBottom: spacing.sm }} />
                        <Skeleton width="95%" height={16} borderRadius={4} style={{ marginBottom: spacing.md }} />
                    </View>
                    <View style={styles.cardFooter}>
                        <Skeleton width={100} height={30} borderRadius={15} />
                        <Skeleton width={40} height={40} borderRadius={20} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    header: {
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    content: {
        paddingBottom: spacing.xxxl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    card: {
        padding: spacing.lg,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginBottom: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    cardBody: {
        marginBottom: spacing.xl,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }
});
