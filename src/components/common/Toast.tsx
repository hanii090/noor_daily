import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ToastProps {
    visible: boolean;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    duration?: number;
    onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
    visible,
    message,
    icon = 'checkmark-circle',
    duration = 2000,
    onHide,
}) => {
    const { colors: tc } = useTheme();
    const insets = useSafeAreaInsets();
    const reduceMotion = useReducedMotion();
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (reduceMotion) {
                translateY.setValue(0);
                opacity.setValue(1);
            } else {
                Animated.parallel([
                    Animated.spring(translateY, {
                        toValue: 0,
                        damping: 20,
                        stiffness: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }

            const timer = setTimeout(() => {
                if (reduceMotion) {
                    onHide();
                } else {
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: -100,
                            duration: 250,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                    ]).start(() => onHide());
                }
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + spacing.sm,
                    backgroundColor: tc.text,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
            pointerEvents="none"
        >
            <Ionicons name={icon} size={18} color={tc.creamLight} />
            <Text style={[styles.message, { color: tc.creamLight }]}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: spacing.xl,
        right: spacing.xl,
        zIndex: 10000,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    message: {
        ...typography.body,
        fontWeight: '600',
        fontSize: 14,
        flex: 1,
    },
});
