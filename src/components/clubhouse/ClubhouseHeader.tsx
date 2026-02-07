import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

interface ClubhouseHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightIcons?: Array<{
        name: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
    }>;
    transparent?: boolean;
}

export const ClubhouseHeader: React.FC<ClubhouseHeaderProps> = ({
    title,
    subtitle,
    onBack,
    rightIcons,
    transparent = false,
}) => {
    const insets = useSafeAreaInsets();
    const Container = transparent ? View : BlurView;
    const containerProps = transparent ? {} : { intensity: 80, tint: 'light' as const };

    return (
        <Container {...containerProps} style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
            <View style={styles.headerTop}>
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
                
                <View style={styles.headerActions}>
                    {rightIcons?.map((icon, index) => (
                        <TouchableOpacity key={index} onPress={icon.onPress} style={styles.iconButton}>
                            <Ionicons name={icon.name} size={22} color={colors.text} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>{title}</Text>
                {subtitle && (
                    <Text style={styles.headerSubtitle}>
                        {subtitle.toUpperCase()}
                    </Text>
                )}
            </View>
        </Container>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 32,
        marginBottom: spacing.xs,
    },
    backButton: {
        marginLeft: -spacing.xs,
        padding: spacing.xs,
    },
    placeholder: {
        width: 40,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    iconButton: {
        padding: spacing.xs,
    },
    headerContent: {
        marginTop: 0,
    },
    headerTitle: {
        ...typography.h2,
        fontSize: 28,
        fontWeight: '700',
        color: colors.black,
        marginBottom: 4,
    },
    headerSubtitle: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        letterSpacing: 1,
    },
});
