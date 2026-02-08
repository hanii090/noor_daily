import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform, Share } from 'react-native';
import { Verse, Hadith } from '../types';

class ShareService {
    /**
     * Capture guidance card component as image
     */
    async captureCard(viewRef: any): Promise<string | null> {
        try {
            const uri = await captureRef(viewRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });
            return uri;
        } catch (error) {
            console.error('Error capturing card:', error);
            Alert.alert('Error', 'Failed to generate image. Please try again.');
            return null;
        }
    }

    /**
     * Alias for captureCard to maintain backward compatibility and specific requirements
     */
    async captureVerseCard(viewRef: any): Promise<string | null> {
        return this.captureCard(viewRef);
    }

    async captureHadithCard(viewRef: any): Promise<string | null> {
        return this.captureCard(viewRef);
    }

    /**
     * Share guidance image using native share sheet
     */
    async shareImage(imageUri: string, title: string = 'Share'): Promise<boolean> {
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device.');
                return false;
            }

            await Sharing.shareAsync(imageUri, {
                mimeType: 'image/png',
                dialogTitle: title,
                UTI: 'public.png',
            });

            return true;
        } catch (error) {
            console.error('Error sharing image:', error);
            Alert.alert('Error', 'Failed to share image. Please try again.');
            return false;
        }
    }

    /**
     * Alias for shareImage
     */
    async shareVerseImage(imageUri: string): Promise<boolean> {
        return this.shareImage(imageUri, 'Share Verse');
    }

    async shareHadithImage(imageUri: string): Promise<boolean> {
        return this.shareImage(imageUri, 'Share Hadith');
    }

    /**
     * Save verse image to device gallery
     */
    async saveToGallery(imageUri: string): Promise<boolean> {
        try {
            // Request permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'We need access to your photo library to save images.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                // On iOS, user needs to manually go to settings
                                if (Platform.OS === 'ios') {
                                    Alert.alert(
                                        'Open Settings',
                                        'Please go to Settings > Noor Daily > Photos and enable access.'
                                    );
                                }
                            },
                        },
                    ]
                );
                return false;
            }

            // Save to media library
            const asset = await MediaLibrary.createAssetAsync(imageUri);
            await MediaLibrary.createAlbumAsync('Noor Daily', asset, false);

            Alert.alert('Success', 'Verse card saved to your photos!');
            return true;
        } catch (error) {
            console.error('Error saving to gallery:', error);
            Alert.alert('Error', 'Failed to save image. Please try again.');
            return false;
        }
    }

    /**
     * Share verse as plain text using React Native Share API
     */
    async shareAsText(verse: Verse): Promise<boolean> {
        try {
            const text = `${verse.arabic}\n\n"${verse.english}"\n\n— Surah ${verse.surah}, Verse ${verse.verseNumber}\n\nShared from Noor Daily 🌙`;

            await Share.share({
                message: text,
                title: `${verse.surah} ${verse.verseNumber}`,
            });

            return true;
        } catch (error) {
            console.error('Error sharing text:', error);
            // User cancelled share
            if ((error as any).message === 'User did not share') {
                return false;
            }
            Alert.alert('Error', 'Failed to share verse. Please try again.');
            return false;
        }
    }

    /**
     * Share hadith as plain text
     */
    async shareHadithAsText(hadith: Hadith): Promise<boolean> {
        try {
            const text = `Prophet Muhammad ﷺ said:\n\n"${hadith.english}"\n\nNarrator: ${hadith.narrator}\nReference: ${hadith.reference}\n\nShared via Noor Daily 🌙`;

            await Share.share({
                message: text,
                title: `Hadith from ${hadith.collection}`,
            });

            return true;
        } catch (error) {
            console.error('Error sharing hadith text:', error);
            return false;
        }
    }

    /**
     * Delete temporary image file
     */
    async cleanupTempFile(uri: string): Promise<void> {
        try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (_e) {
            // Non-critical: OS may have already cleaned up the temp file
        }
    }
}

export default new ShareService();
