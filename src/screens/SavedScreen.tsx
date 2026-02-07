import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ClubhouseBackground, ClubhouseCard, ClubhouseHeader } from '../components/clubhouse';
import { colors, typography, spacing } from '../theme';
import { useAppStore } from '../store/appStore';
import { Verse, Hadith, GuidanceContent, ContentType, Mood } from '../types';
import { getTimeAgo } from '../utils/timeUtils';
import { GuidanceDetailModal } from '../components/VerseDetailModal';

const SavedScreen = () => {
    const { favoriteVerses, favoriteHadiths, removeFromFavorites, removeHadithFromFavorites } = useAppStore();
    const insets = useSafeAreaInsets();
    const [selectedContent, setSelectedContent] = useState<GuidanceContent | null>(null);
    const [selectedType, setSelectedType] = useState<ContentType>('verse');
    const [showDetail, setShowDetail] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'verse' | 'hadith'>('all');

    const handleDelete = (item: GuidanceContent, type: ContentType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const title = type === 'verse' ? (item as Verse).surah : 'Hadith';
        const ref = type === 'verse' ? (item as Verse).verseNumber : (item as Hadith).reference;
        
        Alert.alert(
            'Remove from Saved',
            `Remove "${title} ${ref}" from saved?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
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

    const getFilteredData = () => {
        const verses = favoriteVerses.map(v => ({ ...v, _type: 'verse' as ContentType }));
        const hadiths = favoriteHadiths.map(h => ({ ...h, _type: 'hadith' as ContentType }));
        
        if (activeTab === 'verse') return verses;
        if (activeTab === 'hadith') return hadiths;
        
        // Merge and sort by savedAt
        return [...verses, ...hadiths].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    };

    const renderItem = ({ item }: { item: any }) => {
        const type = item._type as ContentType;
        const mood = item.moods[0] as Mood | undefined;
        const moodColor = mood ? colors.moods[mood] : colors.purple;
        const timeAgoText = item.savedAt ? getTimeAgo(item.savedAt) : 'Added recently';
        const isVerse = type === 'verse';

        return (
            <TouchableOpacity
                style={styles.cardContainer}
                activeOpacity={0.7}
                onPress={() => handleItemPress(item, type)}
            >
                <ClubhouseCard backgroundColor={colors.backgroundSecondary} style={styles.card}>
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
                            <Text style={styles.referenceText}>
                                {isVerse ? `${item.surah} ${item.verseNumber}` : item.reference}
                            </Text>
                        </View>

                        <Text style={styles.versePreview} numberOfLines={2}>
                            {item.english}
                        </Text>

                        <View style={styles.bottomRow}>
                            <Text style={styles.timeText}>{timeAgoText}</Text>
                            <TouchableOpacity onPress={() => handleDelete(item, type)} style={styles.heartButton}>
                                <Ionicons name="heart" size={20} color={colors.coral} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ClubhouseCard>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={60} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No saved verses yet</Text>
            <Text style={styles.emptyText}>
                Bookmark verses you love to save them here
            </Text>
        </View>
    );

    return (
        <ClubhouseBackground color="creamLight">
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <ClubhouseHeader 
                    title="Saved Guidance" 
                    subtitle={`${favoriteVerses.length + favoriteHadiths.length} ITEMS SAVED`}
                />

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    {[
                        { id: 'all', label: 'All', icon: 'apps-outline' },
                        { id: 'verse', label: 'Verses', icon: 'book-outline' },
                        { id: 'hadith', label: 'Hadiths', icon: 'business-outline' }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveTab(tab.id as any);
                            }}
                        >
                            <Ionicons 
                                name={tab.icon as any} 
                                size={16} 
                                color={activeTab === tab.id ? colors.white : colors.textSecondary} 
                            />
                            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Content List */}
                <FlatList
                    data={getFilteredData()}
                    renderItem={renderItem}
                    keyExtractor={(item) => `${item._type}_${item.id}`}
                    contentContainerStyle={styles.list}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                />
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
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 160, // Clear floating tab bar
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
    activeTab: {
        backgroundColor: colors.purple,
    },
    tabText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.white,
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
});

export default SavedScreen;
