import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';

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
    const { colors, isDark } = useTheme();
    const Container = transparent ? View : BlurView;
    const blurTint: 'light' | 'dark' = isDark ? 'dark' : 'light';
    const containerProps = transparent ? {} : { intensity: 80, tint: blurTint };

    const hasTopRow = onBack || (rightIcons && rightIcons.length > 0);

    return (
        <Container {...containerProps} style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
            {hasTopRow && (
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
            )}
            
            <View style={styles.headerContent}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
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
        paddingBottom: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 28,
        marginBottom: 2,
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
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    headerSubtitle: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.8,
    },
});
