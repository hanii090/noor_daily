import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing } from '../theme';

export const ClubhouseTabBar: React.FC<BottomTabBarProps> = ({
    state,
    descriptors,
    navigation,
}) => {
    const { colors, isDark } = useTheme();
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

    const getTabConfig = (routeName: string, isFocused: boolean) => {
        let iconName: keyof typeof Ionicons.glyphMap;
        let label: string;

        switch (routeName) {
            case 'Home':
                iconName = isFocused ? 'home' : 'home-outline';
                label = 'Home';
                break;
            case 'Journey':
                iconName = isFocused ? 'flame' : 'flame-outline';
                label = 'Journey';
                break;
            case 'History':
                iconName = isFocused ? 'calendar' : 'calendar-outline';
                label = 'History';
                break;
            case 'Saved':
                iconName = isFocused ? 'bookmark' : 'bookmark-outline';
                label = 'Saved';
                break;
            case 'Settings':
                iconName = isFocused ? 'settings' : 'settings-outline';
                label = 'Settings';
                break;
            default:
                iconName = 'help-outline';
                label = routeName;
        }

        return { iconName, label };
    };

    return (
        <View style={styles.outerContainer}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.container, { borderColor: colors.border }]}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;
                    const color = isFocused ? colors.text : colors.textTertiary;
                    const { iconName, label } = getTabConfig(route.name, isFocused);

                    return (
                        <Animated.View
                            key={route.key}
                            style={[styles.tab, { transform: [{ scale: scaleAnims[index] }] }]}
                        >
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel || `${label} tab`}
                                onPress={() => handlePress(route, index, isFocused)}
                                style={styles.tabButton}
                            >
                                <Ionicons name={iconName} size={22} color={color} />
                                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
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
        height: 68,
        borderRadius: 34,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        paddingHorizontal: spacing.base,
        overflow: 'hidden',
        borderWidth: 0.5,
    },
    tab: {
        flex: 1,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
        letterSpacing: 0.1,
    },
});
