import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseCard } from './clubhouse';
import { colors, useTheme, typography, spacing } from '../theme';
import { VerseCardTemplate, VerseCardSize } from '../types';

interface TemplateOption {
    template: VerseCardTemplate;
    name: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const templates: TemplateOption[] = [
    {
        template: 'minimal',
        name: 'Minimal',
        description: 'Clean & simple design',
        icon: 'remove-outline',
    },
    {
        template: 'vibrant',
        name: 'Vibrant',
        description: 'Colorful gradient background',
        icon: 'color-palette-outline',
    },
    {
        template: 'classic',
        name: 'Classic',
        description: 'Traditional Islamic style',
        icon: 'star-outline',
    },
];

interface TemplateSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectTemplate: (template: VerseCardTemplate, size: VerseCardSize) => void;
    moodColor: string;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
    visible,
    onClose,
    onSelectTemplate,
    moodColor,
}) => {
    const { colors: tc } = useTheme();
    const [selectedSize, setSelectedSize] = React.useState<VerseCardSize>('post');

    const handleSelect = (template: VerseCardTemplate) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelectTemplate(template, selectedSize);
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                <View style={[styles.modalContent, { backgroundColor: tc.creamLight }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: tc.border }]}>
                        <View style={[styles.handle, { backgroundColor: tc.textTertiary + '40' }]} />
                        <Text style={[styles.title, { color: tc.text }]}>Choose Template</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={tc.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Size Selector */}
                    <View style={styles.sizeSelector}>
                        <Text style={[styles.sizeSelectorLabel, { color: tc.textSecondary }]}>Format</Text>
                        <View style={styles.sizeButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.sizeButton,
                                    { backgroundColor: tc.white, borderColor: tc.border },
                                    selectedSize === 'post' && [styles.sizeButtonActive, { borderColor: moodColor, backgroundColor: tc.backgroundSecondary }],
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedSize('post');
                                }}
                            >
                                <Ionicons
                                    name="square-outline"
                                    size={20}
                                    color={selectedSize === 'post' ? moodColor : tc.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.sizeButtonText,
                                        { color: tc.textSecondary },
                                        selectedSize === 'post' && { color: moodColor },
                                    ]}
                                >
                                    Post (1:1)
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.sizeButton,
                                    { backgroundColor: tc.white, borderColor: tc.border },
                                    selectedSize === 'story' && [styles.sizeButtonActive, { borderColor: moodColor, backgroundColor: tc.backgroundSecondary }],
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedSize('story');
                                }}
                            >
                                <Ionicons
                                    name="phone-portrait-outline"
                                    size={20}
                                    color={selectedSize === 'story' ? moodColor : tc.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.sizeButtonText,
                                        { color: tc.textSecondary },
                                        selectedSize === 'story' && { color: moodColor },
                                    ]}
                                >
                                    Story (9:16)
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Template Options */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.templatesContainer}
                    >
                        {templates.map((option) => (
                            <TouchableOpacity
                                key={option.template}
                                onPress={() => handleSelect(option.template)}
                                activeOpacity={0.8}
                            >
                                <ClubhouseCard accentColor={moodColor} style={styles.templateCard}>
                                    <View style={styles.templateContent}>
                                        <View style={styles.templateLeft}>
                                            <Ionicons name={option.icon} size={32} color={moodColor} />
                                        </View>
                                        <View style={styles.templateInfo}>
                                            <Text style={[styles.templateName, { color: tc.text }]}>{option.name}</Text>
                                            <Text style={[styles.templateDescription, { color: tc.textSecondary }]}>{option.description}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    </View>
                                </ClubhouseCard>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdrop: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.creamLight,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: spacing.xl,
        maxHeight: '70%',
    },
    header: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.base,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        position: 'relative',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h3,
        color: colors.text,
    },
    closeButton: {
        position: 'absolute',
        right: spacing.base,
        top: spacing.md,
        padding: spacing.xs,
    },
    templatesContainer: {
        padding: spacing.lg,
    },
    templateCard: {
        marginBottom: spacing.md,
    },
    templateContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    templateLeft: {
        marginRight: spacing.base,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        ...typography.title,
        color: colors.text,
        marginBottom: 4,
    },
    templateDescription: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    sizeSelector: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.base,
    },
    sizeSelectorLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sizeButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    sizeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.base,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.white,
        gap: spacing.xs,
    },
    sizeButtonActive: {
        backgroundColor: colors.creamLight,
        borderWidth: 2,
    },
    sizeButtonText: {
        ...typography.body,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
