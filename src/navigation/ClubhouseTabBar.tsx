import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

export const ClubhouseTabBar: React.FC<BottomTabBarProps> = ({
    state,
    descriptors,
    navigation,
}) => {
    const scaleAnims = React.useRef(
        state.routes.map(() => new Animated.Value(1))
    ).current;

    const handlePress = (route: any, index: number, isFocused: boolean) => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Animate scale
            Animated.sequence([
                Animated.spring(scaleAnims[index], {
                    toValue: 0.85,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnims[index], {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            navigation.navigate(route.name);
        }
    };

    const getIcon = (routeName: string, isFocused: boolean) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        switch (routeName) {
            case 'Home':
                iconName = isFocused ? 'home' : 'home-outline';
                break;
            case 'History':
                iconName = isFocused ? 'calendar' : 'calendar-outline';
                break;
            case 'Saved':
                iconName = isFocused ? 'bookmark' : 'bookmark-outline';
                break;
            case 'Settings':
                iconName = isFocused ? 'settings' : 'settings-outline';
                break;
            default:
                iconName = 'help-outline';
        }

        return iconName;
    };

    return (
        <View style={styles.outerContainer}>
            <BlurView intensity={80} tint="light" style={styles.container}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;
                    const color = isFocused ? colors.black : colors.textTertiary;
                    const iconName = getIcon(route.name, isFocused);

                    return (
                        <Animated.View
                            key={route.key}
                            style={[styles.tab, { transform: [{ scale: scaleAnims[index] }] }]}
                        >
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                onPress={() => handlePress(route, index, isFocused)}
                                style={styles.tabButton}
                            >
                                <Ionicons name={iconName} size={26} color={color} />
                                {isFocused && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl * 2,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
    },
    container: {
        flexDirection: 'row',
        height: 64,
        borderRadius: 32,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        paddingHorizontal: spacing.base,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    tab: {
        flex: 1,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.black,
        marginTop: 4,
    },
});
