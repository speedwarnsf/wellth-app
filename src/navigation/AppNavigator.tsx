import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import CheckInScreen from '../screens/CheckInScreen';
import TipsScreen from '../screens/TipsScreen';
import BreathingScreen from '../screens/BreathingScreen';
import JournalScreen from '../screens/JournalScreen';
import HydrationScreen from '../screens/HydrationScreen';
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MoodHistoryScreen from '../screens/MoodHistoryScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
