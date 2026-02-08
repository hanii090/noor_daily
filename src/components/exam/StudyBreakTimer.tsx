import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { Verse, ExamVerse } from '../../types';
import examService from '../../services/examService';

const STUDY_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds

type TimerPhase = 'idle' | 'studying' | 'break';

export const StudyBreakTimer: React.FC = () => {
    const [phase, setPhase] = useState<TimerPhase>('idle');
    const [secondsLeft, setSecondsLeft] = useState(STUDY_DURATION);
    const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [breakVerse, setBreakVerse] = useState<Verse | null>(null);
    const [breakExamVerse, setBreakExamVerse] = useState<ExamVerse | null>(null);
    const [isLoadingVerse, setIsLoadingVerse] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startBreakRef = useRef<() => void>(() => {});
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (phase === 'studying' || phase === 'break') {
            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [phase]);

    const startBreak = useCallback(async () => {
        setPhase('break');
        setSecondsLeft(BREAK_DURATION);

        // Load a verse for the break
        setIsLoadingVerse(true);
        try {
            const { verse, examVerse } = await examService.getStudyBreakVerse();
            setBreakVerse(verse);
            setBreakExamVerse(examVerse);
        } catch (error) {
            console.error('Error loading break verse:', error);
        } finally {
            setIsLoadingVerse(false);
        }

        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setPhase('idle');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // Keep ref in sync so the interval closure always calls the latest startBreak
    useEffect(() => {
        startBreakRef.current = startBreak;
    }, [startBreak]);

    const startStudying = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPhase('studying');
        setSecondsLeft(STUDY_DURATION);
        setBreakVerse(null);
        setBreakExamVerse(null);

        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    // Study session complete
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTotalStudyMinutes((m) => m + 25);
                    setSessionsCompleted((s) => s + 1);
                    startBreakRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('idle');
        setSecondsLeft(STUDY_DURATION);
    }, []);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = phase === 'studying'
        ? 1 - secondsLeft / STUDY_DURATION
        : phase === 'break'
        ? 1 - secondsLeft / BREAK_DURATION
        : 0;

    const phaseColor = phase === 'studying' ? colors.purple : phase === 'break' ? colors.green : colors.textTertiary;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="timer-outline" size={24} color={colors.purple} />
                <Text style={styles.title}>Study with Barakah</Text>
            </View>
            <Text style={styles.subtitle}>
                25 min study, 5 min reflection with a verse
            </Text>

            {/* Timer Circle */}
            <Animated.View
                style={[
                    styles.timerCircle,
                    { borderColor: phaseColor, transform: [{ scale: pulseAnim }] },
                ]}
            >
                <Text style={[styles.timerText, { color: phaseColor }]}>
                    {formatTime(secondsLeft)}
                </Text>
                <Text style={styles.timerPhase}>
                    {phase === 'idle'
                        ? 'Ready'
                        : phase === 'studying'
                        ? 'Studying'
                        : 'Break Time'}
                </Text>
            </Animated.View>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progress * 100}%`, backgroundColor: phaseColor },
                    ]}
                />
            </View>

            {/* Controls */}
            {phase === 'idle' ? (
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: colors.purple }]}
                    onPress={startStudying}
                    activeOpacity={0.8}
                >
                    <Ionicons name="play" size={22} color={colors.white} />
                    <Text style={styles.controlButtonText}>Start Studying</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: colors.coral }]}
                    onPress={stopTimer}
                    activeOpacity={0.8}
                >
                    <Ionicons name="stop" size={22} color={colors.white} />
                    <Text style={styles.controlButtonText}>Stop</Text>
                </TouchableOpacity>
            )}

            {/* Break Verse */}
            {phase === 'break' && (
                <View style={styles.breakVerseSection}>
                    <Text style={styles.breakVerseTitle}>Reflect During Your Break</Text>
                    {isLoadingVerse ? (
                        <ActivityIndicator color={colors.green} />
                    ) : breakVerse ? (
                        <View style={styles.breakVerseCard}>
                            <Text style={styles.breakVerseArabic}>{breakVerse.arabic}</Text>
                            <Text style={styles.breakVerseEnglish}>"{breakVerse.english}"</Text>
                            <Text style={styles.breakVerseRef}>
                                Surah {breakVerse.surah} — Verse {breakVerse.verseNumber}
                            </Text>
                            {breakExamVerse && (
                                <Text style={styles.breakVerseNote}>
                                    {breakExamVerse.motivationalNote}
                                </Text>
                            )}
                        </View>
                    ) : null}
                </View>
            )}

            {/* Stats */}
            {sessionsCompleted > 0 && (
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{sessionsCompleted}</Text>
                        <Text style={styles.statLabel}>Sessions</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalStudyMinutes}</Text>
                        <Text style={styles.statLabel}>Minutes</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    title: {
        ...typography.h3,
        color: colors.text,
    },
    subtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    timerCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.cream,
    },
    timerText: {
        fontSize: 42,
        fontWeight: '700',
        fontFamily: 'Inter_400Regular',
    },
    timerPhase: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: colors.beige,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        height: 52,
        borderRadius: 24,
        paddingHorizontal: spacing.xl,
        width: '100%',
    },
    controlButtonText: {
        ...typography.button,
        color: colors.white,
    },
    breakVerseSection: {
        width: '100%',
        gap: spacing.md,
        alignItems: 'center',
    },
    breakVerseTitle: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.green,
        letterSpacing: 0.5,
    },
    breakVerseCard: {
        width: '100%',
        backgroundColor: colors.green + '10',
        borderRadius: 20,
        padding: spacing.lg,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.green + '20',
    },
    breakVerseArabic: {
        ...typography.arabic,
        color: colors.text,
        fontSize: 22,
        lineHeight: 36,
    },
    breakVerseEnglish: {
        ...typography.body,
        color: colors.text,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    breakVerseRef: {
        ...typography.small,
        color: colors.textTertiary,
    },
    breakVerseNote: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 22,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.green + '30',
        paddingTop: spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xl,
        backgroundColor: colors.cream,
        borderRadius: 16,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        ...typography.h3,
        color: colors.text,
    },
    statLabel: {
        ...typography.small,
        color: colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
    },
});
