import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { colors, shadows, spacing } from '../../theme';

interface ClubhouseCardProps {
    children: React.ReactNode;
    backgroundColor?: string;
    accentColor?: string;
    style?: StyleProp<ViewStyle>;
}

export const ClubhouseCard: React.FC<ClubhouseCardProps> = ({
    children,
    backgroundColor = colors.cream,
    accentColor,
    style,
}) => {
    return (
        <View style={[styles.container, { backgroundColor }, shadows.medium, style]}>
            <View style={styles.innerHighlight} />
            {accentColor && <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />}
            <View style={styles.content}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 28,
        padding: spacing.lg,
        borderWidth: 0.5,
        borderColor: colors.border,
        overflow: 'hidden',
        position: 'relative',
    },
    innerHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        zIndex: 1,
    },
    accentStripe: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 8,
    },
    content: {
        flex: 1,
    },
});
