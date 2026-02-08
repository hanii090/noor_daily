import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, useTheme, typography, spacing } from '../../theme';
import widgetService, { WidgetData } from '../../services/widgetService';
import analyticsService from '../../services/analyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.6;

type WallpaperTemplate = 'light' | 'dark' | 'warm';

const TEMPLATES: { value: WallpaperTemplate; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'warm', label: 'Warm', icon: 'flame-outline' },
];

const PALETTE: Record<WallpaperTemplate, { bg: string; text: string; accent: string; muted: string; line: string }> = {
    light: { bg: '#FAFAF8', text: '#1A1A1A', accent: '#7A5BE6', muted: '#999', line: '#E8E8E4' },
    dark:  { bg: '#111111', text: '#F5F5F5', accent: '#A78BFA', muted: '#777', line: '#2A2A2A' },
    warm:  { bg: '#FDF6EC', text: '#3D2E1F', accent: '#C97B3A', muted: '#8A7A6A', line: '#E8DDD0' },
};

const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max).trimEnd() + '...' : str;

export const DailyWallpaperGenerator: React.FC = () => {
    const { colors: tc } = useTheme();
    const viewShotRef = useRef<ViewShot>(null);
    const [template, setTemplate] = useState<WallpaperTemplate>('light');
    const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            let data = await widgetService.getWidgetData();
            if (!data || await widgetService.needsRefresh()) {
                data = await widgetService.updateWidgetData();
            }
            setWidgetData(data);
        } catch (error) {
            console.error('Error loading wallpaper data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToGallery = async () => {
        if (!viewShotRef.current?.capture) return;
        setIsSaving(true);

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your photo library.');
                setIsSaving(false);
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const uri = await viewShotRef.current.capture();
            await MediaLibrary.saveToLibraryAsync(uri);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Saved!', 'Wallpaper saved to your photo library.');
            analyticsService.logEvent('wallpaper_saved', { template });
        } catch (error) {
            console.error('Error saving wallpaper:', error);
            Alert.alert('Error', 'Failed to save wallpaper.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async () => {
        if (!viewShotRef.current?.capture) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const uri = await viewShotRef.current.capture();
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri, { mimeType: 'image/png' });
                analyticsService.logEvent('wallpaper_shared', { template });
            }
        } catch (error) {
            console.error('Error sharing wallpaper:', error);
        }
    };

    const handleRefresh = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLoading(true);
        try {
            const data = await widgetService.updateWidgetData();
            setWidgetData(data);
        } catch (error) {
            console.error('Error refreshing wallpaper:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const p = PALETTE[template];

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tc.purple} />
                <Text style={[styles.loadingText, { color: tc.textSecondary }]}>Preparing wallpaper...</Text>
            </View>
        );
    }

    if (!widgetData) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={tc.textTertiary} />
                <Text style={[styles.loadingText, { color: tc.textSecondary }]}>Unable to load content</Text>
                <TouchableOpacity onPress={loadData} style={[styles.retryBtn, { backgroundColor: tc.purple + '15' }]}>
                    <Text style={[styles.retryBtnText, { color: tc.purple }]}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const shortArabic = truncate(widgetData.arabic, 80);
    const shortEnglish = truncate(widgetData.english, 100);

    return (
        <View style={styles.container}>
            {/* Template Selector */}
            <View style={styles.templateRow}>
                {TEMPLATES.map((tmpl) => (
                    <TouchableOpacity
                        key={tmpl.value}
                        style={[
                            styles.templateChip,
                            { backgroundColor: tc.cream, borderColor: tc.border },
                            template === tmpl.value && { borderColor: tc.purple, backgroundColor: tc.purple + '10' },
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setTemplate(tmpl.value);
                        }}
                    >
                        <Ionicons
                            name={tmpl.icon}
                            size={14}
                            color={template === tmpl.value ? tc.purple : tc.textSecondary}
                        />
                        <Text style={[
                            styles.templateChipText,
                            { color: tc.textSecondary },
                            template === tmpl.value && { color: tc.purple, fontWeight: '700' },
                        ]}>
                            {tmpl.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Wallpaper Preview */}
            <View style={[styles.previewContainer, { borderColor: tc.border }]}>
                <ViewShot
                    ref={viewShotRef}
                    options={{ format: 'png', quality: 1, width: 1170, height: 2532 }}
                >
                    <View style={[styles.wallpaper, { backgroundColor: p.bg }]}>
                        {/* Minimal top branding */}
                        <View style={styles.wpTop}>
                            <View style={[styles.wpTopLine, { backgroundColor: p.line }]} />
                        </View>

                        {/* Center — short text */}
                        <View style={styles.wpCenter}>
                            <Text style={[styles.wpArabic, { color: p.text }]} numberOfLines={2}>
                                {shortArabic}
                            </Text>
                            <View style={[styles.wpDivider, { backgroundColor: p.accent }]} />
                            <Text style={[styles.wpEnglish, { color: p.muted }]} numberOfLines={3}>
                                "{shortEnglish}"
                            </Text>
                        </View>

                        {/* Bottom — reference + branding */}
                        <View style={styles.wpBottom}>
                            <Text style={[styles.wpRef, { color: p.accent }]}>
                                {widgetData.reference}
                            </Text>
                            <View style={[styles.wpBottomLine, { backgroundColor: p.line }]} />
                            <Text style={[styles.wpBrand, { color: p.muted }]}>
                                NOOR DAILY
                            </Text>
                        </View>
                    </View>
                </ViewShot>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: tc.cream, borderColor: tc.border }]} onPress={handleRefresh}>
                    <Ionicons name="refresh-outline" size={20} color={tc.purple} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { flex: 2, backgroundColor: tc.purple, borderColor: tc.purple }]}
                    onPress={handleSaveToGallery}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="download-outline" size={20} color="#fff" />
                            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Save to Photos</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: tc.cream, borderColor: tc.border }]} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={tc.purple} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
        alignItems: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        gap: spacing.md,
    },
    loadingText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    retryBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 16,
        backgroundColor: colors.purple + '15',
    },
    retryBtnText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.purple,
    },

    // Template Selector
    templateRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    templateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.cream,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    templateChipActive: {
        borderColor: colors.purple,
        backgroundColor: colors.purple + '10',
    },
    templateChipText: {
        ...typography.small,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    templateChipTextActive: {
        color: colors.purple,
        fontWeight: '700',
    },

    // Wallpaper Preview
    previewContainer: {
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    wallpaper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },

    // Wallpaper internals
    wpTop: {
        position: 'absolute',
        top: '18%',
        left: spacing.xl,
        right: spacing.xl,
        alignItems: 'center',
    },
    wpTopLine: {
        width: 32,
        height: 2,
        borderRadius: 1,
    },
    wpCenter: {
        alignItems: 'center',
        gap: spacing.base,
        paddingHorizontal: spacing.sm,
        maxWidth: '100%',
    },
    wpArabic: {
        fontFamily: 'Amiri_400Regular',
        fontSize: 18,
        lineHeight: 32,
        textAlign: 'center',
    },
    wpDivider: {
        width: 24,
        height: 1.5,
        borderRadius: 1,
    },
    wpEnglish: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        fontWeight: '400',
    },
    wpBottom: {
        position: 'absolute',
        bottom: '12%',
        left: spacing.xl,
        right: spacing.xl,
        alignItems: 'center',
        gap: spacing.sm,
    },
    wpRef: {
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    wpBottomLine: {
        width: 20,
        height: 1,
        borderRadius: 0.5,
    },
    wpBrand: {
        fontSize: 8,
        fontWeight: '600',
        letterSpacing: 2.5,
        fontFamily: 'Inter_400Regular',
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.cream,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionBtnPrimary: {
        backgroundColor: colors.purple,
        borderColor: colors.purple,
    },
    actionBtnText: {
        ...typography.small,
        fontWeight: '700',
        color: colors.text,
    },
});
