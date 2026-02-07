import React, { useRef } from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    Animated,
    ViewStyle,
    StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../../theme';

type ButtonVariant = 'primary' | 'success' | 'coral' | 'orange' | 'teal' | 'blue';

interface ClubhouseButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
}

const variantColors: Record<ButtonVariant, string> = {
    primary: colors.purple,
    success: colors.green,
    coral: colors.coral,
    orange: colors.orange,
    teal: colors.teal,
    blue: '#1DA1F2', // Twitter-style blue for primary actions
};

export const ClubhouseButton: React.FC<ClubhouseButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    style,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 3,
            tension: 40,
        }).start();
    };

    const handlePress = () => {
        if (!disabled && !loading) {
            onPress();
        }
    };

    const backgroundColor = variantColors[variant];

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                activeOpacity={0.9}
                disabled={disabled || loading}
                style={[
                    styles.button,
                    { backgroundColor },
                    (disabled || loading) && styles.disabled,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={colors.white} />
                ) : (
                    <Text style={styles.text}>{title}</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 56,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    text: {
        ...typography.button,
        color: colors.white,
    },
    disabled: {
        opacity: 0.5,
    },
});
