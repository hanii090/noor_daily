import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, useTheme, typography, spacing } from '../../theme';
import { Verse, ExamVerse } from '../../types';
import examService from '../../services/examService';

type Outcome = 'good' | 'uncertain' | 'bad';

const OUTCOME_OPTIONS: { value: Outcome; label: string; icon: string; color: string }[] = [
    { value: 'good', label: 'It went well', icon: '😊', color: colors.green },
    { value: 'uncertain', label: 'Not sure', icon: '🤔', color: colors.orange },
    { value: 'bad', label: 'It was tough', icon: '😔', color: colors.coral },
];

export const PostExamReflection: React.FC = () => {
    const { colors: tc } = useTheme();
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [verse, setVerse] = useState<Verse | null>(null);
    const [examVerse, setExamVerse] = useState<ExamVerse | null>(null);
    const [journal, setJournal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleOutcomeSelect = async (selected: Outcome) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setOutcome(selected);
        setIsLoading(true);

        try {
            const { verse: v, examVerse: ev } = await examService.getPostExamVerse(selected);
            setVerse(v);
            setExamVerse(ev);
        } catch (error) {
            console.error('Error loading post-exam verse:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <View style={styles.container}>
                <View style={styles.submittedSection}>
                    <Text style={styles.submittedEmoji}>🤲</Text>
                    <Text style={[styles.submittedTitle, { color: tc.text }]}>May Allah bless your efforts</Text>
                    <Text style={[styles.submittedDesc, { color: tc.textSecondary }]}>
                        Whatever the result, remember that your effort is never wasted in Allah's eyes.
                        Trust His plan for you.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={tc.green} />
                <Text style={[styles.title, { color: tc.text }]}>Post-Exam Reflection</Text>
            </View>
            <Text style={[styles.subtitle, { color: tc.textSecondary }]}>How did your exam go?</Text>

            {/* Outcome Selection */}
            <View style={styles.outcomeGrid}>
                {OUTCOME_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.outcomeCard,
                            { backgroundColor: tc.cream, borderColor: tc.border },
                            outcome === opt.value && {
                                borderColor: opt.color,
                                backgroundColor: opt.color + '12',
                            },
                        ]}
                        onPress={() => handleOutcomeSelect(opt.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.outcomeIcon}>{opt.icon}</Text>
                        <Text
                            style={[
                                styles.outcomeLabel,
                                { color: tc.text },
                                outcome === opt.value && { color: opt.color, fontWeight: '700' },
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Loading */}
            {isLoading && (
                <View style={styles.loadingSection}>
                    <ActivityIndicator color={tc.green} />
                </View>
            )}

            {/* Verse Result */}
            {verse && examVerse && !isLoading && (
                <>
                    <View style={[styles.verseCard, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                        <Text style={[styles.verseArabic, { color: tc.text }]}>{verse.arabic}</Text>
                        <Text style={[styles.verseEnglish, { color: tc.text }]}>"{verse.english}"</Text>
                        <Text style={[styles.verseRef, { color: tc.textTertiary }]}>
                            Surah {verse.surah} — Verse {verse.verseNumber}
                        </Text>
                    </View>

                    <View style={[styles.noteCard, { backgroundColor: tc.coral + '10' }]}>
                        <Ionicons name="heart-outline" size={18} color={tc.coral} />
                        <Text style={[styles.noteText, { color: tc.text }]}>{examVerse.motivationalNote}</Text>
                    </View>

                    {/* Journal */}
                    <View style={styles.journalSection}>
                        <Text style={[styles.journalLabel, { color: tc.textSecondary }]}>Write your thoughts (optional)</Text>
                        <TextInput
                            style={[styles.journalInput, { backgroundColor: tc.cream, borderColor: tc.border, color: tc.text }]}
                            placeholder="How do you feel? What did you learn?"
                            placeholderTextColor={tc.textTertiary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={journal}
                            onChangeText={setJournal}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: tc.green }]}
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.submitButtonText}>Complete Reflection</Text>
                    </TouchableOpacity>
                </>
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
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    outcomeGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    outcomeCard: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.lg,
        borderRadius: 20,
        backgroundColor: colors.cream,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    outcomeIcon: {
        fontSize: 32,
    },
    outcomeLabel: {
        ...typography.small,
        fontWeight: '500',
        color: colors.text,
        textAlign: 'center',
    },
    loadingSection: {
        paddingVertical: spacing.xl,
    },
    verseCard: {
        width: '100%',
        backgroundColor: colors.cream,
        borderRadius: 20,
        padding: spacing.lg,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    verseArabic: {
        ...typography.arabic,
        color: colors.text,
        fontSize: 22,
        lineHeight: 36,
    },
    verseEnglish: {
        ...typography.body,
        color: colors.text,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    verseRef: {
        ...typography.small,
        color: colors.textTertiary,
    },
    noteCard: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
        backgroundColor: colors.coral + '10',
        borderRadius: 16,
        padding: spacing.lg,
        alignItems: 'flex-start',
    },
    noteText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
        lineHeight: 24,
    },
    journalSection: {
        width: '100%',
        gap: spacing.sm,
    },
    journalLabel: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    journalInput: {
        backgroundColor: colors.cream,
        borderRadius: 16,
        padding: spacing.base,
        minHeight: 100,
        ...typography.body,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    submitButton: {
        width: '100%',
        height: 52,
        borderRadius: 24,
        backgroundColor: colors.green,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        ...typography.button,
        color: colors.white,
    },
    submittedSection: {
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.xxl,
    },
    submittedEmoji: {
        fontSize: 56,
    },
    submittedTitle: {
        ...typography.h3,
        color: colors.text,
        textAlign: 'center',
    },
    submittedDesc: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: spacing.base,
    },
});
