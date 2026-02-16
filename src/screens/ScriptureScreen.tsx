import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseBackground } from '../components/clubhouse';
import { useTheme, typography, spacing, TAB_BAR_SAFE_PADDING } from '../theme';
import { SurahInfo, ScriptureCollection } from '../types';
import { useAppStore } from '../store/appStore';
import scriptureService from '../services/scriptureService';
import analyticsService from '../services/analyticsService';
import { useTranslation } from 'react-i18next';

import { SurahListScreen } from './scripture/SurahListScreen';
import { ChapterReaderScreen } from './scripture/ChapterReaderScreen';
import { CollectionDetailScreen } from './scripture/CollectionDetailScreen';
import { ReadingPlanScreen } from './scripture/ReadingPlanScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLLECTION_GAP = spacing.sm;
const COLLECTION_WIDTH = (SCREEN_WIDTH - spacing.base * 2 - COLLECTION_GAP) / 2;

const ScriptureScreen = () => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const {
        lastReadPosition,
        readingPlanProgress,
        loadLastRead,
        loadReadingPlanProgress,
    } = useAppStore();

    // Modal states
    const [showSurahList, setShowSurahList] = useState(false);
    const [showReader, setShowReader] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showReadingPlan, setShowReadingPlan] = useState(false);

    const [readerSurah, setReaderSurah] = useState(1);
    const [readerVerse, setReaderVerse] = useState<number | undefined>();
    const [readerSurahInfo, setReaderSurahInfo] = useState<SurahInfo | undefined>();
    const [activeCollection, setActiveCollection] = useState<ScriptureCollection | null>(null);

    const [surahNames, setSurahNames] = useState<Record<number, string>>({});
    const [surahVerseCounts, setSurahVerseCounts] = useState<Record<number, number>>({});

    const collections = scriptureService.getCollections();
    const activePlan = readingPlanProgress
        ? scriptureService.getReadingPlan(readingPlanProgress.planId)
        : null;

    useEffect(() => {
        loadLastRead();
        loadReadingPlanProgress();
        loadSurahNames();
        analyticsService.logScriptureOpened();
    }, []);

    const loadSurahNames = async () => {
        try {
            const list = await scriptureService.getSurahList();
            const map: Record<number, string> = {};
            const vcMap: Record<number, number> = {};
            list.forEach((s) => { map[s.number] = s.english; vcMap[s.number] = s.verseCount; });
            setSurahNames(map);
            setSurahVerseCounts(vcMap);
        } catch {
            // Non-critical
        }
    };

    const openReader = useCallback((surahNumber: number, verseNumber?: number, info?: SurahInfo) => {
        setReaderSurah(surahNumber);
        setReaderVerse(verseNumber);
        setReaderSurahInfo(info);
        setShowReader(true);
    }, []);

    const handleSurahSelect = useCallback((surah: SurahInfo) => {
        setShowSurahList(false);
        setTimeout(() => openReader(surah.number, undefined, surah), 300);
    }, [openReader]);

    const handleCollectionOpen = useCallback((collection: ScriptureCollection) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveCollection(collection);
        setShowCollection(true);
    }, []);

    const handleCollectionOpenReader = useCallback((surahNumber: number, verseNumber: number) => {
        setShowCollection(false);
        setTimeout(() => openReader(surahNumber, verseNumber), 300);
    }, [openReader]);

    const handlePlanOpenReader = useCallback((surahNumber: number, verseNumber: number) => {
        setShowReadingPlan(false);
        setTimeout(() => openReader(surahNumber, verseNumber), 300);
    }, [openReader]);

    const progressPercent = readingPlanProgress && activePlan
        ? Math.round((readingPlanProgress.completedDays.length / activePlan.totalDays) * 100)
        : 0;

    return (
        <ClubhouseBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.headerFixedContainer, { paddingTop: insets.top }]}>
                    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.headerBlur, { borderBottomColor: tc.border }]}>
                        <View style={styles.headerContent}>
                            <Text style={[styles.headerTitle, { color: tc.text }]}>
                                {t('scripture.title', { defaultValue: 'Scripture' })}
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: tc.textTertiary }]}>
                                {t('scripture.subtitle', { defaultValue: 'QURAN · COLLECTIONS · PLANS' })}
                            </Text>
                        </View>
                    </BlurView>
                </View>

                <ScrollView
                    contentContainerStyle={{
                        paddingTop: insets.top + 80,
                        paddingBottom: TAB_BAR_SAFE_PADDING,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                >
                    {/* Continue Reading Card */}
                    {lastReadPosition && (
                        <TouchableOpacity
                            style={[styles.continueCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                            onPress={() => openReader(lastReadPosition.surah, lastReadPosition.verse)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.continueIcon, { backgroundColor: tc.teal + '20' }]}>
                                <Ionicons name="book" size={20} color={tc.teal} />
                            </View>
                            <View style={styles.continueInfo}>
                                <Text style={[styles.continueLabel, { color: tc.textTertiary }]}>
                                    {t('scripture.continue_reading', { defaultValue: 'CONTINUE READING' })}
                                </Text>
                                <Text style={[styles.continueSurah, { color: tc.text }]}>
                                    {surahNames[lastReadPosition.surah] || `Surah ${lastReadPosition.surah}`}
                                </Text>
                                <Text style={[styles.continueVerse, { color: tc.textSecondary }]}>
                                    {t('scripture.verse', { defaultValue: 'Verse' })} {lastReadPosition.verse}
                                    {surahVerseCounts[lastReadPosition.surah] ? ` / ${surahVerseCounts[lastReadPosition.surah]}` : ''}
                                </Text>
                                {surahVerseCounts[lastReadPosition.surah] > 0 && (
                                    <View style={[styles.continueProgressBg, { backgroundColor: tc.border }]}>
                                        <View style={[
                                            styles.continueProgressFill,
                                            { width: `${Math.round((lastReadPosition.verse / surahVerseCounts[lastReadPosition.surah]) * 100)}%`, backgroundColor: tc.teal },
                                        ]} />
                                    </View>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                        </TouchableOpacity>
                    )}

                    {/* Reading Plan Card */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>
                                {t('scripture.reading_plans', { defaultValue: 'READING PLANS' })}
                            </Text>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReadingPlan(true); }}>
                                <Text style={[styles.seeAll, { color: tc.teal }]}>
                                    {t('scripture.see_all', { defaultValue: 'See All' })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {readingPlanProgress && activePlan && !readingPlanProgress.completedAt ? (
                            <TouchableOpacity
                                style={[styles.planActiveCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                                onPress={() => setShowReadingPlan(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.planActiveHeader}>
                                    <Text style={styles.planActiveIcon}>{activePlan.icon}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.planActiveName, { color: tc.text }]}>
                                            {t(activePlan.nameKey, { defaultValue: activePlan.nameKey })}
                                        </Text>
                                        <Text style={[styles.planActiveProgress, { color: tc.textSecondary }]}>
                                            {readingPlanProgress.completedDays.length} / {activePlan.totalDays} {t('scripture.days', { defaultValue: 'days' })}
                                        </Text>
                                    </View>
                                    <Text style={[styles.planActivePercent, { color: tc.teal }]}>{progressPercent}%</Text>
                                </View>
                                <View style={[styles.progressBarBg, { backgroundColor: tc.border }]}>
                                    <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: tc.teal }]} />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.planEmptyCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReadingPlan(true); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="calendar-outline" size={28} color={tc.teal} />
                                <Text style={[styles.planEmptyTitle, { color: tc.text }]}>
                                    {t('scripture.start_plan', { defaultValue: 'Start a Reading Plan' })}
                                </Text>
                                <Text style={[styles.planEmptyDesc, { color: tc.textSecondary }]}>
                                    {t('scripture.start_plan_desc', { defaultValue: 'Complete the Quran in 30, 60 days or at your own pace' })}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Collections */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: tc.textTertiary }]}>
                            {t('scripture.collections', { defaultValue: 'CURATED COLLECTIONS' })}
                        </Text>
                        <View style={styles.collectionsGrid}>
                            {collections.map((col) => {
                                const accentMap: Record<string, string> = { green: tc.green, purple: tc.purple, coral: tc.coral, orange: tc.orange, teal: tc.teal };
                                const accentColor = accentMap[col.color] || tc.teal;
                                return (
                                    <TouchableOpacity
                                        key={col.id}
                                        style={[styles.collectionCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                                        onPress={() => handleCollectionOpen(col)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.collectionIcon}>{col.icon}</Text>
                                        <Text style={[styles.collectionName, { color: tc.text }]} numberOfLines={2}>
                                            {t(col.nameKey, { defaultValue: col.nameKey })}
                                        </Text>
                                        <Text style={[styles.collectionCount, { color: tc.textTertiary }]}>
                                            {col.verses.length} {t('scripture.verses', { defaultValue: 'verses' })}
                                        </Text>
                                        <View style={[styles.collectionAccent, { backgroundColor: accentColor }]} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Browse All Surahs */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.browseBtn, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowSurahList(true); }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.browseIconCircle, { backgroundColor: tc.teal + '20' }]}>
                                <Ionicons name="library-outline" size={22} color={tc.teal} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.browseTitle, { color: tc.text }]}>
                                    {t('scripture.browse_quran', { defaultValue: 'Browse the Quran' })}
                                </Text>
                                <Text style={[styles.browseDesc, { color: tc.textSecondary }]}>
                                    {t('scripture.browse_desc', { defaultValue: 'All 114 surahs' })}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={tc.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Modals */}
                <Modal visible={showSurahList} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSurahList(false)}>
                    <SurahListScreen onSelectSurah={handleSurahSelect} onClose={() => setShowSurahList(false)} />
                </Modal>

                <Modal visible={showReader} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReader(false)}>
                    <ChapterReaderScreen
                        surahNumber={readerSurah}
                        surahInfo={readerSurahInfo}
                        initialVerse={readerVerse}
                        onClose={() => { setShowReader(false); loadLastRead(); }}
                    />
                </Modal>

                <Modal visible={showCollection && !!activeCollection} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCollection(false)}>
                    {activeCollection && (
                        <CollectionDetailScreen
                            collection={activeCollection}
                            onOpenReader={handleCollectionOpenReader}
                            onClose={() => setShowCollection(false)}
                        />
                    )}
                </Modal>

                <Modal visible={showReadingPlan} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReadingPlan(false)}>
                    <ReadingPlanScreen
                        onOpenReader={handlePlanOpenReader}
                        onClose={() => setShowReadingPlan(false)}
                    />
                </Modal>
            </View>
        </ClubhouseBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerFixedContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerBlur: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h2,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginTop: 2,
    },
    section: {
        paddingHorizontal: spacing.base,
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    seeAll: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: spacing.sm,
    },

    // Continue Reading
    continueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.base,
        marginBottom: spacing.lg,
        padding: spacing.base,
        borderRadius: 16,
        borderWidth: 1,
        gap: spacing.sm,
    },
    continueIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueInfo: {
        flex: 1,
    },
    continueLabel: {
        ...typography.caption,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    continueSurah: {
        ...typography.body,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 2,
    },
    continueVerse: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 1,
    },

    // Reading Plan cards
    planActiveCard: {
        borderRadius: 16,
        padding: spacing.base,
        borderWidth: 1,
    },
    planActiveHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    planActiveIcon: {
        fontSize: 24,
    },
    planActiveName: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '700',
    },
    planActiveProgress: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 1,
    },
    planActivePercent: {
        fontSize: 18,
        fontWeight: '800',
    },
    progressBarBg: {
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    planEmptyCard: {
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 1,
        alignItems: 'center',
        gap: spacing.xs,
    },
    planEmptyTitle: {
        ...typography.body,
        fontSize: 16,
        fontWeight: '700',
        marginTop: spacing.xs,
    },
    planEmptyDesc: {
        ...typography.caption,
        fontSize: 13,
        textAlign: 'center',
    },

    // Collections grid
    collectionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: COLLECTION_GAP,
    },
    collectionCard: {
        width: COLLECTION_WIDTH,
        borderRadius: 16,
        padding: spacing.base,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 110,
    },
    collectionIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    collectionName: {
        ...typography.body,
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
    },
    collectionCount: {
        ...typography.caption,
        fontSize: 11,
        marginTop: 4,
    },
    collectionAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
    },

    // Browse button
    browseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        borderRadius: 16,
        borderWidth: 1,
        gap: spacing.sm,
    },
    browseIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    browseTitle: {
        ...typography.body,
        fontSize: 16,
        fontWeight: '700',
    },
    browseDesc: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 1,
    },
    continueProgressBg: {
        height: 3,
        borderRadius: 1.5,
        overflow: 'hidden',
        marginTop: 6,
    },
    continueProgressFill: {
        height: '100%',
        borderRadius: 1.5,
    },
});

export default React.memo(ScriptureScreen);
