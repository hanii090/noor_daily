
import { Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import historyService from './historyService';
import examService from './examService';
import { useAppStore } from '../store/appStore';
import i18n from '../i18n/config';

class DataService {
    /**
     * Export all user data as a JSON file
     */
    async exportUserData(): Promise<void> {
        try {
            // 1. Gather all data
            const history = await historyService.getAllHistory();
            const exams = await examService.getExamHistory();
            const settings = useAppStore.getState().settings;
            const favorites = {
                verses: useAppStore.getState().favoriteVerses,
                hadiths: useAppStore.getState().favoriteHadiths,
            };

            const exportData = {
                exportedAt: new Date().toISOString(),
                appVersion: '1.0.0', // TODO: Get from Constants
                settings,
                favorites,
                history,
                exams,
            };

            // 2. Create file
            const json = JSON.stringify(exportData, null, 2);
            const fileName = `noor-daily-export-${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, json, {
                encoding: 'utf8',
            });

            // 3. Share file
            if (await DataService.isSharingAvailable()) {
                await Share.share({
                    url: filePath,
                    title: 'Noor Daily Data Export',
                    message: 'Here is your data export from Noor Daily.',
                });
            } else {
                Alert.alert('Export Error', 'Sharing is not available on this device.');
            }

        } catch (error) {
            console.error('Data export failed:', error);
            Alert.alert('Export Failed', 'An error occurred while exporting your data.');
        }
    }

    private static async isSharingAvailable(): Promise<boolean> {
        // Share.share is generally available, but check valid constraints?
        // Actually Share.share creates a dialog.
        return true;
    }
}

export default new DataService();
