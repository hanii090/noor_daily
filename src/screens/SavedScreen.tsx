import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    TextInput,
    Animated as RNAnimated,
    PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseBackground, ClubhouseCard, ClubhouseHeader } from '../components/clubhouse';
import { colors, useTheme, typography, spacing, TAB_BAR_SAFE_PADDING } from '../theme';
import { useAppStore } from '../store/appStore';
import { Verse, Hadith, GuidanceContent, ContentType, Mood } from '../types';
import { getTimeAgo } from '../utils/timeUtils';
import { GuidanceDetailModal } from '../components/VerseDetailModal';
import { useTranslation } from 'react-i18next';

// Swipe-to-delete row component
const SwipeableRow: React.FC<{ children: React.ReactNode; onDelete: () => void; onPress: () => void }> = ({ children, onDelete, onPress }) => {
    const translateX = useRef(new RNAnimated.Value(0)).current;
    const isSwiping = useRef(false);
    const THRESHOLD = -80;

    // Only show delete button when card is actually sliding
    const deleteOpacity = translateX.interpolate({
        inputRange: [-80, -5, 0],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
            onPanResponderGrant: () => {
                isSwiping.current = true;
            },
            onPanResponderMove: (_, gs) => {
                if (gs.dx < 0) {
                    translateX.setValue(Math.max(gs.dx, -120));
                }
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dx < THRESHOLD) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    RNAnimated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
                } else {
                    RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
                }
                setTimeout(() => { isSwiping.current = false; }, 50);
            },
            onPanResponderTerminate: () => {
                RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
                isSwiping.current = false;
            },
        })
    ).current;

    const currentTranslateX = useRef(0);

    // Track current value via listener instead of private API
    useEffect(() => {
        const id = translateX.addListener(({ value }) => {
            currentTranslateX.current = value;
        });
        return () => translateX.removeListener(id);
    }, [translateX]);

    const handlePress = () => {
        if (currentTranslateX.current < -10) {
            RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            return;
        }
        if (!isSwiping.current) {
            onPress();
        }
    };

    const handleDelete = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        RNAnimated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        onDelete();
    };

    return (
        <View style={{ overflow: 'hidden' }}>
            <RNAnimated.View
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, opacity: deleteOpacity, pointerEvents: 'box-none' }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleDelete}
                    style={{ flex: 1, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}
                >
                    <Ionicons name="trash" size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, marginTop: 2, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
            </RNAnimated.View>
            <RNAnimated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
                <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
                    {children}
                </TouchableOpacity>
            </RNAnimated.View>
        </View>
    );
};

const ItemSeparator = () => <View style={{ height: spacing.md }} />;

const SavedScreen = () => {
    const { colors: tc } = useTheme();
    const { t } = useTranslation();
    const { favoriteVerses, favoriteHadiths, removeFromFavorites, removeHadithFromFavorites } = useAppStore();
    const insets = useSafeAreaInsets();
    const [selectedContent, setSelectedContent] = useState<GuidanceContent | null>(null);
    const [selectedType, setSelectedType] = useState<ContentType>('verse');
    const [showDetail, setShowDetail] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'verse' | 'hadith'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest');

    const handleDelete = (item: GuidanceContent, type: ContentType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const title = type === 'verse' ? (item as Verse).surah : 'Hadith';
        const ref = type === 'verse' ? (item as Verse).verseNumber : (item as Hadith).reference;
        
        Alert.alert(
            t('saved.remove_title'),
            t('saved.remove_message', { title: `${title} ${ref}` }),
            [
                { text: t('saved.cancel'), style: 'cancel' },
                {
                    text: t('saved.remove'),
                    style: 'destructive',
                    onPress: () => {
                        if (type === 'verse') removeFromFavorites(item.id);
                        else removeHadithFromFavorites(item.id);
                    },
                },
            ]
        );
    };

    const handleItemPress = (item: GuidanceContent, type: ContentType) => {
        setSelectedContent(item);
        setSelectedType(type);
        setShowDetail(true);
    };

    const cycleSortBy = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSortBy(prev => prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'alpha' : 'newest');
    };

    const sortLabel = sortBy === 'newest' ? t('saved.sort_newest') : sortBy === 'oldest' ? t('saved.sort_oldest') : t('saved.sort_alpha');
    const sortIcon = sortBy === 'alpha' ? 'text-outline' : sortBy === 'oldest' ? 'arrow-up' : 'arrow-down';

    const filteredData = useMemo(() => {
        const verses = favoriteVerses.map(v => ({ ...v, _type: 'verse' as ContentType }));
        const hadiths = favoriteHadiths.map(h => ({ ...h, _type: 'hadith' as ContentType }));
        
        let data: any[];
        if (activeTab === 'verse') data = verses;
        else if (activeTab === 'hadith') data = hadiths;
        else data = [...verses, ...hadiths];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(item =>
                item.english?.toLowerCase().includes(q) ||
                item.arabic?.toLowerCase().includes(q) ||
                (item.surah && item.surah.toLowerCase().includes(q)) ||
                (item.reference && item.reference.toLowerCase().includes(q))
            );
        }

        // Sort
        if (sortBy === 'newest') {
            data.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        } else if (sortBy === 'oldest') {
            data.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
        } else {
            data.sort((a, b) => (a.english || '').localeCompare(b.english || ''));
        }

        return data;
    }, [favoriteVerses, favoriteHadiths, activeTab, searchQuery, sortBy]);

    const handleSwipeDelete = useCallback((item: any, type: ContentType) => {
        if (type === 'verse') removeFromFavorites(item.id);
        else removeHadithFromFavorites(item.id);
    }, [removeFromFavorites, removeHadithFromFavorites]);

    const keyExtractor = useCallback((item: any) => `${item._type}_${item.id}`, []);

    const renderItem = useCallback(({ item }: { item: any }) => {
        const type = item._type as ContentType;
        const mood = item.moods[0] as Mood | undefined;
        const moodColor = mood ? tc.moods[mood] : tc.purple;
        const timeAgoText = item.savedAt ? getTimeAgo(item.savedAt) : 'Added recently';
        const isVerse = type === 'verse';

        return (
            <SwipeableRow onDelete={() => handleSwipeDelete(item, type)} onPress={() => handleItemPress(item, type)}>
                <View style={styles.cardContainer}>
                    <ClubhouseCard backgroundColor={tc.backgroundSecondary} style={styles.card}>
                        <View style={styles.cardContent}>
                            <View style={styles.verseHeader}>
                                <View style={styles.headerLeft}>
                                    <Ionicons name={isVerse ? 'book' : 'business'} size={14} color={moodColor} />
                                    <View style={[styles.moodTag, { backgroundColor: moodColor + '15' }]}>
                                        <Text style={[styles.moodTagText, { color: moodColor }]}>
                                            {item.moods[0]?.toUpperCase() || 'DAILY'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.referenceText, { color: tc.textSecondary }]}>
                                    {isVerse ? `${item.surah} ${item.verseNumber}` : item.reference}
                                </Text>
                            </View>

                            <Text style={[styles.versePreview, { color: tc.text }]} numberOfLines={2}>
                                {item.english}
                            </Text>

                            <View style={styles.bottomRow}>
                                <Text style={[styles.timeText, { color: tc.textTertiary }]}>{timeAgoText}</Text>
                                <Ionicons name="heart" size={20} color={tc.coral} />
                            </View>
                        </View>
                    </ClubhouseCard>
                </View>
            </SwipeableRow>
        );
    }, [tc, handleSwipeDelete, handleItemPress]);

    const emptyFadeAnim = useRef(new RNAnimated.Value(0)).current;
    const emptySlideAnim = useRef(new RNAnimated.Value(20)).current;

    useEffect(() => {
        if (filteredData.length === 0) {
            emptyFadeAnim.setValue(0);
            emptySlideAnim.setValue(20);
            RNAnimated.parallel([
                RNAnimated.timing(emptyFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                RNAnimated.spring(emptySlideAnim, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
            ]).start();
        }
    }, [filteredData.length]);

    const renderEmpty = () => (
        <RNAnimated.View style={[styles.emptyContainer, { opacity: emptyFadeAnim, transform: [{ translateY: emptySlideAnim }] }]}>
            <Ionicons name="bookmark-outline" size={60} color={tc.textTertiary} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>{t('saved.empty_verses')}</Text>
            <Text style={[styles.emptyText, { color: tc.textSecondary }]}>
                {t('saved.empty_desc')}
            </Text>
        </RNAnimated.View>
    );

    return (
        <ClubhouseBackground color="creamLight">
            <View style={styles.container}>
                {/* Fixed Glass Header */}
                <View style={styles.headerFixedContainer}>
                    <ClubhouseHeader 
                        title={t('saved.title')} 
                        subtitle={t('saved.items_saved', { count: favoriteVerses.length + favoriteHadiths.length })}
                    />
                </View>

                <View style={{ flex: 1, paddingTop: insets.top + 80 }}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}> 
                        <Ionicons name="search" size={18} color={tc.textTertiary} />
                        <TextInput
                            style={[styles.searchInput, { color: tc.text }]}
                            placeholder={t('saved.search_placeholder')}
                            placeholderTextColor={tc.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={tc.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Tabs + Sort */}
                <View style={styles.tabContainer}>
                    {[
                        { id: 'all', label: t('saved.all'), icon: 'apps-outline' },
                        { id: 'verse', label: t('saved.verses'), icon: 'book-outline' },
                        { id: 'hadith', label: t('saved.hadiths'), icon: 'business-outline' }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, { backgroundColor: tc.backgroundSecondary }, activeTab === tab.id && { backgroundColor: tc.purple }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveTab(tab.id as any);
                            }}
                        >
                            <Ionicons 
                                name={tab.icon as any} 
                                size={16} 
                                color={activeTab === tab.id ? tc.white : tc.textSecondary} 
                            />
                            <Text style={[styles.tabText, { color: tc.textSecondary }, activeTab === tab.id && { color: tc.white }]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.sortButton, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}
                        onPress={cycleSortBy}
                    >
                        <Ionicons name={sortIcon as any} size={14} color={tc.textSecondary} />
                        <Text style={[styles.sortText, { color: tc.textSecondary }]}>{sortLabel}</Text>
                    </TouchableOpacity>
                </View>

                {/* Content List */}
                <FlatList<any>
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.list}
                    ItemSeparatorComponent={ItemSeparator}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                />
                </View>
            </View>

            {/* Detail Modal */}
            <GuidanceDetailModal
                visible={showDetail}
                content={selectedContent}
                type={selectedType}
                onClose={() => setShowDetail(false)}
            />
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
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: TAB_BAR_SAFE_PADDING,
    },
    cardContainer: {
        marginBottom: 0,
    },
    card: {
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.base,
    },
    cardContent: {
        gap: spacing.xs,
    },
    moodTag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    moodTagText: {
        ...typography.caption,
        fontSize: 10,
        fontWeight: '700',
    },
    referenceText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    verseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.backgroundSecondary,
        gap: 6,
    },
    tabText: {
        ...typography.caption,
        fontWeight: '600',
    },
    versePreview: {
        ...typography.body,
        fontSize: 15,
        lineHeight: 20,
        color: colors.text,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    timeText: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textTertiary,
    },
    heartButton: {
        padding: 4,
    },
    separator: {
        height: spacing.md,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxxl,
    },
    emptyTitle: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.base,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...typography.body,
        fontSize: 15,
        paddingVertical: 2,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
        marginLeft: 'auto',
    },
    sortText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
    },
});

export default SavedScreen;
