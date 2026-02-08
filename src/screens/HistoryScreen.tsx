import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { ClubhouseBackground, ClubhouseCard, ClubhouseHeader } from '../components/clubhouse';
import { colors, useTheme, typography, spacing, TAB_BAR_SAFE_PADDING } from '../theme';
import { useAppStore } from '../store/appStore';
import { Verse, Hadith, Mood, ContentType, GuidanceContent } from '../types';
import historyService, { HistoryDay, HistoryEntry } from '../services/historyService';
import { GuidanceDetailModal } from '../components/VerseDetailModal';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const HistoryScreen = () => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const { verseHistory, loadHistory, historyStats } = useAppStore();
    const insets = useSafeAreaInsets();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDay, setSelectedDay] = useState<HistoryDay | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        const day = verseHistory.find(h => h.date === selectedDate);
        setSelectedDay(day || null);
    }, [selectedDate, verseHistory]);

    const markedDates = useMemo(() => {
        const marked: any = {};
        
        verseHistory.forEach(day => {
            const hasVerse = day.entries.some(e => e.type === 'verse');
            const hasHadith = day.entries.some(e => e.type === 'hadith');
            
            let dotColor: string = tc.purple; // Default/Both
            if (hasVerse && !hasHadith) dotColor = tc.moods.peace; // Verse: green
            if (!hasVerse && hasHadith) dotColor = tc.moods.grateful; // Hadith: orange

            marked[day.date] = {
                marked: true,
                dotColor: dotColor,
                selected: day.date === selectedDate,
                selectedColor: day.date === selectedDate ? tc.purple + '20' : undefined,
                selectedTextColor: tc.text,
            };
        });

        if (!marked[selectedDate]) {
            marked[selectedDate] = {
                selected: true,
                selectedColor: tc.purple + '20',
                selectedTextColor: tc.text,
            };
        }

        return marked;
    }, [verseHistory, selectedDate, tc]);

    const handleDayPress = useCallback((day: any) => {
        setSelectedDate(day.dateString);
    }, []);

    const handleEntryPress = useCallback((entry: HistoryEntry) => {
        setSelectedEntry(entry);
        setShowDetail(true);
    }, []);

    const getMoodLabel = useCallback((mood: Mood) => {
        return t(`mood.${mood}`, { defaultValue: mood.charAt(0).toUpperCase() + mood.slice(1) });
    }, [t]);

    const getMoodIcon = useCallback((mood: Mood): keyof typeof Ionicons.glyphMap => {
        const icons: Record<Mood, keyof typeof Ionicons.glyphMap> = {
            grateful: 'heart',
            peace: 'leaf',
            strength: 'shield',
            guidance: 'navigate-circle',
            celebrating: 'sparkles',
            anxious: 'pulse',
            sad: 'rainy',
            hopeful: 'sunny',
        };
        return icons[mood] || 'help-circle';
    }, []);

    return (
        <ClubhouseBackground color="creamLight">
            <View style={styles.container}>
                {/* Fixed Glass Header */}
                <View style={styles.headerFixedContainer}>
                    <ClubhouseHeader 
                        title={t('history.stats_title')} 
                        subtitle={t('history.subtitle')} 
                    />
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={[
                        styles.contentContainer,
                        { paddingTop: insets.top + 80 }
                    ]}
                >

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <ClubhouseCard style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Text style={[styles.statValue, { color: tc.text }]}>{historyStats?.currentStreak || 0}</Text>
                            <View style={[styles.statIconBadge, { backgroundColor: tc.moods.grateful + '15' }]}>
                                <Ionicons name="flame" size={14} color={tc.moods.grateful} />
                            </View>
                        </View>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>{t('history.current_streak').toUpperCase()}</Text>
                    </ClubhouseCard>
                    <ClubhouseCard style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Text style={[styles.statValue, { color: tc.text }]}>{historyStats?.totalDays || 0}</Text>
                            <View style={[styles.statIconBadge, { backgroundColor: tc.moods.peace + '15' }]}>
                                <Ionicons name="calendar" size={14} color={tc.moods.peace} />
                            </View>
                        </View>
                        <Text style={[styles.statLabel, { color: tc.textSecondary }]}>{t('history.total_days').toUpperCase()}</Text>
                    </ClubhouseCard>
                </View>

                {/* Calendar */}
                <ClubhouseCard style={styles.calendarCard}>
                    <Calendar
                        key={isDark ? 'dark' : 'light'}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: tc.textSecondary,
                            selectedDayBackgroundColor: tc.purple,
                            selectedDayTextColor: tc.white,
                            todayTextColor: tc.purple,
                            dayTextColor: tc.text,
                            textDisabledColor: tc.textTertiary,
                            dotColor: tc.purple,
                            selectedDotColor: tc.white,
                            arrowColor: tc.purple,
                            monthTextColor: tc.text,
                            indicatorColor: tc.purple,
                            textDayFontFamily: 'Inter_400Regular',
                            textMonthFontFamily: 'Inter_600SemiBold',
                            textDayHeaderFontFamily: 'Inter_500Medium',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12,
                        }}
                        markedDates={markedDates}
                        onDayPress={handleDayPress}
                        enableSwipeMonths={true}
                    />
                </ClubhouseCard>

                {/* Selected Date Entries */}
                <View style={styles.selectedVerseContainer}>
                    <Text style={[styles.sectionTitle, { color: tc.text }]}>
                        {selectedDate === new Date().toISOString().split('T')[0] 
                            ? t('history.todays_activity', { defaultValue: "Today's Guidance" })
                            : `${t('history.guidance_for', { defaultValue: 'Guidance for' })} ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </Text>

                    {selectedDay && selectedDay.entries.length > 0 ? (
                        selectedDay.entries.map((entry, index) => {
                            const isVerse = entry.type === 'verse';
                            const content = entry.content;
                            const moodColor = entry.mood ? tc.moods[entry.mood] : tc.purple;

                            return (
                                <TouchableOpacity 
                                    key={index}
                                    activeOpacity={0.8} 
                                    onPress={() => handleEntryPress(entry)}
                                    style={styles.entryWrapper}
                                >
                                    <ClubhouseCard style={styles.verseCard}>
                                        <View style={styles.verseHeader}>
                                            <View style={styles.headerLeft}>
                                                <Ionicons name={isVerse ? 'book' : 'business'} size={14} color={moodColor} />
                                                <View style={[
                                                    styles.moodTag, 
                                                    { backgroundColor: moodColor + '15' }
                                                ]}>
                                                    <Text style={[
                                                        styles.moodTagText,
                                                        { color: moodColor }
                                                    ]}>
                                                        {entry.mood ? getMoodLabel(entry.mood) : 'Daily Guidance'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.verseReference, { color: tc.textSecondary }]}>
                                                {isVerse 
                                                    ? `${(content as Verse).surah} ${(content as Verse).verseNumber}` 
                                                    : (content as Hadith).reference}
                                            </Text>
                                        </View>
                                        <Text style={[styles.verseText, { color: tc.text }]} numberOfLines={3}>
                                            {content.english}
                                        </Text>
                                        <View style={[styles.verseFooter, { borderTopColor: tc.border + '50' }]}>
                                            <Text style={[styles.readMore, { color: tc.textTertiary }]}>{t('history.tap_to_read', { defaultValue: 'Tap to read full content' })}</Text>
                                            <Ionicons name="chevron-forward" size={14} color={tc.textTertiary} />
                                        </View>
                                    </ClubhouseCard>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={[styles.emptyVerseContainer, { backgroundColor: tc.white + '50', borderColor: tc.border + '50' }]}>
                            <Ionicons name="journal-outline" size={40} color={tc.textTertiary} />
                            <Text style={[styles.emptyVerseText, { color: tc.textTertiary }]}>{t('history.no_activity')}</Text>
                        </View>
                    )}
                </View>

                {/* Mood Insights */}
                {historyStats && Object.keys(historyStats.moodCounts).length > 0 && (
                    <View style={styles.insightsContainer}>
                        <Text style={[styles.sectionTitle, { color: tc.text }]}>{t('history.mood_insights')}</Text>
                        <ClubhouseCard style={styles.insightsCard}>
                            {Object.entries(historyStats.moodCounts)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .map(([mood, count]) => (
                                    <View key={mood} style={styles.moodInsightRow}>
                                        <View style={styles.moodInsightLeft}>
                                            <View style={[
                                                styles.moodIconSmall, 
                                                { backgroundColor: tc.moods[mood as Mood] + '15' }
                                            ]}>
                                                <Ionicons 
                                                    name={getMoodIcon(mood as Mood)} 
                                                    size={14} 
                                                    color={tc.moods[mood as Mood]} 
                                                />
                                            </View>
                                            <Text style={[styles.moodInsightLabel, { color: tc.text }]}>{getMoodLabel(mood as Mood)}</Text>
                                        </View>
                                        <View style={styles.moodInsightRight}>
                                            <View style={[styles.moodBarContainer, { backgroundColor: tc.border + '30' }]}>
                                                <View style={[
                                                    styles.moodBar, 
                                                    { 
                                                        width: `${(count / historyStats.totalDays) * 100}%`,
                                                        backgroundColor: tc.moods[mood as Mood]
                                                    }
                                                ]} />
                                            </View>
                                            <Text style={[styles.moodInsightCount, { color: tc.textSecondary }]}>{count}</Text>
                                        </View>
                                    </View>
                                ))}
                        </ClubhouseCard>
                    </View>
                )}
                </ScrollView>

                {/* Detail Modal */}
                <GuidanceDetailModal
                    visible={showDetail}
                    content={selectedEntry?.content || null}
                    type={selectedEntry?.type || 'verse'}
                    onClose={() => setShowDetail(false)}
                />
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
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: TAB_BAR_SAFE_PADDING,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        padding: spacing.md,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statValue: {
        ...typography.h2,
        fontSize: 24,
        fontWeight: '700',
        color: colors.black,
    },
    statLabel: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: -2,
    },
    statIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarCard: {
        marginHorizontal: spacing.lg,
        padding: spacing.sm,
        marginBottom: spacing.xl,
    },
    selectedVerseContainer: {
        paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
        ...typography.title,
        fontSize: 18,
        fontWeight: '700',
        color: colors.black,
        marginBottom: spacing.md,
    },
    verseCard: {
        padding: spacing.lg,
    },
    verseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    entryWrapper: {
        marginBottom: spacing.md,
    },
    moodTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    moodTagText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '700',
    },
    verseReference: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    verseText: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 22,
        color: colors.text,
        marginBottom: spacing.md,
    },
    verseFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.border + '50',
        paddingTop: spacing.sm,
    },
    readMore: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textTertiary,
    },
    emptyVerseContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.white + '50',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border + '50',
        borderStyle: 'dashed',
    },
    emptyVerseText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },
    insightsContainer: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
    },
    insightsCard: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    moodInsightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    moodInsightLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        width: 110,
    },
    moodIconSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moodInsightLabel: {
        ...typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    moodInsightRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    moodBarContainer: {
        flex: 1,
        height: 6,
        backgroundColor: colors.border + '30',
        borderRadius: 3,
        overflow: 'hidden',
    },
    moodBar: {
        height: '100%',
        borderRadius: 3,
    },
    moodInsightCount: {
        ...typography.caption,
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        width: 20,
        textAlign: 'right',
    },
});

export default HistoryScreen;
