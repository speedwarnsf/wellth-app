import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import storage, { todayKey, getCheckIn } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const SLEEP_PREFIX = 'wellth_sleep_';

interface SleepEntry {
  date: string;
  hours: number;
  quality: number; // 1-5
  timestamp: number;
}

const QUALITY_LABELS = ['Terrible', 'Poor', 'Fair', 'Good', 'Excellent'];
const QUALITY_COLORS = ['#D4536A', '#CCBBAA', '#D4B96A', '#B8963E', '#4CAF50'];

const SleepScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = todayKey();

  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState(0);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<SleepEntry[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  useEffect(() => {
    // Load from sleep entry or check-in
    const existing = storage.getJSON<SleepEntry | null>(`${SLEEP_PREFIX}${today}`, null);
    if (existing) {
      setHours(existing.hours);
      setQuality(existing.quality);
      setSaved(true);
    } else {
      const checkin = getCheckIn(today);
      if (checkin?.sleep) setHours(checkin.sleep);
    }
    loadHistory();
  }, []);

  const loadHistory = () => {
    const all: SleepEntry[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = storage.getJSON<SleepEntry | null>(`${SLEEP_PREFIX}${key}`, null);
      if (entry) all.push(entry);
    }
    setEntries(all);
  };

  const handleSave = () => {
    if (quality === 0) return;
    const entry: SleepEntry = { date: today, hours, quality, timestamp: Date.now() };
    storage.setJSON(`${SLEEP_PREFIX}${today}`, entry);
    setSaved(true);
    loadHistory();
  };

  const avgHours = entries.length > 0 ? entries.reduce((s, e) => s + e.hours, 0) / entries.length : 0;
  const avgQuality = entries.length > 0 ? entries.reduce((s, e) => s + e.quality, 0) / entries.length : 0;

  const getSleepInsight = () => {
    if (avgHours === 0) return '';
    if (avgHours >= 8 && avgQuality >= 4) return 'Your sleep is excellent. Protect this routine.';
    if (avgHours >= 7) return 'Good sleep duration. Focus on improving quality.';
    if (avgHours >= 6) return 'You are getting by, but more rest would help.';
    return 'Your body needs more sleep. Make rest a priority.';
  };

  // Chart data - last 7 entries reversed for display
  const chartData = entries.slice(0, 7).reverse();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title} accessibilityRole="header" aria-level={1}>Sleep</Text>
        <Text style={styles.subtitle}>Rest is the foundation of wellness</Text>

        {/* Averages */}
        {entries.length > 0 && (
          <View style={styles.avgRow}>
            <View style={styles.avgItem}>
              <Text style={styles.avgNum}>{avgHours.toFixed(1)}h</Text>
              <Text style={styles.avgLabel}>avg hours</Text>
            </View>
            <View style={styles.avgItem}>
              <Text style={[styles.avgNum, { color: QUALITY_COLORS[Math.round(avgQuality) - 1] || '#B8963E' }]}>
                {avgQuality.toFixed(1)}
              </Text>
              <Text style={styles.avgLabel}>avg quality</Text>
            </View>
            <View style={styles.avgItem}>
              <Text style={styles.avgNum}>{entries.length}</Text>
              <Text style={styles.avgLabel}>nights logged</Text>
            </View>
          </View>
        )}

        {/* Insight */}
        {entries.length >= 3 && (
          <View style={styles.insightBox}>
            <Text style={styles.insightText}>{getSleepInsight()}</Text>
          </View>
        )}

        {/* Log sleep hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours Slept</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity onPress={() => setHours(Math.max(0, hours - 0.5))} style={styles.counterBtn}>
              <Text style={styles.counterBtnText}>{'\u2212'}</Text>
            </TouchableOpacity>
            <View style={styles.counterCenter}>
              <Text style={styles.counterValue}>{hours}</Text>
              <Text style={styles.counterUnit}>hours</Text>
            </View>
            <TouchableOpacity onPress={() => setHours(Math.min(14, hours + 0.5))} style={styles.counterBtn}>
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quality rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Quality</Text>
          <View style={styles.qualityRow}>
            {QUALITY_LABELS.map((label, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setQuality(i + 1); setSaved(false); }}
                style={[styles.qualityBtn, quality === i + 1 && { borderColor: QUALITY_COLORS[i], backgroundColor: '#FFF9EE' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.qualityValue, quality === i + 1 && { color: QUALITY_COLORS[i] }]}>{i + 1}</Text>
                <Text style={[styles.qualityLabel, quality === i + 1 && { color: QUALITY_COLORS[i], fontWeight: '600' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, quality === 0 && styles.saveBtnDisabled]}
          disabled={quality === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Log Sleep'}</Text>
        </TouchableOpacity>

        {/* Chart */}
        {chartData.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Recent Sleep</Text>
            <View style={styles.chartRow}>
              {chartData.map((entry, i) => {
                const barHeight = Math.max(8, (entry.hours / 10) * 80);
                const dayLabel = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
                return (
                  <View key={i} style={styles.chartCol}>
                    <Text style={styles.chartVal}>{entry.hours}h</Text>
                    <View style={[styles.chartBar, { height: barHeight, backgroundColor: QUALITY_COLORS[entry.quality - 1] || '#D4B96A' }]} />
                    <Text style={styles.chartQual}>{QUALITY_LABELS[entry.quality - 1]?.slice(0, 4)}</Text>
                    <Text style={styles.chartDay}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <QuickNav navigation={navigation} currentScreen="Sleep" />
        <View style={{ height: 40 }} />
      </Animated.View>
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

  avgRow: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF',
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EDE3CC',
  },
  avgItem: { alignItems: 'center' },
  avgNum: { fontSize: 22, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  avgLabel: { fontSize: 10, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8, marginTop: 2 },

  insightBox: {
    backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A',
    padding: 18, marginBottom: 24, alignItems: 'center',
  },
  insightText: { fontSize: 15, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic', textAlign: 'center', lineHeight: 24 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 14 },

  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counterBtn: {
    width: 48, height: 48, borderWidth: 1.5, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  counterBtnText: { fontSize: 22, color: '#B8963E', fontWeight: '600' },
  counterCenter: { alignItems: 'center', marginHorizontal: 28, minWidth: 80 },
  counterValue: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  counterUnit: { fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1 },

  qualityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  qualityBtn: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#EDE3CC', flex: 1, marginHorizontal: 2,
    backgroundColor: '#FFFFFF',
  },
  qualityValue: { fontSize: 20, fontWeight: '700', color: '#CCBBAA', fontFamily: serif, marginBottom: 4 },
  qualityLabel: { fontSize: 9, color: '#999', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.3 },

  saveBtn: {
    backgroundColor: '#B8963E', paddingVertical: 16, alignItems: 'center', marginBottom: 24,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 },

  chartCard: {
    backgroundColor: '#FFFFFF', padding: 22, marginBottom: 16,
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 16, textAlign: 'center', textTransform: 'uppercase' as any, letterSpacing: 1 },
  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: 120 },
  chartCol: { alignItems: 'center', gap: 4 },
  chartVal: { fontSize: 11, fontWeight: '600', color: '#B8963E', fontFamily: bodySerif },
  chartBar: { width: 28, minHeight: 4 },
  chartQual: { fontSize: 8, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any },
  chartDay: { fontSize: 10, color: '#999', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
});

export default SleepScreen;
