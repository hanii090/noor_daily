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
import { colors, typography, spacing } from '../theme';
import aiService from '../services/aiService';

interface SituationGuidanceModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SituationGuidanceModal: React.FC<SituationGuidanceModalProps> = ({
    visible,
    onClose,
}) => {
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
            console.error('AI Guidance Error:', err);
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
                style={styles.container}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>AI Spiritual Mentor</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {!response ? (
                        <View style={styles.inputContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="sparkles" size={40} color={colors.purple} />
                            </View>
                            <Text style={styles.title}>What's on your heart?</Text>
                            <Text style={styles.subtitle}>
                                Describe how you're feeling or a situation you're facing, and I'll provide guidance from Islamic wisdom.
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="e.g., I'm feeling overwhelmed with work and losing my focus on prayer..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                                numberOfLines={4}
                                value={situation}
                                onChangeText={setSituation}
                                maxLength={200}
                            />

                            {error && <Text style={styles.errorText}>{error}</Text>}

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
                                    <Ionicons name="sparkles" size={20} color={colors.purple} />
                                    <Text style={styles.responseHeaderText}>GUIDANCE FOR YOU</Text>
                                </View>
                                <Text style={styles.responseText}>{response}</Text>
                            </ClubhouseCard>

                            <ClubhouseButton
                                title="Ask Something Else"
                                onPress={handleReset}
                                variant="blue"
                                style={styles.resetButton}
                            />
                            
                            <Text style={styles.disclaimer}>
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
});
