import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, typography, spacing, shadows } from '../../theme';
import { lightColors as colors } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ShareOption {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color?: string;
    onPress: () => void;
}

interface ShareBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    options: ShareOption[];
    title?: string;
}

export const ShareBottomSheet: React.FC<ShareBottomSheetProps> = ({
    visible,
    onClose,
    options,
    title = 'Share',
}) => {
    const { colors: tc, isDark } = useTheme();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 25,
                    stiffness: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <Animated.View
                style={[styles.backdrop, { opacity: backdropAnim }]}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    {
                        backgroundColor: tc.white,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Handle */}
                <View style={styles.handleContainer}>
                    <View style={[styles.handle, { backgroundColor: tc.border }]} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: tc.text }]}>{title}</Text>

                {/* Options */}
                <View style={styles.optionsList}>
                    {options.map((opt, i) => (
                        <React.Fragment key={opt.id}>
                            {i > 0 && <View style={[styles.divider, { backgroundColor: tc.border }]} />}
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    opt.onPress();
                                }}
                                activeOpacity={0.6}
                            >
                                <View style={[styles.optionIcon, { backgroundColor: (opt.color ?? tc.purple) + '12' }]}>
                                    <Ionicons name={opt.icon} size={20} color={opt.color ?? tc.purple} />
                                </View>
                                <Text style={[styles.optionLabel, { color: tc.text }]}>{opt.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color={tc.textTertiary} />
                            </TouchableOpacity>
                        </React.Fragment>
                    ))}
                </View>

                {/* Cancel */}
                <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: tc.backgroundSecondary }]}
                    onPress={onClose}
                >
                    <Text style={[styles.cancelText, { color: tc.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        ...shadows.large,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    title: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    optionsList: {
        marginHorizontal: spacing.lg,
        borderRadius: 16,
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    optionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabel: {
        ...typography.body,
        fontWeight: '600',
        flex: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: spacing.lg + 36 + spacing.md,
    },
    cancelButton: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        borderRadius: 14,
        paddingVertical: spacing.base,
        alignItems: 'center',
    },
    cancelText: {
        ...typography.body,
        fontWeight: '600',
    },
});
