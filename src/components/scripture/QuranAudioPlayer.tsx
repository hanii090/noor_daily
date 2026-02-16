import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, typography, spacing } from '../../theme';
import { Reciter } from '../../types';
import { useAppStore } from '../../store/appStore';
import quranAudioService, { RECITER_INFO } from '../../services/quranAudioService';

interface QuranAudioPlayerProps {
    surahNumber: number;
    totalVerses: number;
    onVerseHighlight?: (verseNumber: number) => void;
}

export const QuranAudioPlayer: React.FC<QuranAudioPlayerProps> = ({
    surahNumber,
    totalVerses,
    onVerseHighlight,
}) => {
    const { colors: tc, isDark } = useTheme();
    const { settings } = useAppStore();
    const reciter: Reciter = settings.reciter || 'alafasy';

    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentVerse, setCurrentVerse] = useState(1);
    const [positionMs, setPositionMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const [showReciterPicker, setShowReciterPicker] = useState(false);

    useEffect(() => {
        quranAudioService.init();
        quranAudioService.setCallback((status) => {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
            setIsLoaded(status.isLoaded);
            setCurrentVerse(status.currentVerse);
            setPositionMs(status.positionMs);
            setDurationMs(status.durationMs);

            if (status.isPlaying || status.isBuffering) {
                onVerseHighlight?.(status.currentVerse);
            }
        });

        return () => {
            quranAudioService.cleanup();
        };
    }, []);

    const handlePlayPause = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isPlaying) {
            await quranAudioService.pause();
        } else if (isLoaded) {
            await quranAudioService.resume();
        } else {
            await quranAudioService.playSurahFromVerse(reciter, surahNumber, 1, totalVerses);
        }
    }, [isPlaying, isLoaded, reciter, surahNumber, totalVerses]);

    const handleStop = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await quranAudioService.stop();
    }, []);

    const handleSkipBack = useCallback(async () => {
        if (currentVerse > 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await quranAudioService.skipToVerse(currentVerse - 1);
        }
    }, [currentVerse]);

    const handleSkipForward = useCallback(async () => {
        if (currentVerse < totalVerses) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await quranAudioService.skipToVerse(currentVerse + 1);
        }
    }, [currentVerse, totalVerses]);

    const handleReciterSelect = useCallback(async (r: Reciter) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { updateSettings } = useAppStore.getState();
        updateSettings({ reciter: r });
        setShowReciterPicker(false);
        if (isPlaying || isLoaded) {
            await quranAudioService.playSurahFromVerse(r, surahNumber, currentVerse, totalVerses);
        }
    }, [isPlaying, isLoaded, surahNumber, currentVerse, totalVerses]);

    const progress = durationMs > 0 ? positionMs / durationMs : 0;
    const reciterName = RECITER_INFO[reciter].name;

    return (
        <View style={[styles.container, { backgroundColor: tc.backgroundSecondary, borderColor: tc.border }]}>
            {/* Reciter Picker Dropdown */}
            {showReciterPicker && (
                <View style={[styles.reciterDropdown, { backgroundColor: tc.cream, borderColor: tc.border }]}>
                    {(Object.keys(RECITER_INFO) as Reciter[]).map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[
                                styles.reciterOption,
                                r === reciter && { backgroundColor: tc.teal + '15' },
                            ]}
                            onPress={() => handleReciterSelect(r)}
                        >
                            <Text style={[styles.reciterOptionName, { color: tc.text }]}>
                                {RECITER_INFO[r].name}
                            </Text>
                            <Text style={[styles.reciterOptionAr, { color: tc.textTertiary }]}>
                                {RECITER_INFO[r].nameAr}
                            </Text>
                            {r === reciter && <Ionicons name="checkmark-circle" size={18} color={tc.teal} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Reciter Label */}
            <TouchableOpacity
                style={styles.reciterRow}
                onPress={() => setShowReciterPicker(!showReciterPicker)}
                activeOpacity={0.7}
            >
                <Ionicons name="mic-outline" size={14} color={tc.textTertiary} />
                <Text style={[styles.reciterLabel, { color: tc.textTertiary }]} numberOfLines={1}>
                    {reciterName}
                </Text>
                <Ionicons name="chevron-down" size={12} color={tc.textTertiary} />
            </TouchableOpacity>

            {/* Controls Row */}
            <View style={styles.controlsRow}>
                <TouchableOpacity onPress={handleSkipBack} disabled={currentVerse <= 1} style={styles.controlBtn}>
                    <Ionicons name="play-skip-back" size={20} color={currentVerse > 1 ? tc.text : tc.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause} style={[styles.playBtn, { backgroundColor: tc.teal }]}>
                    {isBuffering ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSkipForward} disabled={currentVerse >= totalVerses} style={styles.controlBtn}>
                    <Ionicons name="play-skip-forward" size={20} color={currentVerse < totalVerses ? tc.text : tc.textTertiary} />
                </TouchableOpacity>

                {(isPlaying || isLoaded) && (
                    <TouchableOpacity onPress={handleStop} style={styles.controlBtn}>
                        <Ionicons name="stop-circle-outline" size={22} color={tc.coral} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Progress Bar + Verse Counter */}
            {(isPlaying || isLoaded || isBuffering) && (
                <View style={styles.progressSection}>
                    <View style={[styles.progressBarBg, { backgroundColor: tc.border }]}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: tc.teal }]} />
                    </View>
                    <Text style={[styles.verseCounter, { color: tc.textTertiary }]}>
                        Verse {currentVerse} / {totalVerses}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        gap: 6,
    },
    reciterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'center',
    },
    reciterLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    controlBtn: {
        padding: 6,
    },
    playBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressSection: {
        gap: 4,
    },
    progressBarBg: {
        height: 3,
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 1.5,
    },
    verseCounter: {
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    reciterDropdown: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 4,
    },
    reciterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    reciterOptionName: {
        ...typography.small,
        fontWeight: '600',
        flex: 1,
    },
    reciterOptionAr: {
        ...typography.small,
        fontSize: 11,
    },
});

export default QuranAudioPlayer;
