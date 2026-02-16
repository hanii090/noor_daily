import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing } from '../../theme';
import { SurahInfo } from '../../types';
import scriptureService from '../../services/scriptureService';
import { JUZ_BOUNDARIES, getJuzForVerse } from '../../data/juzData';
import { useTranslation } from 'react-i18next';

interface SurahListProps {
    onSelectSurah: (surah: SurahInfo) => void;
    onClose: () => void;
}

const SurahRow = React.memo(({
    surah,
    onPress,
    tc,
}: {
    surah: SurahInfo;
    onPress: () => void;
    tc: any;
}) => (
    <TouchableOpacity
        style={[styles.surahRow, { borderBottomColor: tc.border }]}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`${surah.english}, ${surah.verseCount} verses`}
    >
        <View style={[styles.surahNumberCircle, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
            <Text style={[styles.surahNumber, { color: tc.textSecondary }]}>{surah.number}</Text>
        </View>

        <View style={styles.surahInfo}>
            <Text style={[styles.surahEnglish, { color: tc.text }]}>{surah.english}</Text>
            <Text style={[styles.surahMeta, { color: tc.textTertiary }]}>
                {surah.verseCount} verses · {surah.revelationType === 'meccan' ? 'Meccan' : 'Medinan'}
            </Text>
        </View>

        <Text style={[styles.surahArabic, { color: tc.text }]}>{surah.name}</Text>
    </TouchableOpacity>
));

export const SurahListScreen: React.FC<SurahListProps> = ({ onSelectSurah, onClose }) => {
    const { colors: tc, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [surahs, setSurahs] = useState<SurahInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [groupByJuz, setGroupByJuz] = useState(false);

    useEffect(() => {
        loadSurahs();
    }, []);

    const loadSurahs = async () => {
        try {
            setLoading(true);
            const list = await scriptureService.getSurahList();
            setSurahs(list);
        } catch {
            // Will show empty state
        } finally {
            setLoading(false);
        }
    };

    const filteredSurahs = useMemo(() => {
        if (!searchQuery.trim()) return surahs;
        const q = searchQuery.toLowerCase();
        return surahs.filter(
            (s) =>
                s.english.toLowerCase().includes(q) ||
                s.name.includes(searchQuery) ||
                String(s.number) === q
        );
    }, [surahs, searchQuery]);

    // Map surah numbers to which Juz they start
    const juzStartSurahs = useMemo(() => {
        const map = new Set<number>();
        JUZ_BOUNDARIES.forEach((b) => {
            if (b.verse === 1) map.add(b.surah);
        });
        return map;
    }, []);

    const getJuzForSurah = useCallback((surahNumber: number): number => {
        return getJuzForVerse(surahNumber, 1);
    }, []);

    const handleSelect = useCallback((surah: SurahInfo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectSurah(surah);
    }, [onSelectSurah]);

    const renderSurah = useCallback(({ item }: { item: SurahInfo }) => {
        const showJuzHeader = groupByJuz && !searchQuery && juzStartSurahs.has(item.number);
        const juzNum = showJuzHeader ? getJuzForSurah(item.number) : null;
        return (
            <>
                {juzNum !== null && (
                    <View style={[styles.juzSectionHeader, { backgroundColor: tc.backgroundSecondary, borderBottomColor: tc.border }]}>
                        <Ionicons name="layers-outline" size={14} color={tc.purple} />
                        <Text style={[styles.juzSectionText, { color: tc.purple }]}>Juz {juzNum}</Text>
                    </View>
                )}
                <SurahRow surah={item} onPress={() => handleSelect(item)} tc={tc} />
            </>
        );
    }, [handleSelect, tc, groupByJuz, searchQuery, juzStartSurahs, getJuzForSurah]);

    const keyExtractor = useCallback((item: SurahInfo) => String(item.number), []);

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
                            {t('scripture.all_surahs', { defaultValue: 'All Surahs' })}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: tc.textTertiary }]}>
                            114 {t('scripture.chapters', { defaultValue: 'chapters' })}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGroupByJuz(!groupByJuz); }}
                        style={styles.headerRight}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name={groupByJuz ? 'list' : 'layers-outline'} size={20} color={groupByJuz ? tc.purple : tc.text} />
                    </TouchableOpacity>
                </BlurView>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { paddingTop: insets.top + 64 }]}>
                <View style={[styles.searchBar, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
                    <Ionicons name="search" size={16} color={tc.textTertiary} />
                    <TextInput
                        style={[styles.searchInput, { color: tc.text }]}
                        placeholder={t('scripture.search_surahs', { defaultValue: 'Search surahs...' })}
                        placeholderTextColor={tc.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={tc.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredSurahs}
                renderItem={renderSurah}
                keyExtractor={keyExtractor}
                contentContainerStyle={{
                    paddingTop: insets.top + 120,
                    paddingBottom: insets.bottom + 40,
                }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                getItemLayout={(_, index) => ({
                    length: 72,
                    offset: 72 * index,
                    index,
                })}
            />
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
    searchContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99,
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        ...typography.body,
        fontSize: 15,
        paddingVertical: 0,
    },
    surahRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
        height: 72,
        borderBottomWidth: 0.5,
    },
    surahNumberCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    surahNumber: {
        fontSize: 13,
        fontWeight: '700',
    },
    surahInfo: {
        flex: 1,
        paddingHorizontal: spacing.sm,
    },
    surahEnglish: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '600',
    },
    surahMeta: {
        ...typography.caption,
        fontSize: 12,
        marginTop: 2,
    },
    surahArabic: {
        fontFamily: 'Amiri',
        fontSize: 20,
        lineHeight: 28,
    },
    juzSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5,
    },
    juzSectionText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default SurahListScreen;
