import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseCard, ClubhouseButton } from './clubhouse';
import { colors, useTheme, typography, spacing } from '../theme';
import aiService from '../services/aiService';

const SUGGESTED_PROMPTS = [
    'I feel anxious about my future',
    'I\'m struggling to stay consistent with prayer',
    'I had an argument with a family member',
    'I feel lonely and disconnected',
    'I\'m grateful but don\'t know how to express it',
    'I need motivation for a difficult task',
];

interface SituationGuidanceModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SituationGuidanceModal: React.FC<SituationGuidanceModalProps> = ({
    visible,
    onClose,
}) => {
    const { colors: tc, isDark } = useTheme();
    const [situation, setSituation] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetGuidance = async () => {
        if (!situation.trim()) return;

        try {
            setIsLoading(true);
            setError(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            const guidance = await aiService.getPersonalizedGuidance(situation);
            setResponse(guidance);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            setError('The AI mentor is resting. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSituation('');
        setResponse(null);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, { backgroundColor: tc.creamLight }]}
            >
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: tc.text }]}>AI Spiritual Mentor</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={tc.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {!response ? (
                        <View style={styles.inputContainer}>
                            <View style={[styles.iconContainer, { backgroundColor: tc.purple + '10' }]}>
                                <Ionicons name="sparkles" size={40} color={tc.purple} />
                            </View>
                            <Text style={[styles.title, { color: tc.text }]}>What's on your heart?</Text>
                            <Text style={[styles.subtitle, { color: tc.textSecondary }]}>
                                Describe how you're feeling or a situation you're facing, and I'll provide guidance from Islamic wisdom.
                            </Text>

                            <TextInput
                                style={[styles.input, { backgroundColor: tc.white, color: tc.text, borderColor: tc.border }]}
                                placeholder="e.g., I'm feeling overwhelmed with work and losing my focus on prayer..."
                                placeholderTextColor={tc.textTertiary}
                                multiline
                                numberOfLines={4}
                                value={situation}
                                onChangeText={setSituation}
                                maxLength={500}
                            />
                            <Text style={[styles.charCount, { color: tc.textTertiary }]}>{situation.length}/500</Text>

                            {/* Suggested Prompts */}
                            {!situation && (
                                <View style={styles.promptsContainer}>
                                    <Text style={[styles.promptsTitle, { color: tc.textSecondary }]}>SUGGESTED TOPICS</Text>
                                    <View style={styles.promptsGrid}>
                                        {SUGGESTED_PROMPTS.map((prompt, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                style={[styles.promptChip, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setSituation(prompt);
                                                }}
                                            >
                                                <Text style={[styles.promptChipText, { color: tc.text }]} numberOfLines={1}>{prompt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {error && <Text style={[styles.errorText, { color: tc.coral }]}>{error}</Text>}

                            <ClubhouseButton
                                title={isLoading ? "Consulting..." : "Seek Guidance"}
                                onPress={handleGetGuidance}
                                variant="primary"
                                disabled={isLoading || !situation.trim()}
                                style={styles.submitButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.responseContainer}>
                            <ClubhouseCard style={styles.responseCard}>
                                <View style={styles.responseHeader}>
                                    <Ionicons name="sparkles" size={20} color={tc.purple} />
                                    <Text style={[styles.responseHeaderText, { color: tc.purple }]}>GUIDANCE FOR YOU</Text>
                                </View>
                                <Text style={[styles.responseText, { color: tc.text }]}>{response}</Text>
                            </ClubhouseCard>

                            <ClubhouseButton
                                title="Ask Something Else"
                                onPress={handleReset}
                                variant="blue"
                                style={styles.resetButton}
                            />
                            
                            <Text style={[styles.disclaimer, { color: tc.textTertiary }]}>
                                AI guidance is for spiritual support and does not replace professional or formal religious advice.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.creamLight,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.black,
    },
    closeButton: {
        padding: spacing.xs,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.base,
        paddingBottom: spacing.xxxl,
    },
    inputContainer: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.purple + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h2,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    input: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.lg,
        fontSize: 16,
        color: colors.text,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    submitButton: {
        width: '100%',
    },
    responseContainer: {
        alignItems: 'center',
    },
    responseCard: {
        padding: spacing.xl,
        width: '100%',
        marginBottom: spacing.xl,
    },
    responseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    responseHeaderText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '800',
        color: colors.purple,
        letterSpacing: 1,
    },
    responseText: {
        ...typography.body,
        fontSize: 17,
        lineHeight: 26,
        color: colors.text,
        fontStyle: 'italic',
    },
    resetButton: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    errorText: {
        color: colors.coral,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    disclaimer: {
        ...typography.small,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    charCount: {
        ...typography.small,
        fontSize: 12,
        textAlign: 'right',
        width: '100%',
        marginTop: -spacing.sm,
        marginBottom: spacing.md,
    },
    promptsContainer: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    promptsTitle: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    promptsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    promptChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
    },
    promptChipText: {
        ...typography.caption,
        fontSize: 13,
    },
});
