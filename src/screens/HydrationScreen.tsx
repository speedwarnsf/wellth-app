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
  timestamps: number[]; // when each glass was logged
}

const WATER_FACTS = [
  "Even mild dehydration can impair mood, memory, and concentration.",
  "Water helps your kidneys flush toxins from your body.",
  "Drinking water before meals can help with healthy weight management.",
  "Your brain is about 75% water — keep it hydrated for clear thinking.",
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

  // Time since last glass
  const lastGlassTime = timestamps.length > 0
    ? Math.round((Date.now() - timestamps[timestamps.length - 1]) / 60000)
    : null;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Hydration Tracker</Text>
      <Text style={styles.subtitle}>Stay refreshed, stay sharp</Text>

      {/* Progress Ring */}
      <View style={styles.progressCard}>
        {Platform.OS === 'web' ? (
          <div style={{
            width: 180, height: 180, borderRadius: 0, position: 'relative',
            background: `conic-gradient(#B8963E ${progressPercent}%, #EDE3CC ${progressPercent}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <div style={{
              width: 150, height: 150, borderRadius: 0, backgroundColor: '#FAF8F3',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <img src="/icons/hydration.png" width="48" height="48" alt="water" />
              <span style={{ fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: '"Playfair Display", Georgia, serif' }}>
                {glasses}/{goal}
              </span>
              <span style={{ fontSize: 13, color: '#8A7A5A', fontFamily: 'Georgia, serif' }}>glasses</span>
            </div>
          </div>
        ) : (
          <View style={styles.progressCircle}>
            <Image source={{ uri: '/icons/hydration.png' }} style={{ width: 48, height: 48 }} />
            <Text style={styles.progressCount}>{glasses}/{goal}</Text>
            <Text style={styles.progressLabel}>glasses</Text>
          </View>
        )}

        {glasses >= goal && (
          <Text style={styles.goalReached}>Goal reached — great job staying hydrated.</Text>
        )}

        {lastGlassTime !== null && (
          <Text style={styles.lastGlass}>
            Last glass: {lastGlassTime < 1 ? 'just now' : `${lastGlassTime} min ago`}
          </Text>
        )}

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity onPress={removeGlass} style={styles.circleBtn} activeOpacity={0.7}>
            <Text style={styles.circleBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addGlass} style={[styles.circleBtn, styles.circleBtnPrimary]} activeOpacity={0.7}>
            <Text style={[styles.circleBtnText, { color: '#FFF' }]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={removeGlass} style={[styles.circleBtn, { opacity: 0 }]} disabled>
            <Text style={styles.circleBtnText}>−</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reminder tip */}
      {lastGlassTime !== null && lastGlassTime > 60 && (
        <View style={styles.reminderCard}>
          <Text style={styles.reminderEmoji}></Text>
          <Text style={styles.reminderText}>
            It's been over an hour since your last glass. Time for a sip!
          </Text>
        </View>
      )}

      {/* Goal Setting */}
      <View style={styles.goalSection}>
        <Text style={styles.sectionTitle}>Daily Goal</Text>
        <View style={styles.goalRow}>
          <TouchableOpacity onPress={() => changeGoal(-1)} style={styles.goalBtn}>
            <Text style={styles.goalBtnText}>−</Text>
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
          <Text style={styles.weekStat}>Goal met: {daysMetGoal}/7 days</Text>
        </View>
      </View>

      {/* Water Fact */}
      <View style={styles.factCard}>
        <Text style={styles.factEmoji}>·</Text>
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

  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#B8963E', fontFamily: bodySerif },

  title: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 24 },

  progressCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 28, marginBottom: 20, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  progressCircle: {
    width: 180, height: 180, borderRadius: 0, backgroundColor: '#FFF9EE',
    borderWidth: 6, borderColor: '#D4B96A', alignItems: 'center', justifyContent: 'center',
  },
  progressCount: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  progressLabel: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif },

  goalReached: { fontSize: 15, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic', marginTop: 12, textAlign: 'center' },
  lastGlass: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 8 },

  btnRow: { flexDirection: 'row', gap: 16, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  circleBtn: {
    width: 56, height: 56, borderRadius: 0, borderWidth: 2, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  circleBtnPrimary: { backgroundColor: '#B8963E', borderColor: '#B8963E', width: 80, height: 56, borderRadius: 0 },
  circleBtnText: { fontSize: 20, fontWeight: '700', color: '#B8963E' },

  reminderCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9EE',
    borderRadius: 0, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: '#D4B96A',
  },
  reminderEmoji: { fontSize: 28, marginRight: 12 },
  reminderText: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif, flex: 1, lineHeight: 22 },

  goalSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  goalBtn: {
    width: 44, height: 44, borderRadius: 0, borderWidth: 1.5, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  goalBtnText: { fontSize: 22, color: '#B8963E', fontWeight: '600' },
  goalValue: { fontSize: 20, color: '#3A3A3A', fontFamily: bodySerif, marginHorizontal: 24, minWidth: 100, textAlign: 'center' },

  weekCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 20, marginBottom: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: 12, minHeight: 100 },
  chartCol: { alignItems: 'center', gap: 4 },
  chartVal: { fontSize: 12, fontWeight: '600', color: '#B8963E', fontFamily: bodySerif },
  chartBar: { width: 28, borderRadius: 0, minHeight: 8 },
  chartDay: { fontSize: 11, color: '#999', fontFamily: bodySerif },
  weekStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  weekStat: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif },

  factCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF9EE',
    borderRadius: 0, padding: 16, borderWidth: 1, borderColor: '#EDE3CC',
  },
  factEmoji: { fontSize: 20, marginRight: 10 },
  factText: { fontSize: 14, lineHeight: 22, color: '#3A3A3A', fontFamily: bodySerif, flex: 1 },
});

export default HydrationScreen;
