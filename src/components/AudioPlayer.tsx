import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ClubhouseCard } from './clubhouse';
import { colors, typography, spacing } from '../theme';
import { Verse } from '../types';
import audioService from '../services/audioService';
import { useAppStore } from '../store/appStore';

interface AudioPlayerProps {
    verse: Verse;
    moodColor?: string;
    variant?: 'full' | 'compact';
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
    verse, 
    moodColor = colors.purple,
    variant = 'full'
}) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const { settings } = useAppStore();

    // Load audio when verse changes
    useEffect(() => {
        loadAudio();
        return () => {
            cleanup();
        };
    }, [verse.id]);

    const loadAudio = async () => {
        setIsLoading(true);
        try {
            const reciterEdition = settings.reciter || 'ar.alafasy';
            const loadedSound = await audioService.loadAudio(
                verse.surahNumber,
                verse.verseNumber,
                reciterEdition
            );

            if (loadedSound) {
                setSound(loadedSound);

                // Set up playback status update
                loadedSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        setIsPlaying(status.isPlaying);
                        setDuration(status.durationMillis || 0);
                        setProgress(status.positionMillis || 0);

                        // Auto-stop when finished
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            setProgress(0);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading audio:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayPause = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!sound) {
            await loadAudio();
            return;
        }

        try {
            if (isPlaying) {
                await audioService.pauseAudio(sound);
            } else {
                await audioService.playAudio(sound);
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
        }
    };

    const cleanup = async () => {
        if (sound) {
            await audioService.stopAudio(sound);
            setSound(null);
            setIsPlaying(false);
            setProgress(0);
        }
    };

    const getReciterName = () => {
        const reciterEdition = settings.reciter || 'ar.alafasy';
        const reciters = audioService.getReciters();
        const reciter = reciters.find((r) => r.edition === reciterEdition);
        return reciter?.name || 'Mishary Alafasy';
    };

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    if (variant === 'compact') {
        return (
            <TouchableOpacity 
                onPress={handlePlayPause} 
                style={styles.compactButton}
                activeOpacity={0.7}
            >
                {isLoading ? (
                    <ActivityIndicator color={moodColor} size="small" />
                ) : (
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={24}
                        color={isPlaying ? moodColor : colors.textTertiary}
                    />
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <ClubhouseCard style={styles.card}>
                <View style={styles.content}>
                    {/* Play/Pause Button */}
                    <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                        {isLoading ? (
                            <ActivityIndicator color={moodColor} size="small" />
                        ) : (
                            <Ionicons
                                name={isPlaying ? 'pause-circle' : 'play-circle'}
                                size={40}
                                color={moodColor}
                            />
                        )}
                    </TouchableOpacity>

                    {/* Reciter Info */}
                    <View style={styles.info}>
                        <Text style={styles.label}>Recitation</Text>
                        <Text style={styles.reciter}>{getReciterName()}</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${progressPercent}%`, backgroundColor: moodColor },
                            ]}
                        />
                    </View>
                </View>
            </ClubhouseCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 160, // Account for tab bar and change mood button
    },
    card: {
        padding: spacing.base,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
    },
    playButton: {
        padding: spacing.xs,
    },
    info: {
        flex: 1,
    },
    label: {
        ...typography.small,
        fontSize: 11,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reciter: {
        ...typography.body,
        fontSize: 15,
        color: colors.text,
        fontWeight: '600',
    },
    progressContainer: {
        marginTop: spacing.sm,
    },
    progressBackground: {
        height: 3,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    compactButton: {
        padding: spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
