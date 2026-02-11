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
    Share,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { ClubhouseBackground, ClubhouseCard, ClubhouseHeader, ClubhouseButton } from '../components/clubhouse';
import { colors, useTheme, typography, spacing, TAB_BAR_SAFE_PADDING } from '../theme';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import * as Notifications from 'expo-notifications';
import notificationService from '../services/notificationService';
import audioService, { Reciter } from '../services/audioService';
import dataService from '../services/dataService';
import WidgetSetupScreen from './WidgetSetupScreen';

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ar', label: 'Arabic', native: 'العربية' },
    { code: 'ur', label: 'Urdu', native: 'اردو' },
    { code: 'tr', label: 'Turkish', native: 'Türkçe' },
];

const SettingsScreen = () => {
    const { colors: tc } = useTheme();
    const { t, i18n } = useTranslation();
    const { settings, updateSettings, favoriteVerses, favoriteHadiths, setOnboardingCompleted, clearAllFavorites } = useAppStore();
    const insets = useSafeAreaInsets();
    const [showReciterModal, setShowReciterModal] = useState(false);
    const [showWidgetSetup, setShowWidgetSetup] = useState(false);
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






    const handleReciterSelect = async (reciter: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ reciter });
        setShowReciterModal(false);
    };

    const handleLanguageSelect = async (langCode: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateSettings({ language: langCode });
        i18n.changeLanguage(langCode);
        setShowLanguageModal(false);
    };

    const handleRateApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const storeUrl = Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/noor-daily/id6740000000' // TODO: Replace with actual App Store ID after submission
            : 'https://play.google.com/store/apps/details?id=com.noordaily.app';
        Linking.openURL(storeUrl);
    };

    const handleShareApp = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: t('settings.share_message'),
            });
        } catch (_e) { /* user cancelled */ }
    };

    const getLanguageName = () => {
        return LANGUAGES.find(l => l.code === settings.language)?.label || 'English';
    };

    const handleClearSaved = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const total = favoriteVerses.length + favoriteHadiths.length;
        Alert.alert(
            t('settings.clear_saved_title'),
            t('settings.clear_saved_message', { count: total }),
            [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                    text: t('settings.clear_all'),
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
            t('settings.reset_app_title'),
            t('settings.reset_app_message'),
            [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                    text: t('settings.reset_confirm'),
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
            Alert.alert('Error', t('settings.error_open_link'));
        }
    };

    // Get notification status text
    const getNotificationStatus = () => {
        if (settings.notificationsEnabled) {
            return t('settings.notifications_enabled_for', { time: settings.notificationTime });
        }
        return t('settings.notifications_disabled');
    };

    const getReciterName = () => {
        const reciters = audioService.getReciters();
        const reciter = reciters.find(r => r.edition === settings.reciter);
        return reciter?.name || 'Mishary Alafasy';
    };

    return (
        <ClubhouseBackground color="creamLight">
            <View style={styles.outerContainer}>
                {/* Fixed Glass Header */}
                <View style={styles.headerFixedContainer}>
                    <ClubhouseHeader
                        title={t('settings.title')}
                        subtitle={t('settings.personalize')}
                    />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.contentContainer,
                        { paddingTop: insets.top + 80 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                >

                    {/* Notifications Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('settings.daily_notifications')}</Text>
                        <ClubhouseCard backgroundColor={tc.backgroundSecondary}>
                            <SettingRow
                                title={t('settings.enable_notifications')}
                                subtitle={t('settings.enable_notifications_desc')}
                                icon="notifications"
                                iconBg="#E3F2FF"
                                iconColor="#007AFF"
                                rightComponent={
                                    <Switch
                                        value={settings.notificationsEnabled}
                                        onValueChange={handleNotificationToggle}
                                        trackColor={{ false: tc.border, true: tc.purple }}
                                        thumbColor={tc.white}
                                    />
                                }
                            />

                            {settings.notificationsEnabled && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.subSection}>
                                        <Text style={[styles.subSectionTitle, { color: tc.textTertiary }]}>{t('settings.frequency_label')}</Text>
                                        <View style={styles.optionGroup}>
                                            {[2, 3, 4].map((f) => (
                                                <TouchableOpacity
                                                    key={f}
                                                    style={[styles.optionButton, { backgroundColor: tc.cream, borderColor: tc.border }, settings.notificationFrequency === f && styles.optionButtonActive]}
                                                    onPress={() => handleFrequencyChange(f as any)}
                                                >
                                                    <Text style={[styles.optionText, { color: tc.textSecondary }, settings.notificationFrequency === f && styles.optionTextActive]}>
                                                        {f} times
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.divider} />
                                    <View style={styles.subSection}>
                                        <Text style={[styles.subSectionTitle, { color: tc.textTertiary }]}>{t('settings.content_type_label')}</Text>
                                        <View style={styles.optionGroup}>
                                            {['verse', 'hadith', 'both'].map((ct) => (
                                                <TouchableOpacity
                                                    key={ct}
                                                    style={[styles.optionButton, { backgroundColor: tc.cream, borderColor: tc.border }, settings.notificationContentType === ct && styles.optionButtonActive]}
                                                    onPress={() => handleContentTypeChange(ct as any)}
                                                >
                                                    <Text style={[styles.optionText, { color: tc.textSecondary }, settings.notificationContentType === ct && styles.optionTextActive]}>
                                                        {ct === 'both' ? t('settings.both') : ct === 'verse' ? t('settings.verses') : t('settings.hadiths')}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>


                                </>
                            )}
                        </ClubhouseCard>
                    </View>

                    {/* Preferences Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('settings.preferences')}</Text>
                        <ClubhouseCard backgroundColor={tc.backgroundSecondary}>
                            <SettingRow
                                title={t('settings.your_name')}
                                subtitle={t('settings.your_name_desc')}
                                icon="person"
                                iconBg="#E8F5E9"
                                iconColor="#4CAF50"
                                rightComponent={
                                    <TextInput
                                        style={[styles.nameEditInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.cream }]}
                                        value={settings.userName}
                                        onChangeText={(text) => updateSettings({ userName: text })}
                                        placeholder={t('settings.name_placeholder')}
                                        placeholderTextColor={tc.textTertiary}
                                        maxLength={30}
                                        autoCapitalize="words"
                                    />
                                }
                            />
                            <View style={styles.divider} />
                            <SettingRow
                                title={t('settings.dark_mode')}
                                subtitle={settings.darkMode ? 'On' : 'Off'}
                                icon="moon"
                                iconBg="#1C1C1E"
                                iconColor="#FFD60A"
                                rightComponent={
                                    <Switch
                                        value={settings.darkMode}
                                        onValueChange={async (value) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            await updateSettings({ darkMode: value });
                                        }}
                                        trackColor={{ false: tc.border, true: tc.purple }}
                                        thumbColor={tc.white}
                                    />
                                }
                            />
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={() => setShowLanguageModal(true)}>
                                <SettingRow
                                    title={t('settings.language')}
                                    subtitle={getLanguageName()}
                                    icon="language"
                                    iconBg="#E3F2FF"
                                    iconColor="#007AFF"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={() => setShowReciterModal(true)}>
                                <SettingRow
                                    title={t('settings.reciter')}
                                    subtitle={getReciterName()}
                                    icon="musical-notes"
                                    iconBg={tc.cream}
                                    iconColor={tc.purple}
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                        </ClubhouseCard>
                    </View>


                    {/* Rate & Share Section — Task 19 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('settings.spread_noor')}</Text>
                        <ClubhouseCard backgroundColor={tc.backgroundSecondary}>
                            <TouchableOpacity onPress={handleRateApp}>
                                <SettingRow
                                    title={t('settings.rate_app')}
                                    subtitle={t('settings.rate_app_desc')}
                                    icon="star"
                                    iconBg="#FFF4E5"
                                    iconColor="#FF9500"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={handleShareApp}>
                                <SettingRow
                                    title={t('settings.share_friends')}
                                    subtitle={t('settings.share_friends_desc')}
                                    icon="share-social"
                                    iconBg="#E3F2FF"
                                    iconColor="#007AFF"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                        </ClubhouseCard>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('settings.about')}</Text>
                        <ClubhouseCard backgroundColor={tc.backgroundSecondary}>
                            <TouchableOpacity onPress={() => handleOpenURL('https://noordaily.app')}>
                                <SettingRow
                                    title={t('settings.about_app')}
                                    icon="information-circle"
                                    iconBg="#E3F2FF"
                                    iconColor="#007AFF"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={() => handleOpenURL('https://noordaily.app/privacy')}>
                                <SettingRow
                                    title={t('settings.privacy')}
                                    icon="shield-checkmark"
                                    iconBg="#E8F8EC"
                                    iconColor="#34C759"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={() => handleOpenURL('https://noordaily.app/terms')}>
                                <SettingRow
                                    title={t('settings.terms')}
                                    icon="document-text"
                                    iconBg="#FFF4E5"
                                    iconColor="#FF9500"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={() => handleOpenURL('mailto:support@noordaily.app')}>
                                <SettingRow
                                    title={t('settings.contact_support')}
                                    icon="mail"
                                    iconBg="#FFE9E7"
                                    iconColor="#FF3B30"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                        </ClubhouseCard>
                    </View>

                    {/* Data Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>{t('settings.data')}</Text>
                        <ClubhouseCard backgroundColor={tc.backgroundSecondary}>
                            <TouchableOpacity onPress={handleClearSaved}>
                                <SettingRow
                                    title={t('settings.clear_saved')}
                                    titleColor={tc.coral}
                                    icon="trash"
                                    iconBg="#FFE9E7"
                                    iconColor={tc.coral}
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={handleResetApp}>
                                <SettingRow
                                    title={t('settings.reset_app')}
                                    titleColor={tc.coral}
                                    icon="refresh"
                                    iconBg="#FFE9E7"
                                    iconColor={tc.coral}
                                />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={() => dataService.exportUserData()}>
                                <SettingRow
                                    title="Export My Data"
                                    titleColor={tc.text}
                                    icon="download"
                                    iconBg="#E3F2FF"
                                    iconColor="#007AFF"
                                    rightComponent={
                                        <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                                    }
                                />
                            </TouchableOpacity>
                        </ClubhouseCard>
                    </View>


                    {/* Version */}
                    <Text style={[styles.version, { color: tc.textTertiary }]}>Version {Constants.expoConfig?.version || '1.0.0'}</Text>



                    {/* Reciter Modal */}
                    <Modal
                        visible={showReciterModal}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setShowReciterModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: tc.white }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: tc.text }]}>Select Reciter</Text>
                                    <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                                        <Ionicons name="close" size={24} color={tc.text} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={audioService.getReciters()}
                                    keyExtractor={(item) => item.edition}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.modalItem, { borderBottomColor: tc.border }, settings.reciter === item.edition && { backgroundColor: tc.purple + '08' }]}
                                            onPress={() => handleReciterSelect(item.edition)}
                                        >
                                            <View>
                                                <Text style={[styles.modalItemTitle, { color: tc.text }, settings.reciter === item.edition && { color: tc.purple, fontWeight: '700' }]}>
                                                    {item.name}
                                                </Text>
                                                <Text style={[styles.modalItemSubtitle, { color: tc.textTertiary }]}>{item.description}</Text>
                                            </View>
                                            {settings.reciter === item.edition && (
                                                <Ionicons name="checkmark-circle" size={24} color={tc.purple} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>

                    {/* Widget Setup Modal */}
                    <WidgetSetupScreen
                        visible={showWidgetSetup}
                        onClose={() => setShowWidgetSetup(false)}
                    />

                    {/* Language Selector Modal — Task 16 */}
                    <Modal
                        visible={showLanguageModal}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setShowLanguageModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: tc.white }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: tc.text }]}>Select Language</Text>
                                    <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                                        <Ionicons name="close" size={24} color={tc.text} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={LANGUAGES}
                                    keyExtractor={(item) => item.code}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.modalItem, { borderBottomColor: tc.border }, settings.language === item.code && { backgroundColor: tc.purple + '08' }]}
                                            onPress={() => handleLanguageSelect(item.code)}
                                        >
                                            <View>
                                                <Text style={[styles.modalItemTitle, { color: tc.text }, settings.language === item.code && { color: tc.purple, fontWeight: '700' }]}>
                                                    {item.label}
                                                </Text>
                                                <Text style={[styles.modalItemSubtitle, { color: tc.textTertiary }]}>{item.native}</Text>
                                            </View>
                                            {settings.language === item.code && (
                                                <Ionicons name="checkmark-circle" size={24} color={tc.purple} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>
                </ScrollView>
            </View>
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
}> = ({ title, subtitle, titleColor, icon, iconBg, iconColor, rightComponent }) => {
    const { colors: tc } = useTheme();
    return (
        <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.rowLeft}>
                <Text style={[styles.rowTitle, { color: titleColor || tc.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.rowSubtitle, { color: tc.textSecondary }]}>{subtitle}</Text>}
            </View>
            {rightComponent && <View style={styles.rowRight}>{rightComponent}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
    },
    headerFixedContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: TAB_BAR_SAFE_PADDING,
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
    nameEditInput: {
        ...typography.body,
        fontSize: 14,
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 120,
        textAlign: 'right',
    },
});

export default SettingsScreen;
