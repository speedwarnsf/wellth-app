import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions, Alert,
} from 'react-native';
import storage from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const SETTINGS_KEY = 'wellth_settings';
const STREAK_KEY = 'wellth_streak';
const CHECKIN_PREFIX = 'wellth_checkin_';

type TipCategory = 'all' | 'nutrition' | 'mental' | 'exercise' | 'sleep' | 'mindfulness';

interface Settings {
  notificationsEnabled: boolean;
  tipCategory: TipCategory;
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  tipCategory: 'all',
};

const CATEGORIES: { key: TipCategory; label: string; desc: string }[] = [
  { key: 'all', label: 'All Categories', desc: 'A balanced mix of all wellness topics' },
  { key: 'nutrition', label: 'Nutrition', desc: 'Food, diet, and nourishment' },
  { key: 'mental', label: 'Mental Health', desc: 'Emotional well-being and resilience' },
  { key: 'exercise', label: 'Exercise', desc: 'Movement, posture, and physical health' },
  { key: 'sleep', label: 'Sleep', desc: 'Rest, recovery, and circadian rhythm' },
  { key: 'mindfulness', label: 'Mindfulness', desc: 'Breath, presence, and gratitude' },
];

export const getSettings = (): Settings => {
  return storage.getJSON<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
};

export const saveSettings = (settings: Settings) => {
  storage.setJSON(SETTINGS_KEY, settings);
};

const SettingsScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);

  const [settings, setSettings] = useState<Settings>(getSettings);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetStreak = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    // Clear streak
    storage.setJSON(STREAK_KEY, 0);
    // Clear all check-ins
    if (Platform.OS === 'web') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CHECKIN_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    setResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Personalize your Wellth experience</Text>

      {saved && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedText}>Changes saved</Text>
        </View>
      )}

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionDesc}>Receive daily reminders to check in and reflect.</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => updateSetting('notificationsEnabled', true)}
            style={[styles.toggleBtn, settings.notificationsEnabled && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, settings.notificationsEnabled && styles.toggleTextActive]}>On</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updateSetting('notificationsEnabled', false)}
            style={[styles.toggleBtn, !settings.notificationsEnabled && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, !settings.notificationsEnabled && styles.toggleTextActive]}>Off</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tip Category Preference */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tip Category</Text>
        <Text style={styles.sectionDesc}>Choose which type of wellness tips to feature on your home screen.</Text>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => updateSetting('tipCategory', cat.key)}
            style={[styles.catOption, settings.tipCategory === cat.key && styles.catOptionActive]}
            activeOpacity={0.7}
          >
            <View style={styles.catOptionInner}>
              <Text style={[styles.catLabel, settings.tipCategory === cat.key && styles.catLabelActive]}>
                {cat.label}
              </Text>
              <Text style={styles.catDesc}>{cat.desc}</Text>
            </View>
            {settings.tipCategory === cat.key && (
              <Text style={styles.catCheck}>{'\u2713'}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Reset Streak */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reset Streak</Text>
        <Text style={styles.sectionDesc}>
          This will erase your current streak and all check-in history. This action cannot be undone.
        </Text>
        <TouchableOpacity
          onPress={handleResetStreak}
          style={[styles.resetBtn, resetConfirm && styles.resetBtnConfirm]}
          activeOpacity={0.7}
        >
          <Text style={[styles.resetBtnText, resetConfirm && styles.resetBtnTextConfirm]}>
            {resetConfirm ? 'Confirm Reset' : 'Reset Streak'}
          </Text>
        </TouchableOpacity>
        {resetConfirm && (
          <TouchableOpacity onPress={() => setResetConfirm(false)} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <QuickNav navigation={navigation} currentScreen="Settings" />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAF8F3' },
  container: { paddingHorizontal: 28, paddingTop: Platform.OS === 'web' ? 48 : 60, paddingBottom: 40, width: '100%' },

  backBtn: { marginBottom: 20 },
  backText: { fontSize: 15, color: '#B8963E', fontFamily: bodySerif, letterSpacing: 0.3 },

  title: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 28 },

  savedBanner: {
    backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#D4B96A',
    padding: 12, marginBottom: 20, alignItems: 'center',
  },
  savedText: { fontSize: 14, color: '#B8963E', fontFamily: bodySerif, fontWeight: '600' },

  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 6 },
  sectionDesc: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 16, lineHeight: 22 },

  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderWidth: 1.5, borderColor: '#EDE3CC',
    alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  toggleText: { fontSize: 15, color: '#999', fontFamily: bodySerif },
  toggleTextActive: { color: '#B8963E', fontWeight: '600' },

  catOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, marginBottom: 8, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  catOptionActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  catOptionInner: { flex: 1 },
  catLabel: { fontSize: 15, color: '#3A3A3A', fontFamily: bodySerif, fontWeight: '600', marginBottom: 2 },
  catLabelActive: { color: '#B8963E' },
  catDesc: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif },
  catCheck: { fontSize: 18, color: '#B8963E', fontWeight: '700', marginLeft: 12 },

  resetBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#D4536A', backgroundColor: '#FFFFFF',
  },
  resetBtnConfirm: { backgroundColor: '#D4536A' },
  resetBtnText: { fontSize: 15, color: '#D4536A', fontFamily: bodySerif, fontWeight: '600', letterSpacing: 0.5 },
  resetBtnTextConfirm: { color: '#FFFFFF' },

  cancelBtn: { alignSelf: 'center', paddingVertical: 10, marginTop: 8 },
  cancelBtnText: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif },
});

export default SettingsScreen;
