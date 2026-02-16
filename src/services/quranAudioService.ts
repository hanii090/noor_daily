import { Audio, AVPlaybackStatus } from 'expo-av';
import { Reciter } from '../types';

// ── Reciter CDN Configurations ──
// Uses everyayah.com which hosts verse-by-verse audio for many reciters
const RECITER_PATHS: Record<Reciter, string> = {
    alafasy: 'Alafasy_128kbps',
    abdulbasit: 'Abdul_Basit_Murattal_192kbps',
    hussary: 'Husary_128kbps',
};

export const RECITER_INFO: Record<Reciter, { name: string; nameAr: string }> = {
    alafasy: { name: 'Mishary Rashid Alafasy', nameAr: 'مشاري راشد العفاسي' },
    abdulbasit: { name: 'Abdul Basit Abdul Samad', nameAr: 'عبد الباسط عبد الصمد' },
    hussary: { name: 'Mahmoud Khalil Al-Hussary', nameAr: 'محمود خليل الحصري' },
};

function getVerseAudioUrl(reciter: Reciter, surah: number, verse: number): string {
    const s = String(surah).padStart(3, '0');
    const v = String(verse).padStart(3, '0');
    return `https://everyayah.com/data/${RECITER_PATHS[reciter]}/${s}${v}.mp3`;
}

type PlaybackCallback = (status: {
    isPlaying: boolean;
    isLoaded: boolean;
    isBuffering: boolean;
    currentVerse: number;
    positionMs: number;
    durationMs: number;
    didJustFinish: boolean;
}) => void;

class QuranAudioService {
    private sound: Audio.Sound | null = null;
    private currentReciter: Reciter = 'alafasy';
    private currentSurah: number = 0;
    private currentVerse: number = 0;
    private versesToPlay: number[] = [];
    private verseIndex: number = 0;
    private callback: PlaybackCallback | null = null;
    private isAutoAdvancing: boolean = false;

    async init() {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
        });
    }

    setCallback(cb: PlaybackCallback | null) {
        this.callback = cb;
    }

    async playVerse(reciter: Reciter, surah: number, verse: number) {
        this.currentReciter = reciter;
        this.currentSurah = surah;
        this.currentVerse = verse;
        this.isAutoAdvancing = false;

        await this.loadAndPlay(reciter, surah, verse);
    }

    async playSurahFromVerse(reciter: Reciter, surah: number, startVerse: number, totalVerses: number) {
        this.currentReciter = reciter;
        this.currentSurah = surah;
        this.versesToPlay = [];
        for (let v = startVerse; v <= totalVerses; v++) {
            this.versesToPlay.push(v);
        }
        this.verseIndex = 0;
        this.currentVerse = startVerse;
        this.isAutoAdvancing = true;

        await this.loadAndPlay(reciter, surah, startVerse);
    }

    private async loadAndPlay(reciter: Reciter, surah: number, verse: number) {
        await this.unloadCurrent();

        const url = getVerseAudioUrl(reciter, surah, verse);
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true },
                this.onPlaybackStatusUpdate
            );
            this.sound = sound;
            this.currentVerse = verse;
        } catch (err) {
            this.emitStatus(false, false, false, verse, 0, 0, false);
        }
    }

    private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
            this.emitStatus(false, false, status.isLoaded, this.currentVerse, 0, 0, false);
            return;
        }

        const didFinish = status.didJustFinish ?? false;

        this.emitStatus(
            status.isPlaying,
            true,
            status.isBuffering,
            this.currentVerse,
            status.positionMillis ?? 0,
            status.durationMillis ?? 0,
            didFinish,
        );

        if (didFinish && this.isAutoAdvancing) {
            this.advanceToNextVerse();
        }
    };

    private async advanceToNextVerse() {
        this.verseIndex += 1;
        if (this.verseIndex < this.versesToPlay.length) {
            const nextVerse = this.versesToPlay[this.verseIndex];
            await this.loadAndPlay(this.currentReciter, this.currentSurah, nextVerse);
        } else {
            // Finished all verses
            this.isAutoAdvancing = false;
            this.emitStatus(false, false, false, this.currentVerse, 0, 0, true);
        }
    }

    private emitStatus(
        isPlaying: boolean,
        isLoaded: boolean,
        isBuffering: boolean,
        currentVerse: number,
        positionMs: number,
        durationMs: number,
        didJustFinish: boolean,
    ) {
        this.callback?.({
            isPlaying,
            isLoaded,
            isBuffering,
            currentVerse,
            positionMs,
            durationMs,
            didJustFinish,
        });
    }

    async pause() {
        if (this.sound) {
            await this.sound.pauseAsync();
        }
    }

    async resume() {
        if (this.sound) {
            await this.sound.playAsync();
        }
    }

    async stop() {
        this.isAutoAdvancing = false;
        this.versesToPlay = [];
        await this.unloadCurrent();
        this.emitStatus(false, false, false, this.currentVerse, 0, 0, false);
    }

    async seekTo(positionMs: number) {
        if (this.sound) {
            await this.sound.setPositionAsync(positionMs);
        }
    }

    async skipToVerse(verse: number) {
        if (this.isAutoAdvancing) {
            const idx = this.versesToPlay.indexOf(verse);
            if (idx !== -1) {
                this.verseIndex = idx;
            }
        }
        await this.loadAndPlay(this.currentReciter, this.currentSurah, verse);
    }

    private async unloadCurrent() {
        if (this.sound) {
            try {
                await this.sound.unloadAsync();
            } catch {
                // Already unloaded
            }
            this.sound = null;
        }
    }

    getCurrentVerse(): number {
        return this.currentVerse;
    }

    async cleanup() {
        this.callback = null;
        this.isAutoAdvancing = false;
        await this.unloadCurrent();
    }
}

export default new QuranAudioService();
