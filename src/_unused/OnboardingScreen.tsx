import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

const OnboardingScreen = ({ navigation }: any) => {
  const handleStart = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission not granted', 'You will not receive daily tips.');
    }
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Wellth</Text>
      <Text style={styles.subtitle}>Your daily tip for financial and personal well-being.</Text>
      <Button title="Start Your Journey" onPress={handleStart} />
      <View style={{ marginTop: 20 }}>
        <Button title="Populate Tips (First time only)" onPress={populateTips} />
      </View>
    </View>
  );
};

import { populateTips } from '../api/firestore';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
});

export default OnboardingScreen;
