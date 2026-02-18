import React, { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { useAuth } from '../lib/AuthContext';
import { setActiveUserId, setActiveDEKFromAuth } from '../utils/storage';
import { pullCloudToLocal, migrateLocalToCloud } from '../lib/syncEngine';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import CheckInScreen from '../screens/CheckInScreen';
import TipsScreen from '../screens/TipsScreen';
import BreathingScreen from '../screens/BreathingScreen';
import JournalScreen from '../screens/JournalScreen';
import HydrationScreen from '../screens/HydrationScreen';
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MoodHistoryScreen from '../screens/MoodHistoryScreen';
import GratitudeScreen from '../screens/GratitudeScreen';
import SleepScreen from '../screens/SleepScreen';
import ShareStreakScreen from '../screens/ShareStreakScreen';
import WellnessJourneyScreen from '../screens/WellnessJourneyScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import EveningReflectionScreen from '../screens/EveningReflectionScreen';
import MyJourneyScreen from '../screens/MyJourneyScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, loading, isGuest, dek } = useAuth();

  // Sync user ID + DEK to storage layer
  useEffect(() => {
    if (user) {
      setActiveUserId(user.id);
      setActiveDEKFromAuth(dek);
      // On login, pull cloud data then migrate any local data
      pullCloudToLocal(user.id).then(() => {
        migrateLocalToCloud(user.id).catch(() => {});
      }).catch(() => {});
    } else {
      setActiveUserId(null);
      setActiveDEKFromAuth(null);
    }
  }, [user, dek]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF9EE', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#B8963E" />
      </View>
    );
  }

  const isAuthenticated = !!user || isGuest;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: { duration: 350 },
            },
            close: {
              animation: 'timing',
              config: { duration: 300 },
            },
          },
          gestureEnabled: Platform.OS !== 'web',
          cardStyle: { backgroundColor: '#FAF8F3' },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
            }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
              }}
            />
            <Stack.Screen name="CheckIn" component={CheckInScreen} />
            <Stack.Screen name="Tips" component={TipsScreen} />
            <Stack.Screen name="Breathing" component={BreathingScreen} />
            <Stack.Screen name="Journal" component={JournalScreen} />
            <Stack.Screen name="Hydration" component={HydrationScreen} />
            <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="MoodHistory" component={MoodHistoryScreen} />
            <Stack.Screen name="Gratitude" component={GratitudeScreen} />
            <Stack.Screen name="Sleep" component={SleepScreen} />
            <Stack.Screen name="ShareStreak" component={ShareStreakScreen} />
            <Stack.Screen name="WellnessJourney" component={WellnessJourneyScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="EveningReflection" component={EveningReflectionScreen} />
            <Stack.Screen name="MyJourney" component={MyJourneyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
