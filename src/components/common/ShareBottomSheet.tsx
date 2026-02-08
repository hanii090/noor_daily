import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Modal,
    Dimensions,
    PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, typography, spacing } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 80;

export interface ShareOption {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    subtitle?: string;
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
    const { colors: tc } = useTheme();
    const insets = useSafeAreaInsets();
    const reduceMotion = useReducedMotion();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const dragY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) dragY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > DISMISS_THRESHOLD || g.vy > 0.5) {
                    animateClose();
                } else {
                    Animated.spring(dragY, {
                        toValue: 0,
                        useNativeDriver: true,
                        damping: 20,
                        stiffness: 300,
                    }).start();
                }
            },
        })
    ).current;

    const animateClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            dragY.setValue(0);
            onClose();
        });
    };

    useEffect(() => {
        if (visible) {
            dragY.setValue(0);
            if (reduceMotion) {
                slideAnim.setValue(0);
                backdropAnim.setValue(1);
            } else {
                slideAnim.setValue(SCREEN_HEIGHT);
                backdropAnim.setValue(0);
                Animated.parallel([
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        damping: 28,
                        stiffness: 280,
                        useNativeDriver: true,
                    }),
                    Animated.timing(backdropAnim, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        }
    }, [visible]);

    const bottomPad = Math.max(insets.bottom, 20);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={animateClose}
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={animateClose}
                    />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: tc.white,
                            paddingBottom: bottomPad,
                            transform: [
                                { translateY: Animated.add(slideAnim, dragY) },
                            ],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Handle */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: tc.textTertiary + '40' }]} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: tc.text }]}>{title}</Text>

                    {/* Options */}
                    <View style={[styles.optionsList, { backgroundColor: tc.backgroundSecondary }]}>
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
                                    accessibilityRole="button"
                                    accessibilityLabel={opt.label}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: (opt.color ?? tc.purple) + '12' }]}>
                                        <Ionicons name={opt.icon} size={22} color={opt.color ?? tc.purple} />
                                    </View>
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionLabel, { color: tc.text }]}>{opt.label}</Text>
                                        {opt.subtitle && (
                                            <Text style={[styles.optionSubtitle, { color: tc.textTertiary }]}>{opt.subtitle}</Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
                                </TouchableOpacity>
                            </React.Fragment>
                        ))}
                    </View>

                    {/* Cancel */}
                    <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: tc.backgroundSecondary }]}
                        onPress={animateClose}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                    >
                        <Text style={[styles.cancelText, { color: tc.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 24,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    title: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: spacing.lg,
        marginTop: spacing.xs,
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
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionTextContainer: {
        flex: 1,
    },
    optionLabel: {
        ...typography.body,
        fontWeight: '600',
    },
    optionSubtitle: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: spacing.lg + 40 + spacing.md,
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
