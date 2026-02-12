import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const NAV_ITEMS = [
  { screen: 'Home', emoji: '🏠', label: 'Home' },
  { screen: 'CheckIn', emoji: '📝', label: 'Check In' },
  { screen: 'Journal', emoji: '📖', label: 'Journal' },
  { screen: 'Hydration', emoji: '💧', label: 'Water' },
  { screen: 'Breathing', emoji: '🧘', label: 'Breathe' },
  { screen: 'WeeklyReport', emoji: '📊', label: 'Report' },
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
            onPress={() => {
              if (item.screen === 'Home') {
                navigation.navigate('Home');
              } else {
                navigation.navigate(item.screen);
              }
            }}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.navEmoji}>{item.emoji}</Text>
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 8 },
  divider: {
    width: 40, height: 2, backgroundColor: '#EDE3CC',
    alignSelf: 'center', marginBottom: 16, borderRadius: 1,
  },
  row: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  },
  navBtn: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#EDE3CC',
    minWidth: 60,
  },
  navEmoji: { fontSize: 18, marginBottom: 2 },
  navLabel: { fontSize: 10, color: '#8A7A5A', fontFamily: bodySerif },
});

export default QuickNav;
