import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const NAV_ITEMS = [
  { screen: 'Home', label: 'Home' },
  { screen: 'CheckIn', label: 'Check In' },
  { screen: 'Tips', label: 'Tips' },
  { screen: 'Journal', label: 'Journal' },
  { screen: 'Hydration', label: 'Water' },
  { screen: 'Breathing', label: 'Breathe' },
  { screen: 'Gratitude', label: 'Gratitude' },
  { screen: 'Sleep', label: 'Sleep' },
  { screen: 'WeeklyReport', label: 'Report' },
  { screen: 'MoodHistory', label: 'Mood' },
  { screen: 'Settings', label: 'Settings' },
];

interface QuickNavProps {
  navigation: any;
  currentScreen: string;
}

const QuickNav = ({ navigation, currentScreen }: QuickNavProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.row}>
        {NAV_ITEMS.filter(item => item.screen !== currentScreen).map(item => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => navigation.navigate(item.screen)}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 28, marginBottom: 8 },
  divider: {
    width: 30, height: 1, backgroundColor: '#D4B96A',
    alignSelf: 'center', marginBottom: 18, borderRadius: 0,
  },
  row: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  },
  navBtn: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC',
    minWidth: 60,
  },
  navLabel: { fontSize: 11, color: '#8A7A5A', fontFamily: bodySerif, letterSpacing: 0.5, textTransform: 'uppercase' as any },
});

export default QuickNav;
