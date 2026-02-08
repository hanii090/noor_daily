import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppStore } from '../store/appStore';
import { ClubhouseTabBar } from './ClubhouseTabBar';

// Import screens
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import JourneyScreen from '../screens/JourneyScreen';
import SavedScreen from '../screens/SavedScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <ClubhouseTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Journey" component={JourneyScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Saved" component={SavedScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

export const AppNavigator = () => {
    const onboardingCompleted = useAppStore((state) => state.onboardingCompleted);
    const { colors } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.creamLight },
            }}
        >
            {!onboardingCompleted ? (
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : (
                <Stack.Screen name="MainTabs" component={MainTabs} />
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
