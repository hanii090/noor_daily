import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Platform,
    Linking,
    Modal,
    FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClubhouseBackground, ClubhouseCard, ClubhouseHeader, ClubhouseButton } from '../components/clubhouse';
import { colors, typography, spacing } from '../theme';
import { useAppStore } from '../store/appStore';
import notificationService from '../services/notificationService';
import audioService, { Reciter } from '../services/audioService';

const SettingsScreen = () => {
    const { settings, updateSettings, favoriteVerses, favoriteHadiths, setOnboardingCompleted, clearAllFavorites } = useAppStore();
    const insets = useSafeAreaInsets();
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showReciterModal, setShowReciterModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    const handleNotificationToggle = async (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (value) {
            const hasPermission = await notificationService.requestPermissions();

            if (hasPermission) {
                // Schedule random notifications
                await notificationService.scheduleRandomDailyNotifications(
                    settings.notificationFrequency,
                    settings.notificationContentType,
                    {
                        start: settings.quietHoursStart,
                        end: settings.quietHoursEnd,
                    },
                    settings.weekendMode
                );

                await updateSettings({ notificationsEnabled: true });
            } else {
                await updateSettings({ notificationsEnabled: false });
            }
        } else {
            await notificationService.cancelAllNotifications();
            await updateSettings({ notificationsEnabled: false });
        }
    };

    const handleFrequencyChange = async (freq: 2 | 3 | 4) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ notificationFrequency: freq });
        if (settings.notificationsEnabled) {
            await notificationService.scheduleRandomDailyNotifications(
                freq,
                settings.notificationContentType,
                { start: settings.quietHoursStart, end: settings.quietHoursEnd },
                settings.weekendMode
            );
        }
    };

    const handleContentTypeChange = async (type: 'verse' | 'hadith' | 'both') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ notificationContentType: type });
        if (settings.notificationsEnabled) {
            await notificationService.scheduleRandomDailyNotifications(
                settings.notificationFrequency,
                type,
                { start: settings.quietHoursStart, end: settings.quietHoursEnd },
                settings.weekendMode
            );
        }
    };

    const [quietHoursType, setQuietHoursType] = useState<'start' | 'end' | null>(null);

    const handleQuietHoursPress = (type: 'start' | 'end') => {
        setQuietHoursType(type);
        setShowTimePicker(true);
    };

    const handleTimeChange = async (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            const newTime = `${hours}:${minutes}`;

            if (quietHoursType === 'start') {
                await updateSettings({ quietHoursStart: newTime });
            } else if (quietHoursType === 'end') {
                await updateSettings({ quietHoursEnd: newTime });
            } else {
                await updateSettings({ notificationTime: newTime });
            }

            // Reschedule
            if (settings.notificationsEnabled) {
                await notificationService.scheduleRandomDailyNotifications(
                    settings.notificationFrequency,
                    settings.notificationContentType,
                    {
                        start: quietHoursType === 'start' ? newTime : settings.quietHoursStart,
                        end: quietHoursType === 'end' ? newTime : settings.quietHoursEnd,
                    },
                    settings.weekendMode
                );
            }
        }
        
        // On iOS, we might want to keep it open if it's inline, but since we use it as a modal trigger, 
        // we should close it after the user is done. For 'spinner' or 'default' on iOS, 
        // usually we close it on 'dismiss' or after selection.
        if (event.type === 'dismissed' || Platform.OS === 'ios') {
            setShowTimePicker(false);
        }
    };

    const handleWeekendModeToggle = async (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ weekendMode: value });
        if (settings.notificationsEnabled) {
            await notificationService.scheduleRandomDailyNotifications(
                settings.notificationFrequency,
                settings.notificationContentType,
                { start: settings.quietHoursStart, end: settings.quietHoursEnd },
                value
            );
        }
    };

    const handleDarkModeToggle = async (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ darkMode: value });
    };

    const handleLanguageSelect = async (lang: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ language: lang });
        setShowLanguageModal(false);
    };

    const handleReciterSelect = async (reciter: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ reciter });
        setShowReciterModal(false);
    };

    const handleClearSaved = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const total = favoriteVerses.length + favoriteHadiths.length;
        Alert.alert(
            'Clear Saved Guidance',
            `This will remove all ${total} items. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllFavorites();
                    },
                },
            ]
        );
    };

    const handleResetApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Reset App',
            'This will clear all data and reset the app to initial state. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        await setOnboardingCompleted(false);
                    },
                },
            ]
        );
    };

    const handleOpenURL = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Unable to open link. Please try again later.');
        }
    };

    // Get notification status text
    const getNotificationStatus = () => {
        if (settings.notificationsEnabled) {
            return `Notifications enabled for ${settings.notificationTime}`;
        }
        return 'Notifications disabled';
    };

    const getReciterName = () => {
        const reciters = audioService.getReciters();
        const reciter = reciters.find(r => r.edition === settings.reciter);
        return reciter?.name || 'Mishary Alafasy';
    };

    const getLanguageName = () => {
        const languages: Record<string, string> = {
            en: 'English',
            ar: 'Arabic',
            ur: 'Urdu',
            tr: 'Turkish',
        };
        return languages[settings.language] || 'English';
    };

    return (
        <ClubhouseBackground color="creamLight">
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingTop: insets.top }
                ]}
                showsVerticalScrollIndicator={false}
            >
                <ClubhouseHeader 
                    title="Settings" 
                    subtitle="PERSONALIZE YOUR EXPERIENCE"
                />

                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DAILY NOTIFICATIONS</Text>
                    <ClubhouseCard backgroundColor={colors.backgroundSecondary}>
                        <SettingRow
                            title="Enable Notifications"
                            subtitle="Get daily spiritual reminders"
                            icon="notifications"
                            iconBg="#E3F2FF"
                            iconColor="#007AFF"
                            rightComponent={
                                <Switch
                                    value={settings.notificationsEnabled}
                                    onValueChange={handleNotificationToggle}
                                    trackColor={{ false: colors.border, true: colors.purple }}
                                    thumbColor={colors.white}
                                />
                            }
                        />
                        
                        {settings.notificationsEnabled && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.subSection}>
                                    <Text style={styles.subSectionTitle}>FREQUENCY</Text>
                                    <View style={styles.optionGroup}>
                                        {[2, 3, 4].map((f) => (
                                            <TouchableOpacity 
                                                key={f}
                                                style={[styles.optionButton, settings.notificationFrequency === f && styles.optionButtonActive]}
                                                onPress={() => handleFrequencyChange(f as any)}
                                            >
                                                <Text style={[styles.optionText, settings.notificationFrequency === f && styles.optionTextActive]}>
                                                    {f} times
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.divider} />
                                <View style={styles.subSection}>
                                    <Text style={styles.subSectionTitle}>CONTENT TYPE</Text>
                                    <View style={styles.optionGroup}>
                                        {['verse', 'hadith', 'both'].map((t) => (
                                            <TouchableOpacity 
                                                key={t}
                                                style={[styles.optionButton, settings.notificationContentType === t && styles.optionButtonActive]}
                                                onPress={() => handleContentTypeChange(t as any)}
                                            >
                                                <Text style={[styles.optionText, settings.notificationContentType === t && styles.optionTextActive]}>
                                                    {t === 'both' ? 'Both' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.divider} />
                                <View style={styles.row}>
                                    <View style={styles.rowLeft}>
                                        <Text style={styles.rowTitle}>Quiet Hours</Text>
                                        <Text style={styles.rowSubtitle}>No notifications during this time</Text>
                                    </View>
                                    <View style={styles.quietHoursContainer}>
                                        <TouchableOpacity onPress={() => handleQuietHoursPress('start')}>
                                            <Text style={styles.timeText}>{settings.quietHoursStart}</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.timeSeparator}>to</Text>
                                        <TouchableOpacity onPress={() => handleQuietHoursPress('end')}>
                                            <Text style={styles.timeText}>{settings.quietHoursEnd}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.divider} />
                                <SettingRow
                                    title="Weekend Mode"
                                    subtitle="Fewer notifications on Sat/Sun"
                                    icon="calendar"
                                    iconBg="#F4EDFA"
                                    iconColor="#AF52DE"
                                    rightComponent={
                                        <Switch
                                            value={settings.weekendMode}
                                            onValueChange={handleWeekendModeToggle}
                                            trackColor={{ false: colors.border, true: colors.purple }}
                                            thumbColor={colors.white}
                                        />
                                    }
                                />
                            </>
                        )}
                    </ClubhouseCard>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    <ClubhouseCard backgroundColor={colors.backgroundSecondary}>
                        <SettingRow
                            title="Dark Mode"
                            subtitle="Adaptive theme for night time"
                            icon="moon"
                            iconBg="#FFF4E5"
                            iconColor="#FF9500"
                            rightComponent={
                                <Switch
                                    value={settings.darkMode}
                                    onValueChange={handleDarkModeToggle}
                                    trackColor={{ false: colors.border, true: colors.purple }}
                                    thumbColor={colors.white}
                                />
                            }
                        />
                        <View style={styles.divider} />
                        <TouchableOpacity onPress={() => setShowLanguageModal(true)}>
                            <SettingRow
                                title="Language"
                                subtitle={getLanguageName()}
                                icon="language"
                                iconBg="#E8F8EC"
                                iconColor="#34C759"
                                rightComponent={
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                }
                            />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity onPress={() => setShowReciterModal(true)}>
                            <SettingRow
                                title="Quran Reciter"
                                subtitle={getReciterName()}
                                icon="musical-notes"
                                iconBg="#F4EDFA"
                                iconColor={colors.purple}
                                rightComponent={
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                }
                            />
                        </TouchableOpacity>
                    </ClubhouseCard>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ABOUT</Text>
                    <ClubhouseCard backgroundColor={colors.backgroundSecondary}>
                        <TouchableOpacity onPress={() => handleOpenURL('https://noordaily.app')}>
                            <SettingRow
                                title="About Noor Daily"
                                icon="information-circle"
                                iconBg="#E3F2FF"
                                iconColor="#007AFF"
                                rightComponent={
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                }
                            />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity onPress={() => handleOpenURL('https://noordaily.app/privacy')}>
                            <SettingRow
                                title="Privacy Policy"
                                icon="shield-checkmark"
                                iconBg="#E8F8EC"
                                iconColor="#34C759"
                                rightComponent={
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                }
                            />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity onPress={() => handleOpenURL('https://noordaily.app/terms')}>
                            <SettingRow
                                title="Terms of Service"
                                icon="document-text"
                                iconBg="#FFF4E5"
                                iconColor="#FF9500"
                                rightComponent={
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                }
                            />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity onPress={() => handleOpenURL('mailto:support@noordaily.app')}>
                            <SettingRow
                                title="Contact Support"
                                icon="mail"
                                iconBg="#FFE9E7"
                                iconColor="#FF3B30"
                                rightComponent={
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                }
                            />
                        </TouchableOpacity>
                    </ClubhouseCard>
                </View>

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DATA</Text>
                    <ClubhouseCard backgroundColor={colors.backgroundSecondary}>
                        <TouchableOpacity onPress={handleClearSaved}>
                            <SettingRow
                                title="Clear Saved Guidance"
                                titleColor={colors.coral}
                                icon="trash"
                                iconBg="#FFE9E7"
                                iconColor={colors.coral}
                            />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity onPress={handleResetApp}>
                            <SettingRow
                                title="Reset App"
                                titleColor={colors.coral}
                                icon="refresh"
                                iconBg="#FFE9E7"
                                iconColor={colors.coral}
                            />
                        </TouchableOpacity>
                    </ClubhouseCard>
                </View>

                {/* Version */}
                <Text style={styles.version}>Version 1.0.0</Text>

                {/* Date Picker */}
                {showTimePicker && (
                    <DateTimePicker
                        value={(() => {
                            const timeStr = quietHoursType === 'start' 
                                ? settings.quietHoursStart 
                                : quietHoursType === 'end' 
                                    ? settings.quietHoursEnd 
                                    : settings.notificationTime;
                            const [h, m] = timeStr.split(':').map(Number);
                            const d = new Date();
                            d.setHours(h, m, 0, 0);
                            return d;
                        })()}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleTimeChange}
                    />
                )}

                {/* Reciter Modal */}
                <Modal
                    visible={showReciterModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowReciterModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Reciter</Text>
                                <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={audioService.getReciters()}
                                keyExtractor={(item) => item.edition}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={[styles.modalItem, settings.reciter === item.edition && styles.modalItemActive]}
                                        onPress={() => handleReciterSelect(item.edition)}
                                    >
                                        <View>
                                            <Text style={[styles.modalItemTitle, settings.reciter === item.edition && styles.modalItemTextActive]}>
                                                {item.name}
                                            </Text>
                                            <Text style={styles.modalItemSubtitle}>{item.description}</Text>
                                        </View>
                                        {settings.reciter === item.edition && (
                                            <Ionicons name="checkmark-circle" size={24} color={colors.purple} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Language Modal */}
                <Modal
                    visible={showLanguageModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowLanguageModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Language</Text>
                                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            {[
                                { id: 'en', name: 'English' },
                                { id: 'ar', name: 'Arabic' },
                                { id: 'ur', name: 'Urdu' },
                                { id: 'tr', name: 'Turkish' },
                            ].map((lang) => (
                                <TouchableOpacity 
                                    key={lang.id}
                                    style={[styles.modalItem, settings.language === lang.id && styles.modalItemActive]}
                                    onPress={() => handleLanguageSelect(lang.id)}
                                >
                                    <Text style={[styles.modalItemTitle, settings.language === lang.id && styles.modalItemTextActive]}>
                                        {lang.name}
                                    </Text>
                                    {settings.language === lang.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={colors.purple} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </ClubhouseBackground>
    );
};

const SettingRow: React.FC<{
    title: string;
    subtitle?: string;
    titleColor?: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    rightComponent?: React.ReactNode;
}> = ({ title, subtitle, titleColor = colors.text, icon, iconBg, iconColor, rightComponent }) => (
    <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.rowLeft}>
            <Text style={[styles.rowTitle, { color: titleColor }]}>{title}</Text>
            {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
        </View>
        {rightComponent && <View style={styles.rowRight}>{rightComponent}</View>}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 160,
    },
    section: {
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
        fontWeight: '700',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.base,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    rowLeft: {
        flex: 1,
    },
    rowTitle: {
        ...typography.body,
        fontWeight: '600',
    },
    rowSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    rowRight: {
        marginLeft: spacing.base,
    },
    subSection: {
        paddingVertical: spacing.md,
    },
    subSectionTitle: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        marginBottom: spacing.base,
        letterSpacing: 0.5,
    },
    optionGroup: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    optionButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: 12,
        backgroundColor: colors.cream,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    optionButtonActive: {
        backgroundColor: colors.purple,
        borderColor: colors.purple,
    },
    optionText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    optionTextActive: {
        color: colors.white,
    },
    quietHoursContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    timeText: {
        ...typography.body,
        fontWeight: '700',
        color: colors.purple,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.cream,
        borderRadius: 8,
    },
    timeSeparator: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    divider: {
        height: 0.5,
        backgroundColor: colors.border,
    },
    version: {
        ...typography.small,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.xxxl,
    },
    statusContainer: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    statusText: {
        ...typography.small,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.black,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
    },
    modalItemActive: {
        backgroundColor: colors.purple + '05',
    },
    modalItemTitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    modalItemTextActive: {
        color: colors.purple,
        fontWeight: '700',
    },
    modalItemSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
});

export default SettingsScreen;
