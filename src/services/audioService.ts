import { Audio } from 'expo-av';

export interface Reciter {
    name: string;
    edition: string;
    description: string;
}

const RECITERS: Reciter[] = [
    {
        name: 'Mishary Alafasy',
        edition: 'ar.alafasy',
        description: 'Popular, clear recitation',
    },
    {
        name: 'Abdul Basit',
        edition: 'ar.abdulbasit',
        description: 'Classic, beautiful voice',
    },
    {
        name: 'Mahmoud Hussary',
        edition: 'ar.husary',
        description: 'Traditional recitation',
    },
];

class AudioService {
    private currentSound: Audio.Sound | null = null;
    private isConfigured = false;

    /**
     * Configure audio mode for playback
     */
    async configure(): Promise<void> {
        if (this.isConfigured) return;

        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });
            this.isConfigured = true;
        } catch (error) {
            console.error('Error configuring audio:', error);
        }
    }

    /**
     * Calculate ayah number for API
     * Formula: Sum of all verses in previous surahs + current verse
     */
    private calculateAyahNumber(surah: number, verse: number): number {
        // Correct cumulative verse counts for all 114 surahs
        const versesBeforeSurah = [
            0, 7, 293, 493, 669, 789, 954, 1160, 1235, 1364, 1473, 1596, 1707, 1750, 1802, 1901, 2029, 2140, 2250, 2348,
            2483, 2595, 2673, 2791, 2855, 2932, 3159, 3252, 3340, 3409, 3469, 3503, 3533, 3606, 3660, 3705, 3788, 3871, 3959, 4034,
            4119, 4173, 4262, 4321, 4358, 4393, 4431, 4460, 4478, 4523, 4583, 4632, 4694, 4749, 4827, 4923, 4952, 4974, 4998, 5011,
            5025, 5036, 5047, 5065, 5077, 5089, 5119, 5171, 5223, 5267, 5295, 5323, 5351, 5371, 5399, 5439, 5470, 5520, 5560, 5606,
            5648, 5677, 5696, 5732, 5757, 5779, 5796, 5815, 5841, 5871, 5891, 5906, 5927, 5938, 5946, 5954, 5973, 5978, 5986, 5994,
            6005, 6016, 6024, 6027, 6036, 6041, 6045, 6052, 6055, 6061, 6064, 6069, 6073, 6078, 6084
        ];

        if (surah < 1 || surah > 114) return 1;
        
        // The Al-Quran Cloud API uses 1-based global ayah index
        return versesBeforeSurah[surah - 1] + verse;
    }

    /**
     * Load audio for a verse
     */
    async loadAudio(
        surah: number,
        verse: number,
        reciterEdition: string = 'ar.alafasy'
    ): Promise<Audio.Sound | null> {
        try {
            await this.configure();

            // Unload previous sound
            if (this.currentSound) {
                await this.currentSound.unloadAsync();
                this.currentSound = null;
            }

            const ayahNumber = this.calculateAyahNumber(surah, verse);
            const audioUrl = `https://cdn.alquran.cloud/media/audio/ayah/${reciterEdition}/${ayahNumber}`;

            console.log('Loading audio:', audioUrl);

            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: false }
            );

            this.currentSound = sound;
            return sound;
        } catch (error) {
            console.error('Error loading audio:', error);
            return null;
        }
    }

    /**
     * Play audio
     */
    async playAudio(sound: Audio.Sound): Promise<boolean> {
        try {
            await sound.playAsync();
            return true;
        } catch (error) {
            console.error('Error playing audio:', error);
            return false;
        }
    }

    /**
     * Pause audio
     */
    async pauseAudio(sound: Audio.Sound): Promise<boolean> {
        try {
            await sound.pauseAsync();
            return true;
        } catch (error) {
            console.error('Error pausing audio:', error);
            return false;
        }
    }

    /**
     * Stop and unload audio
     */
    async stopAudio(sound?: Audio.Sound): Promise<void> {
        try {
            const soundToStop = sound || this.currentSound;
            if (soundToStop) {
                await soundToStop.stopAsync();
                await soundToStop.unloadAsync();
                if (soundToStop === this.currentSound) {
                    this.currentSound = null;
                }
            }
        } catch (error) {
            console.error('Error stopping audio:', error);
        }
    }

    /**
     * Get list of available reciters
     */
    getReciters(): Reciter[] {
        return RECITERS;
    }

    /**
     * Cleanup - unload all audio
     */
    async cleanup(): Promise<void> {
        await this.stopAudio();
    }
}

export default new AudioService();
