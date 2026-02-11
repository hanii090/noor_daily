import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import {
  Philosopher_400Regular,
  Philosopher_700Bold
} from '@expo-google-fonts/philosopher';
import { useAppStore } from './src/store/appStore';
import AppNavigator from './src/navigation/AppNavigator';
import { ClubhouseBackground } from './src/components/clubhouse';
import { useTheme } from './src/theme';
import { ErrorBoundary, OfflineBanner } from './src/components/common';
import * as Notifications from 'expo-notifications';
import notificationHandler from './src/services/notificationHandler';
import notificationService from './src/services/notificationService';

// MUST be set at module level (outside component) so it runs before any notification arrives
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.error('Failed to set notification handler:', error);
  // App will continue to work without notifications
}
import verseService from './src/services/verseService';
import userIdentityService from './src/services/userIdentityService';
import { runStorageMigration } from './src/utils/storageMigration';
import './src/i18n/config'; // Initialize i18n

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const { loadOnboardingStatus, loadFavorites, loadSettings, loadHistory, loadDailyInspiration, settings } = useAppStore();

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Philosopher_400Regular,
    Philosopher_700Bold,
  });

  useEffect(() => {
    async function init() {
      try {
        // Run storage key migration (v0 → v1)
        await runStorageMigration();

        // Initialize Supabase user identity (anonymous auth)
        try {
          await userIdentityService.initialize();
          __DEV__ && console.log('[App] Supabase user identity initialized');
        } catch (error) {
          console.warn('[App] Supabase initialization failed (non-critical):', error);
          // App continues to work, data will queue until connection is available
        }

        // Initialize notification handler
        notificationHandler.initialize();

        // Load app data
        await loadOnboardingStatus();
        await loadFavorites();
        await loadSettings();
        await loadHistory();
        await loadDailyInspiration();

        // Preload popular verses in background
        verseService.preloadPopularVerses().catch((err) => {
          console.warn('Verse preloading failed (non-critical):', err);
        });

        // After settings are loaded, check if notifications need to be rescheduled
        // This ensures notifications persist across app restarts
        const store = useAppStore.getState();
        if (store.settings.notificationsEnabled) {
          const hasPermission = await notificationService.areNotificationsEnabled();

          if (hasPermission) {
            const scheduled = await notificationService.getScheduledNotifications();
            // Reschedule if fewer than 7 notifications remain (proactive refresh)
            const guidanceNotifs = scheduled.filter(n => {
              const data = n.content.data as Record<string, any> | undefined;
              return !data?.type?.startsWith('journey_');
            });
            if (guidanceNotifs.length < 7) {
              await notificationService.scheduleRandomDailyNotifications(
                store.settings.notificationFrequency,
                store.settings.notificationContentType,
                {
                  start: store.settings.quietHoursStart,
                  end: store.settings.quietHoursEnd,
                },
                store.settings.weekendMode
              );
            }
          } else {
            // Permission was revoked, update settings to reflect this
            await store.updateSettings({ notificationsEnabled: false });
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    // Cleanup on unmount
    return () => {
      notificationHandler.cleanup();
    };
  }, []);

  // Wait for both fonts and data to load
  if (isLoading || !fontsLoaded) {
    return (
      <ClubhouseBackground>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </ClubhouseBackground>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Noor Daily encountered an error">
      <SafeAreaProvider>
        <NavigationContainer>
          <OfflineBanner />
          <AppNavigator />
          <StatusBar style={settings.darkMode ? "light" : "dark"} translucent />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
