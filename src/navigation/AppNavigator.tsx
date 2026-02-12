import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import CheckInScreen from '../screens/CheckInScreen';
import TipsScreen from '../screens/TipsScreen';
import BreathingScreen from '../screens/BreathingScreen';
import JournalScreen from '../screens/JournalScreen';
import HydrationScreen from '../screens/HydrationScreen';
import WeeklyReportScreen from '../screens/WeeklyReportScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} />
        <Stack.Screen name="Tips" component={TipsScreen} />
        <Stack.Screen name="Breathing" component={BreathingScreen} />
        <Stack.Screen name="Journal" component={JournalScreen} />
        <Stack.Screen name="Hydration" component={HydrationScreen} />
        <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
