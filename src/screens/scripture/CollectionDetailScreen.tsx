import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';
import { ScriptureCollection, Verse } from '../../types';
import { useAppStore } from '../../store/appStore';
import reminderApiService from '../../services/reminderApiService';
import analyticsService from '../../services/analyticsService';
import { useTranslation } from 'react-i18next';

interface CollectionDetailProps {
    collection: ScriptureCollection;
    onOpenReader: (surahNumber: number, verseNumber: number) => void;
    onClose: () => void;
}

interface CollectionVerse {
    surah: number;
    verse: number;
    note?: string;
    arabic: string;
    english: string;
    surahName: string;
}

export const CollectionDetailScreen: React.FC<CollectionDetailProps> = ({
    collection,
    onOpenReader,
    onClose,
}) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [verses, setVerses] = useState<CollectionVerse[]>([]);
    const [loading, setLoading] = useState(true);

    const {
        favoriteVerses,
        addToFavorites,
        removeFromFavorites,
    } = useAppStore();

    const favoriteIds = React.useMemo(
        () => new Set(favoriteVerses.map((v) => v.id)),
        [favoriteVerses]
    );

    useEffect(() => {
        loadVerses();
        analyticsService.logCollectionViewed(collection.id);
    }, [collection.id]);

    const loadVerses = async () => {
        try {
            setLoading(true);
            const chapters = await reminderApiService.getChapterList();
            const chapterMap = new Map(chapters.map((c) => [c.number, c.english || c.name]));

            const results = await Promise.allSettled(
                collection.verses.map(async (ref) => {
                    const apiVerse = await reminderApiService.getVerse(ref.surah, ref.verse);
                    return {
                        surah: ref.surah,
                        verse: ref.verse,
                        note: ref.note,
                        arabic: apiVerse.arabic,
                        english: apiVerse.text,
                        surahName: chapterMap.get(ref.surah) || `Surah ${ref.surah}`,
                    } as CollectionVerse;
                })
            );

            const loaded = results
                .filter((r): r is PromiseFulfilledResult<CollectionVerse> => r.status === 'fulfilled')
                .map((r) => r.value);

            setVerses(loaded);
        } catch {
            // Will show empty
        } finally {
            setLoading(false);
        }
    };

    const handleBookmark = useCallback(async (item: CollectionVerse) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const verseId = `${item.surah}:${item.verse}`;

        if (favoriteIds.has(verseId)) {
            await removeFromFavorites(verseId);
        } else {
            const verseObj: Verse = {
                id: verseId,
                surah: item.surahName,
                surahNumber: item.surah,
                verseNumber: item.verse,
                arabic: item.arabic,
                english: item.english,
                moods: [],
                theme: '',
            };
            await addToFavorites(verseObj);
        }
    }, [favoriteIds, addToFavorites, removeFromFavorites]);

    const accentMap: Record<string, string> = { green: tc.green, purple: tc.purple, coral: tc.coral, orange: tc.orange, teal: tc.teal };
    const accentColor = accentMap[collection.color] || tc.teal;

    const renderVerse = useCallback(({ item }: { item: CollectionVerse }) => {
        const verseId = `${item.surah}:${item.verse}`;
        const isFav = favoriteIds.has(verseId);

        return (
            <View style={[styles.verseCard, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
                {item.note && (
                    <Text style={[styles.noteText, { color: accentColor }]}>
                        {item.note}
                    </Text>
                )}

                <Text style={[styles.arabicText, { color: tc.text }]}>
                    {item.arabic}
                </Text>

                <Text style={[styles.englishText, { color: tc.textSecondary }]}>
                    {item.english}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: tc.border }]}>
                    <TouchableOpacity
                        style={styles.refBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onOpenReader(item.surah, item.verse);
                        }}
                    >
                        <Ionicons name="book-outline" size={14} color={tc.textTertiary} />
                        <Text style={[styles.refText, { color: tc.textTertiary }]}>
                            {item.surahName} {item.surah}:{item.verse}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleBookmark(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isFav ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color={isFav ? tc.orange : tc.textTertiary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, [favoriteIds, handleBookmark, tc, accentColor, onOpenReader]);

    const keyExtractor = useCallback((item: CollectionVerse) => `${item.surah}_${item.verse}`, []);

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
                        <Text style={[styles.headerTitle, { color: tc.text }]}>
                            {collection.icon} {t(collection.nameKey, { defaultValue: collection.nameKey })}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: tc.textTertiary }]}>
                            {collection.verses.length} {t('scripture.verses', { defaultValue: 'verses' })}
                        </Text>
                    </View>

                    <View style={styles.headerRight} />
                </BlurView>
            </View>

            {/* Description */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={[styles.loadingText, { color: tc.textSecondary }]}>
                        {t('scripture.loading_collection', { defaultValue: 'Loading verses...' })}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={verses}
                    renderItem={renderVerse}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{
                        paddingTop: insets.top + 70,
                        paddingBottom: insets.bottom + 40,
                        paddingHorizontal: spacing.base,
                    }}
                    ListHeaderComponent={
                        <View style={styles.descContainer}>
                            <Text style={[styles.descText, { color: tc.textSecondary }]}>
                                {t(collection.descKey, { defaultValue: collection.descKey })}
                            </Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                />
            )}
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
    headerTitle: {
        ...typography.h3,
        fontSize: 17,
        fontWeight: '700',
    },
    headerSubtitle: {
        ...typography.caption,
        fontSize: 11,
    },
    headerRight: {
        width: 40,
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
    descContainer: {
        paddingVertical: spacing.base,
    },
    descText: {
        ...typography.body,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    verseCard: {
        borderRadius: 16,
        padding: spacing.base,
        borderWidth: 1,
    },
    noteText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginBottom: spacing.xs,
    },
    arabicText: {
        fontFamily: 'Amiri',
        fontSize: 22,
        lineHeight: 38,
        textAlign: 'right',
        writingDirection: 'rtl',
        marginBottom: spacing.sm,
    },
    englishText: {
        ...typography.body,
        fontSize: 14,
        lineHeight: 22,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 0.5,
    },
    refBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    refText: {
        ...typography.caption,
        fontSize: 12,
    },
});

export default CollectionDetailScreen;
