import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
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
    private player: AudioPlayer | null = null;
    private currentReciter: Reciter = 'alafasy';
    private currentSurah: number = 0;
    private currentVerse: number = 0;
    private versesToPlay: number[] = [];
    private verseIndex: number = 0;
    private callback: PlaybackCallback | null = null;
    private isAutoAdvancing: boolean = false;
    private statusInterval: ReturnType<typeof setInterval> | null = null;
    private lastPlaying: boolean = false;

    async init() {
        await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
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

    private async loadAndPlay(_reciter: Reciter, surah: number, verse: number) {
        this.stopPolling();

        const url = getVerseAudioUrl(_reciter, surah, verse);
        this.currentVerse = verse;

        try {
            if (this.player) {
                this.player.replace({ uri: url });
            } else {
                this.player = createAudioPlayer({ uri: url });
            }

            this.lastPlaying = false;
            this.player.play();
            this.startPolling();
        } catch {
            this.emitStatus(false, false, false, verse, 0, 0, false);
        }
    }

    private startPolling() {
        this.stopPolling();
        this.statusInterval = setInterval(() => {
            if (!this.player) return;

            const p = this.player;
            const playing = p.playing;
            const loaded = p.isLoaded;
            const buffering = p.isBuffering;
            const posMs = (p.currentTime ?? 0) * 1000;
            const durMs = (p.duration ?? 0) * 1000;

            // Detect playback finished: was playing, now not playing, loaded, and near end
            const didFinish = this.lastPlaying && !playing && loaded && durMs > 0 && posMs >= durMs - 200;
            this.lastPlaying = playing;

            this.emitStatus(
                playing,
                loaded,
                buffering,
                this.currentVerse,
                posMs,
                durMs,
                didFinish,
            );

            if (didFinish && this.isAutoAdvancing) {
                this.advanceToNextVerse();
            }
        }, 250);
    }

    private stopPolling() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }

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
        if (this.player) {
            this.player.pause();
        }
    }

    async resume() {
        if (this.player) {
            this.player.play();
        }
    }

    async stop() {
        this.isAutoAdvancing = false;
        this.versesToPlay = [];
        this.stopPolling();
        if (this.player) {
            this.player.remove();
            this.player = null;
        }
        this.emitStatus(false, false, false, this.currentVerse, 0, 0, false);
    }

    async seekTo(positionMs: number) {
        if (this.player) {
            await this.player.seekTo(positionMs / 1000);
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

    getCurrentVerse(): number {
        return this.currentVerse;
    }

    async cleanup() {
        this.callback = null;
        this.isAutoAdvancing = false;
        this.stopPolling();
        if (this.player) {
            this.player.remove();
            this.player = null;
        }
    }
}

export default new QuranAudioService();
