import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';
import { ReminderApiVerse, ReminderApiChapter, SurahInfo, Verse } from '../../types';
import { useAppStore } from '../../store/appStore';
import scriptureService from '../../services/scriptureService';
import analyticsService from '../../services/analyticsService';
import { QuranAudioPlayer } from '../../components/scripture/QuranAudioPlayer';
import { getJuzStartsInSurah } from '../../data/juzData';
import { useTranslation } from 'react-i18next';

interface ChapterReaderProps {
    surahNumber: number;
    surahInfo?: SurahInfo;
    initialVerse?: number;
    onClose: () => void;
}

const VerseRow = React.memo(({
    verse,
    surahNumber,
    surahName,
    isFavorite,
    onBookmark,
    onShare,
    arabicSize,
    tc,
}: {
    verse: ReminderApiVerse;
    surahNumber: number;
    surahName: string;
    isFavorite: boolean;
    onBookmark: (verse: ReminderApiVerse) => void;
    onShare: (verse: ReminderApiVerse) => void;
    arabicSize: number;
    tc: any;
}) => {
    const [showWords, setShowWords] = useState(false);
    const hasWords = verse.words && verse.words.length > 0;

    return (
        <View style={[styles.verseRow, { borderBottomColor: tc.border }]}>
            <View style={styles.verseNumberContainer}>
                <View style={[styles.verseNumberCircle, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
                    <Text style={[styles.verseNumberText, { color: tc.textSecondary }]}>
                        {verse.number}
                    </Text>
                </View>
            </View>

            <View style={styles.verseContent}>
                <Text style={[styles.arabicText, { color: tc.text, fontSize: arabicSize, lineHeight: arabicSize * 1.75 }]}>
                    {verse.arabic}
                </Text>
                <Text style={[styles.englishText, { color: tc.textSecondary }]}>
                    {verse.text}
                </Text>

                {showWords && hasWords && (
                    <View style={[styles.wordByWordContainer, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
                        {verse.words!.map((w, i) => (
                            <View key={i} style={styles.wordItem}>
                                <Text style={[styles.wordArabic, { color: tc.text }]}>{w.arabic}</Text>
                                <Text style={[styles.wordTranslit, { color: tc.teal }]}>{w.transliteration}</Text>
                                <Text style={[styles.wordEnglish, { color: tc.textSecondary }]}>{w.english}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.verseActions}>
                    <Text style={[styles.verseRef, { color: tc.textTertiary }]}>
                        {surahNumber}:{verse.number}
                    </Text>
                    <View style={styles.verseActionBtns}>
                        {hasWords && (
                            <TouchableOpacity
                                onPress={() => setShowWords(!showWords)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityRole="button"
                                accessibilityLabel="Word by word translation"
                            >
                                <Ionicons name={showWords ? 'grid' : 'grid-outline'} size={17} color={showWords ? tc.teal : tc.textTertiary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => onShare(verse)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel="Share verse"
                        >
                            <Ionicons name="share-outline" size={17} color={tc.textTertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onBookmark(verse)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={isFavorite ? 'Remove bookmark' : 'Bookmark verse'}
                        >
                            <Ionicons
                                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                                size={18}
                                color={isFavorite ? tc.orange : tc.textTertiary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
});

export const ChapterReaderScreen: React.FC<ChapterReaderProps> = ({
    surahNumber,
    surahInfo,
    initialVerse,
    onClose,
}) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const [chapter, setChapter] = useState<ReminderApiChapter | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toastText, setToastText] = useState('');
    const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);
    const [showAudioPlayer, setShowAudioPlayer] = useState(false);
    const [arabicFontSize, setArabicFontSize] = useState(24);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const {
        favoriteVerses,
        addToFavorites,
        removeFromFavorites,
        updateLastRead,
    } = useAppStore();

    const favoriteIds = React.useMemo(
        () => new Set(favoriteVerses.map((v) => v.id)),
        [favoriteVerses]
    );

    useEffect(() => {
        loadChapter();
    }, [surahNumber]);

    const loadChapter = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await scriptureService.getChapter(surahNumber);
            setChapter(data);

            // Save last read position
            updateLastRead(surahNumber, initialVerse || 1);
            analyticsService.logSurahViewed(surahNumber);
        } catch (err) {
            setError(t('scripture.error_loading', { defaultValue: 'Unable to load chapter. Please check your connection.' }));
        } finally {
            setLoading(false);
        }
    };

    const showToast = useCallback((text: string) => {
        setToastText(text);
        toastOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(1200),
            Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [toastOpacity]);

    const handleBookmark = useCallback(async (verse: ReminderApiVerse) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const verseId = `${surahNumber}:${verse.number}`;
        const sName = chapter?.english || chapter?.name || `Surah ${surahNumber}`;

        if (favoriteIds.has(verseId)) {
            await removeFromFavorites(verseId);
            showToast(t('scripture.bookmark_removed', { defaultValue: 'Bookmark removed' }));
        } else {
            const verseObj: Verse = {
                id: verseId,
                surah: sName,
                surahNumber,
                verseNumber: verse.number,
                arabic: verse.arabic,
                english: verse.text,
                moods: [],
                theme: '',
            };
            await addToFavorites(verseObj);
            analyticsService.logVerseBookmarkedFromReader(surahNumber, verse.number);
            showToast(t('scripture.bookmark_added', { defaultValue: 'Bookmarked!' }));
        }
    }, [surahNumber, chapter, favoriteIds, addToFavorites, removeFromFavorites, showToast, t]);

    const handleShare = useCallback(async (verse: ReminderApiVerse) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const sName = chapter?.english || chapter?.name || `Surah ${surahNumber}`;
        const message = `${verse.arabic}\n\n"${verse.text}"\n\n— ${sName} (${surahNumber}:${verse.number})\n\nShared via Noor Daily`;
        try {
            await Share.share({ message });
        } catch { /* user cancelled */ }
    }, [surahNumber, chapter]);

    const handleScroll = useCallback((event: any) => {
        // Debounced last-read update on scroll
        const offsetY = event.nativeEvent.contentOffset.y;
        const itemHeight = 200; // approximate
        const visibleIndex = Math.floor(offsetY / itemHeight);
        if (chapter?.verses && visibleIndex >= 0 && visibleIndex < chapter.verses.length) {
            const visibleVerse = chapter.verses[visibleIndex];
            if (visibleVerse) {
                updateLastRead(surahNumber, visibleVerse.number);
            }
        }
    }, [chapter, surahNumber, updateLastRead]);

    const handleVerseHighlight = useCallback((verseNumber: number) => {
        setHighlightedVerse(verseNumber);
        if (flatListRef.current && chapter?.verses) {
            const idx = chapter.verses.findIndex((v) => v.number === verseNumber);
            if (idx >= 0) {
                flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
            }
        }
    }, [chapter]);

    const juzStarts = React.useMemo(() => {
        const starts = getJuzStartsInSurah(surahNumber);
        return new Map(starts.map((s) => [s.verse, s.juz]));
    }, [surahNumber]);

    const renderVerse = useCallback(({ item }: { item: ReminderApiVerse }) => {
        const verseId = `${surahNumber}:${item.number}`;
        const isHighlighted = highlightedVerse === item.number;
        const juzNumber = juzStarts.get(item.number);
        return (
            <>
                {juzNumber && (
                    <View style={[styles.juzMarker, { borderColor: tc.border }]}> 
                        <View style={[styles.juzBadge, { backgroundColor: tc.purple + '12' }]}>
                            <Ionicons name="layers-outline" size={12} color={tc.purple} />
                            <Text style={[styles.juzText, { color: tc.purple }]}>
                                Juz {juzNumber}
                            </Text>
                        </View>
                    </View>
                )}
                <View style={isHighlighted ? [styles.highlightedVerse, { backgroundColor: tc.teal + '12' }] : undefined}>
                    <VerseRow
                        verse={item}
                        surahNumber={surahNumber}
                        surahName={chapter?.english || chapter?.name || ''}
                        isFavorite={favoriteIds.has(verseId)}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        arabicSize={arabicFontSize}
                        tc={tc}
                    />
                </View>
            </>
        );
    }, [surahNumber, chapter, favoriteIds, handleBookmark, handleShare, tc, highlightedVerse, juzStarts, arabicFontSize]);

    const keyExtractor = useCallback((item: ReminderApiVerse) => `${surahNumber}_${item.number}`, [surahNumber]);

    const surahName = surahInfo?.english || chapter?.english || chapter?.name || `Surah ${surahNumber}`;
    const surahArabic = surahInfo?.name || chapter?.name || '';
    const verseCount = surahInfo?.verseCount || chapter?.verse_count || chapter?.verses?.length || 0;
    const showBismillah = surahNumber !== 9 && surahNumber !== 1;

    const getInitialIndex = () => {
        if (!initialVerse || !chapter?.verses) return undefined;
        const idx = chapter.verses.findIndex((v: ReminderApiVerse) => v.number === initialVerse);
        return idx > 0 ? idx : undefined;
    };

    return (
        <View style={[styles.container, { backgroundColor: tc.background }]}>
            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.headerBlur, { borderBottomColor: tc.border }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.headerBackBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="chevron-back" size={24} color={tc.text} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerArabic, { color: tc.text }]} numberOfLines={1}>
                            {surahArabic}
                        </Text>
                        <Text style={[styles.headerEnglish, { color: tc.textSecondary }]} numberOfLines={1}>
                            {surahName} · {verseCount} {t('scripture.verses', { defaultValue: 'verses' })}
                        </Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setArabicFontSize((s) => s >= 36 ? 18 : s + 3);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="text" size={18} color={tc.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAudioPlayer(!showAudioPlayer); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name={showAudioPlayer ? 'volume-high' : 'volume-high-outline'} size={20} color={showAudioPlayer ? tc.teal : tc.text} />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tc.teal} />
                    <Text style={[styles.loadingText, { color: tc.textSecondary }]}>
                        {t('scripture.loading_chapter', { defaultValue: 'Loading chapter...' })}
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color={tc.textTertiary} />
                    <Text style={[styles.errorText, { color: tc.textSecondary }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: tc.teal }]}
                        onPress={loadChapter}
                    >
                        <Text style={[styles.retryText, { color: '#fff' }]}>
                            {t('scripture.retry', { defaultValue: 'Try Again' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={chapter?.verses || []}
                    renderItem={renderVerse}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{
                        paddingTop: insets.top + 70,
                        paddingBottom: insets.bottom + (showAudioPlayer ? 160 : 40),
                    }}
                    ListHeaderComponent={
                        showBismillah ? (
                            <View style={styles.bismillahContainer}>
                                <Text style={[styles.bismillahText, { color: tc.text }]}>
                                    بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                                </Text>
                                <Text style={[styles.bismillahTranslation, { color: tc.textTertiary }]}>
                                    In the name of Allah, the Most Gracious, the Most Merciful
                                </Text>
                            </View>
                        ) : null
                    }
                    initialScrollIndex={getInitialIndex()}
                    getItemLayout={(_, index) => ({
                        length: 200,
                        offset: 200 * index + (showBismillah ? 100 : 0),
                        index,
                    })}
                    onScrollEndDrag={handleScroll}
                    onMomentumScrollEnd={handleScroll}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                />
            )}

            {/* Audio Player */}
            {showAudioPlayer && chapter && (
                <View style={[styles.audioPlayerContainer, { bottom: insets.bottom + 8 }]}>
                    <QuranAudioPlayer
                        surahNumber={surahNumber}
                        totalVerses={chapter.verses?.length || 0}
                        onVerseHighlight={handleVerseHighlight}
                    />
                </View>
            )}

            {/* Bookmark Toast */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.toast,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
                        bottom: insets.bottom + 24,
                        opacity: toastOpacity,
                        transform: [{
                            translateY: toastOpacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                            }),
                        }],
                    },
                ]}
            >
                <Ionicons name="bookmark" size={14} color={isDark ? '#000' : '#fff'} />
                <Text style={[styles.toastText, { color: isDark ? '#000' : '#fff' }]}>
                    {toastText}
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerArabic: {
        fontFamily: 'Amiri',
        fontSize: 20,
        lineHeight: 28,
    },
    headerEnglish: {
        ...typography.caption,
        fontSize: 11,
        letterSpacing: 0.3,
    },
    headerRight: {
        width: 40,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        width: 60,
        justifyContent: 'flex-end',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.base,
    },
    loadingText: {
        ...typography.body,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.base,
    },
    errorText: {
        ...typography.body,
        textAlign: 'center',
    },
    retryBtn: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        marginTop: spacing.sm,
    },
    retryText: {
        ...typography.caption,
        fontWeight: '700',
        fontSize: 14,
    },
    bismillahContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    bismillahText: {
        fontFamily: 'Amiri',
        fontSize: 28,
        lineHeight: 44,
        textAlign: 'center',
    },
    bismillahTranslation: {
        ...typography.caption,
        fontSize: 12,
        marginTop: spacing.xs,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    verseRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.lg,
        borderBottomWidth: 0.5,
    },
    verseNumberContainer: {
        width: 40,
        alignItems: 'center',
        paddingTop: 4,
    },
    verseNumberCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    verseNumberText: {
        fontSize: 12,
        fontWeight: '700',
    },
    verseContent: {
        flex: 1,
        paddingLeft: spacing.sm,
    },
    arabicText: {
        fontFamily: 'Amiri',
        fontSize: 24,
        lineHeight: 42,
        textAlign: 'right',
        writingDirection: 'rtl',
        marginBottom: spacing.sm,
    },
    englishText: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 24,
    },
    verseActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    verseActionBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    verseRef: {
        ...typography.caption,
        fontSize: 11,
        letterSpacing: 0.3,
    },
    toast: {
        position: 'absolute',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        zIndex: 200,
    },
    toastText: {
        fontSize: 13,
        fontWeight: '600',
    },
    highlightedVerse: {
        borderRadius: 8,
        marginHorizontal: -spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    audioPlayerContainer: {
        position: 'absolute',
        left: spacing.base,
        right: spacing.base,
        zIndex: 100,
    },
    juzMarker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.base,
        borderTopWidth: StyleSheet.hairlineWidth,
        marginTop: spacing.sm,
    },
    juzBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    juzText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    wordByWordContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: spacing.sm,
        padding: spacing.sm,
        borderRadius: 10,
        borderWidth: 1,
    },
    wordItem: {
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 4,
        minWidth: 50,
    },
    wordArabic: {
        fontFamily: 'Amiri',
        fontSize: 18,
        lineHeight: 28,
    },
    wordTranslit: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    wordEnglish: {
        fontSize: 9,
        marginTop: 1,
    },
});

export default ChapterReaderScreen;
