import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';

export const OfflineBanner: React.FC = () => {
    const { colors } = useTheme();
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = useRef(new Animated.Value(-50)).current;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const checkConnectivity = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            await fetch('https://clients3.google.com/generate_204', {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeout);
            setIsOffline(false);
            Animated.spring(slideAnim, { toValue: -50, useNativeDriver: true }).start();
        } catch {
            setIsOffline(true);
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
    };

    useEffect(() => {
        checkConnectivity();
        intervalRef.current = setInterval(checkConnectivity, 15000);

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') checkConnectivity();
        });

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            sub.remove();
        };
    }, []);

    if (!isOffline) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: colors.coral, transform: [{ translateY: slideAnim }] },
            ]}
        >
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={styles.text}>You're offline — some features may be limited</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
        zIndex: 9999,
    },
    text: {
        ...typography.small,
        color: '#fff',
        fontWeight: '600',
    },
});
