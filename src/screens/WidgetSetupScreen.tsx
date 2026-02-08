import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseBackground, ClubhouseCard, ClubhouseButton } from '../components/clubhouse';
import { DailyWallpaperGenerator } from '../components/widget/DailyWallpaperGenerator';
import { colors, useTheme, typography, spacing } from '../theme';
import widgetService, { WidgetConfig } from '../services/widgetService';

interface WidgetSetupScreenProps {
    visible: boolean;
    onClose: () => void;
}

const CONTENT_OPTIONS: { value: WidgetConfig['contentType']; label: string; icon: string }[] = [
    { value: 'verse', label: 'Quran Verses', icon: '📖' },
    { value: 'hadith', label: 'Hadiths', icon: '📜' },
    { value: 'both', label: 'Both', icon: '🌙' },
];

const FREQUENCY_OPTIONS: { value: WidgetConfig['updateFrequency']; label: string; desc: string }[] = [
    { value: 'daily', label: 'Daily', desc: 'New verse every day' },
    { value: '3x_daily', label: '3x Daily', desc: 'Updates 3 times a day' },
    { value: 'hourly', label: 'Hourly', desc: 'Fresh verse every hour' },
];

const TEMPLATE_OPTIONS: { value: WidgetConfig['template']; label: string; color: string }[] = [
    { value: 'minimal', label: 'Minimal', color: '#FFFDF7' },
    { value: 'classic', label: 'Classic', color: '#1A1A2E' },
    { value: 'calligraphy', label: 'Calligraphy', color: '#0F2027' },
];

const WidgetSetupScreen: React.FC<WidgetSetupScreenProps> = ({ visible, onClose }) => {
    const { colors: tc } = useTheme();
    const insets = useSafeAreaInsets();
    const [config, setConfig] = useState<WidgetConfig>({
        contentType: 'verse',
        updateFrequency: 'daily',
        theme: 'auto',
        template: 'minimal',
    });
    const [activeTab, setActiveTab] = useState<'wallpaper' | 'settings'>('wallpaper');

    useEffect(() => {
        if (visible) {
            loadConfig();
        }
    }, [visible]);

    const loadConfig = async () => {
        const saved = await widgetService.getWidgetConfig();
        setConfig(saved);
    };

    const updateConfig = async (updates: Partial<WidgetConfig>) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = { ...config, ...updates };
        setConfig(updated);
        await widgetService.setWidgetConfig(updates);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <ClubhouseBackground>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top || spacing.lg, borderBottomColor: tc.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={tc.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: tc.text }]}>Daily Wallpaper</Text>
                    <View style={styles.headerBtn} />
                </View>

                {/* Tab Selector */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: tc.cream, borderColor: tc.border }, activeTab === 'wallpaper' && { backgroundColor: tc.purple + '12', borderColor: tc.purple }]}
                        onPress={() => setActiveTab('wallpaper')}
                    >
                        <Text style={[styles.tabText, { color: tc.textSecondary }, activeTab === 'wallpaper' && { color: tc.purple, fontWeight: '700' }]}>
                            Wallpaper
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { backgroundColor: tc.cream, borderColor: tc.border }, activeTab === 'settings' && { backgroundColor: tc.purple + '12', borderColor: tc.purple }]}
                        onPress={() => setActiveTab('settings')}
                    >
                        <Text style={[styles.tabText, { color: tc.textSecondary }, activeTab === 'settings' && { color: tc.purple, fontWeight: '700' }]}>
                            Settings
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'wallpaper' ? (
                        <DailyWallpaperGenerator />
                    ) : (
                        <>
                            {/* Content Type */}
                            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>Content Type</Text>
                            <View style={styles.optionRow}>
                                {CONTENT_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.optionChip,
                                            { backgroundColor: tc.cream, borderColor: tc.border },
                                            config.contentType === opt.value && { borderColor: tc.purple, backgroundColor: tc.purple + '10' },
                                        ]}
                                        onPress={() => updateConfig({ contentType: opt.value })}
                                    >
                                        <Text style={styles.optionIcon}>{opt.icon}</Text>
                                        <Text
                                            style={[
                                                styles.optionLabel,
                                                { color: tc.text },
                                                config.contentType === opt.value && { color: tc.purple, fontWeight: '700' },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Update Frequency */}
                            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>Update Frequency</Text>
                            <View style={styles.frequencyList}>
                                {FREQUENCY_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.frequencyCard,
                                            { backgroundColor: tc.cream, borderColor: tc.border },
                                            config.updateFrequency === opt.value && { borderColor: tc.purple, backgroundColor: tc.purple + '08' },
                                        ]}
                                        onPress={() => updateConfig({ updateFrequency: opt.value })}
                                    >
                                        <View style={styles.frequencyText}>
                                            <Text
                                                style={[
                                                    styles.frequencyLabel,
                                                    { color: tc.text },
                                                    config.updateFrequency === opt.value && { color: tc.purple, fontWeight: '700' },
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                            <Text style={[styles.frequencyDesc, { color: tc.textSecondary }]}>{opt.desc}</Text>
                                        </View>
                                        {config.updateFrequency === opt.value && (
                                            <Ionicons name="checkmark-circle" size={22} color={tc.purple} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Template Style */}
                            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>Default Template</Text>
                            <View style={styles.optionRow}>
                                {TEMPLATE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.templateOption,
                                            { backgroundColor: tc.cream, borderColor: tc.border },
                                            config.template === opt.value && { borderColor: tc.purple, backgroundColor: tc.purple + '10' },
                                        ]}
                                        onPress={() => updateConfig({ template: opt.value })}
                                    >
                                        <View style={[styles.templatePreview, { borderColor: tc.border, backgroundColor: opt.color }]} />
                                        <Text
                                            style={[
                                                styles.optionLabel,
                                                { color: tc.text },
                                                config.template === opt.value && { color: tc.purple, fontWeight: '700' },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Info Card */}
                            <ClubhouseCard style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="information-circle-outline" size={20} color={tc.teal} />
                                    <Text style={[styles.infoText, { color: tc.textSecondary }]}>
                                        Save wallpapers to your gallery and set them as your lock screen
                                        from your device's Settings app. A new verse will be ready for you
                                        based on your update frequency.
                                    </Text>
                                </View>
                            </ClubhouseCard>
                        </>
                    )}
                </ScrollView>
            </ClubhouseBackground>
        </Modal>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.title,
        color: colors.text,
    },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        borderRadius: 20,
        backgroundColor: colors.cream,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tabActive: {
        backgroundColor: colors.purple + '12',
        borderColor: colors.purple,
    },
    tabText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.purple,
        fontWeight: '700',
    },
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    sectionTitle: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginTop: spacing.sm,
    },
    optionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    optionChip: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: 16,
        backgroundColor: colors.cream,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    optionChipActive: {
        borderColor: colors.purple,
        backgroundColor: colors.purple + '10',
    },
    optionIcon: {
        fontSize: 22,
    },
    optionLabel: {
        ...typography.small,
        fontWeight: '600',
        color: colors.text,
    },
    optionLabelActive: {
        color: colors.purple,
        fontWeight: '700',
    },
    frequencyList: {
        gap: spacing.sm,
    },
    frequencyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        borderRadius: 16,
        backgroundColor: colors.cream,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    frequencyCardActive: {
        borderColor: colors.purple,
        backgroundColor: colors.purple + '08',
    },
    frequencyText: {
        flex: 1,
    },
    frequencyLabel: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.text,
    },
    frequencyLabelActive: {
        color: colors.purple,
        fontWeight: '700',
    },
    frequencyDesc: {
        ...typography.small,
        color: colors.textSecondary,
        marginTop: 2,
    },
    templateOption: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: 16,
        backgroundColor: colors.cream,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    templateOptionActive: {
        borderColor: colors.purple,
        backgroundColor: colors.purple + '10',
    },
    templatePreview: {
        width: 40,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoCard: {
        marginTop: spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
    },
    infoText: {
        ...typography.caption,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 22,
    },
});

export default WidgetSetupScreen;
