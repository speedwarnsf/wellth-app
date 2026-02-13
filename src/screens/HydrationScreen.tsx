import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import storage from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const HYDRATION_PREFIX = 'wellth_hydration_';
const HYDRATION_GOAL_KEY = 'wellth_hydration_goal';
const todayKey = () => new Date().toISOString().slice(0, 10);

interface HydrationLog {
  glasses: number;
  timestamps: number[];
}

const WATER_FACTS = [
  "Even mild dehydration can impair mood, memory, and concentration.",
  "Water helps your kidneys flush toxins from your body.",
  "Drinking water before meals can help with healthy weight management.",
  "Your brain is about 75% water -- keep it hydrated for clear thinking.",
  "Water lubricates your joints and helps prevent muscle cramps.",
  "Proper hydration keeps your skin looking healthy and radiant.",
  "Cold water can boost your metabolism by up to 30% for about an hour.",
  "Dehydration is one of the most common causes of daytime fatigue.",
];

const HydrationScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = todayKey();

  const [glasses, setGlasses] = useState(0);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [goal, setGoal] = useState(8);
  const [weekData, setWeekData] = useState<{ date: string; glasses: number }[]>([]);

  useEffect(() => {
    const savedGoal = storage.getJSON<number>(HYDRATION_GOAL_KEY, 8);
    setGoal(savedGoal);
    const todayLog = storage.getJSON<HydrationLog | null>(`${HYDRATION_PREFIX}${today}`, null);
    if (todayLog) {
      setGlasses(todayLog.glasses);
      setTimestamps(todayLog.timestamps);
    }
    loadWeek();
  }, []);

  const loadWeek = () => {
    const data: { date: string; glasses: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const log = storage.getJSON<HydrationLog | null>(`${HYDRATION_PREFIX}${key}`, null);
      data.push({ date: key, glasses: log?.glasses || 0 });
    }
    setWeekData(data);
  };

  const addGlass = () => {
    const newGlasses = glasses + 1;
    const newTimestamps = [...timestamps, Date.now()];
    setGlasses(newGlasses);
    setTimestamps(newTimestamps);
    const log: HydrationLog = { glasses: newGlasses, timestamps: newTimestamps };
    storage.setJSON(`${HYDRATION_PREFIX}${today}`, log);
    loadWeek();
  };

  const removeGlass = () => {
    if (glasses <= 0) return;
    const newGlasses = glasses - 1;
    const newTimestamps = timestamps.slice(0, -1);
    setGlasses(newGlasses);
    setTimestamps(newTimestamps);
    const log: HydrationLog = { glasses: newGlasses, timestamps: newTimestamps };
    storage.setJSON(`${HYDRATION_PREFIX}${today}`, log);
    loadWeek();
  };

  const changeGoal = (delta: number) => {
    const newGoal = Math.max(1, Math.min(20, goal + delta));
    setGoal(newGoal);
    storage.setJSON(HYDRATION_GOAL_KEY, newGoal);
  };

  const progress = Math.min(glasses / goal, 1);
  const progressPercent = Math.round(progress * 100);
  const factIndex = new Date().getDate() % WATER_FACTS.length;
  const weekAvg = weekData.length > 0
    ? (weekData.reduce((s, d) => s + d.glasses, 0) / weekData.length).toFixed(1)
    : '0';
  const daysMetGoal = weekData.filter(d => d.glasses >= goal).length;

  const lastGlassTime = timestamps.length > 0
    ? Math.round((Date.now() - timestamps[timestamps.length - 1]) / 60000)
    : null;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Hydration</Text>
      <Text style={styles.subtitle}>Stay refreshed, stay sharp</Text>

      {/* Progress Display */}
      <View style={styles.progressCard}>
        {Platform.OS === 'web' ? (
          <div style={{
            width: 200, height: 200, position: 'relative' as const,
            background: `conic-gradient(#B8963E ${progressPercent}%, #EDE3CC ${progressPercent}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <div style={{
              width: 168, height: 168, backgroundColor: '#FAF8F3',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <span style={{ fontSize: 36, fontWeight: '700', color: '#B8963E', fontFamily: '"Playfair Display", Georgia, serif' }}>
                {glasses}
              </span>
              <span style={{ fontSize: 13, color: '#8A7A5A', fontFamily: 'Georgia, serif', letterSpacing: 1 }}>
                of {goal}
              </span>
            </div>
          </div>
        ) : (
          <View style={styles.progressCircle}>
            <Text style={styles.progressCount}>{glasses}</Text>
            <Text style={styles.progressLabel}>of {goal}</Text>
          </View>
        )}

        {glasses >= goal && (
          <Text style={styles.goalReached}>Goal reached. Well done.</Text>
        )}

        {lastGlassTime !== null && (
          <Text style={styles.lastGlass}>
            Last glass: {lastGlassTime < 1 ? 'just now' : `${lastGlassTime}m ago`}
          </Text>
        )}

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity onPress={removeGlass} style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.actionBtnText}>{'\u2212'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addGlass} style={[styles.actionBtn, styles.actionBtnPrimary]} activeOpacity={0.7}>
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>+ glass</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gentle reminder */}
      {lastGlassTime !== null && lastGlassTime > 60 && (
        <View style={styles.reminderCard}>
          <Text style={styles.reminderText}>
            It has been over an hour since your last glass. Time for a sip.
          </Text>
        </View>
      )}

      {/* Goal Setting */}
      <View style={styles.goalSection}>
        <Text style={styles.sectionTitle}>Daily Goal</Text>
        <View style={styles.goalRow}>
          <TouchableOpacity onPress={() => changeGoal(-1)} style={styles.goalBtn}>
            <Text style={styles.goalBtnText}>{'\u2212'}</Text>
          </TouchableOpacity>
          <Text style={styles.goalValue}>{goal} glasses</Text>
          <TouchableOpacity onPress={() => changeGoal(1)} style={styles.goalBtn}>
            <Text style={styles.goalBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={styles.weekCard}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.chartRow}>
          {weekData.map((d, i) => {
            const barHeight = Math.max(8, (d.glasses / Math.max(goal, 1)) * 80);
            const metGoal = d.glasses >= goal;
            const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            return (
              <View key={i} style={styles.chartCol}>
                <Text style={styles.chartVal}>{d.glasses}</Text>
                <View style={[
                  styles.chartBar,
                  { height: barHeight, backgroundColor: metGoal ? '#B8963E' : '#D4B96A' }
                ]} />
                <Text style={styles.chartDay}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.weekStats}>
          <Text style={styles.weekStat}>Avg: {weekAvg}/day</Text>
          <Text style={styles.weekStat}>Goal met: {daysMetGoal}/7</Text>
        </View>
      </View>

      {/* Water Fact */}
      <View style={styles.factCard}>
        <Text style={styles.factLabel}>Did you know</Text>
        <Text style={styles.factText}>{WATER_FACTS[factIndex]}</Text>
      </View>

      <QuickNav navigation={navigation} currentScreen="Hydration" />
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

  progressCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 28, marginBottom: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  progressCircle: {
    width: 200, height: 200, borderRadius: 0, backgroundColor: '#FFF9EE',
    borderWidth: 4, borderColor: '#D4B96A', alignItems: 'center', justifyContent: 'center',
  },
  progressCount: { fontSize: 36, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  progressLabel: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif, letterSpacing: 1 },

  goalReached: { fontSize: 14, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic', marginTop: 14, textAlign: 'center' },
  lastGlass: { fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 8, letterSpacing: 0.3 },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 22, alignItems: 'center', justifyContent: 'center' },
  actionBtn: {
    height: 48, paddingHorizontal: 24, borderWidth: 1.5, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  actionBtnPrimary: { backgroundColor: '#B8963E', borderColor: '#B8963E', paddingHorizontal: 32 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#B8963E', fontFamily: bodySerif },

  reminderCard: {
    backgroundColor: '#FFF9EE', borderRadius: 0, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  reminderText: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif, lineHeight: 22, fontStyle: 'italic' },

  goalSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 12, letterSpacing: 0.3 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  goalBtn: {
    width: 44, height: 44, borderRadius: 0, borderWidth: 1.5, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  goalBtnText: { fontSize: 22, color: '#B8963E', fontWeight: '600' },
  goalValue: { fontSize: 20, color: '#3A3A3A', fontFamily: bodySerif, marginHorizontal: 24, minWidth: 100, textAlign: 'center' },

  weekCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 22, marginBottom: 20,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: 12, minHeight: 100 },
  chartCol: { alignItems: 'center', gap: 4 },
  chartVal: { fontSize: 12, fontWeight: '700', color: '#B8963E', fontFamily: bodySerif },
  chartBar: { width: 28, borderRadius: 0, minHeight: 8 },
  chartDay: { fontSize: 10, color: '#999', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  weekStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  weekStat: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif },

  factCard: {
    backgroundColor: '#FFF9EE', borderRadius: 0, padding: 20, marginBottom: 8,
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  factLabel: { fontSize: 11, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 8 },
  factText: { fontSize: 15, lineHeight: 24, color: '#3A3A3A', fontFamily: bodySerif },
});

export default HydrationScreen;
