import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import { saveCheckIn, getCheckIn, todayKey, getWeekDates, CheckInData, getStreak, getStreakMilestone } from '../utils/storage';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const MOODS = [
  { emoji: '😞', label: 'Rough' },
  { emoji: '😕', label: 'Low' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😄', label: 'Great' },
];

const CheckInScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = todayKey();

  const [mood, setMood] = useState(0);
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(7);
  const [exercise, setExercise] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const existing = getCheckIn(today);
    if (existing) {
      setMood(existing.mood);
      setWater(existing.water);
      setSleep(existing.sleep);
      setExercise(existing.exercise);
      setSaved(true);
    }
    setStreak(getStreak());
  }, []);

  const handleSave = () => {
    if (mood === 0) return;
    const data: CheckInData = { mood, water, sleep, exercise };
    saveCheckIn(today, data);
    setSaved(true);
    setStreak(getStreak());
  };

  const milestone = getStreakMilestone(streak);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      {/* Header */}
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Daily Check-In</Text>
      <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

      {/* Streak */}
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak 🔥</Text>
          {milestone && <Text style={styles.milestone}>{milestone}</Text>}
        </View>
      )}

      {/* Mood */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setMood(i + 1)}
              style={[styles.moodBtn, mood === i + 1 && styles.moodBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, mood === i + 1 && styles.moodLabelActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Water */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Water intake 💧</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity onPress={() => setWater(Math.max(0, water - 1))} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{water} glasses</Text>
          <TouchableOpacity onPress={() => setWater(water + 1)} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sleep */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep last night 😴</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity onPress={() => setSleep(Math.max(0, sleep - 0.5))} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{sleep} hours</Text>
          <TouchableOpacity onPress={() => setSleep(sleep + 0.5)} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Did you exercise? 🏃</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setExercise(true)}
            style={[styles.toggleBtn, exercise && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, exercise && styles.toggleTextActive]}>Yes ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setExercise(false)}
            style={[styles.toggleBtn, !exercise && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, !exercise && styles.toggleTextActive]}>Not today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save */}
      <TouchableOpacity
        onPress={handleSave}
        style={[styles.saveBtn, mood === 0 && styles.saveBtnDisabled]}
        disabled={mood === 0}
        activeOpacity={0.7}
      >
        <Text style={styles.saveBtnText}>{saved ? '✓ Updated' : 'Save Check-In'}</Text>
      </TouchableOpacity>

      {/* Weekly Summary Toggle */}
      <TouchableOpacity onPress={() => setShowWeekly(!showWeekly)} style={styles.weeklyToggle}>
        <Text style={styles.weeklyToggleText}>{showWeekly ? 'Hide Weekly Summary' : '📊 View Weekly Summary'}</Text>
      </TouchableOpacity>

      {showWeekly && <WeeklySummary />}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const WeeklySummary = () => {
  const dates = getWeekDates();
  const data = dates.map(d => ({ date: d, checkin: getCheckIn(d) }));
  const completed = data.filter(d => d.checkin).length;
  const avgMood = completed > 0
    ? (data.reduce((s, d) => s + (d.checkin?.mood || 0), 0) / completed).toFixed(1)
    : '—';
  const avgWater = completed > 0
    ? (data.reduce((s, d) => s + (d.checkin?.water || 0), 0) / completed).toFixed(1)
    : '—';
  const avgSleep = completed > 0
    ? (data.reduce((s, d) => s + (d.checkin?.sleep || 0), 0) / completed).toFixed(1)
    : '—';
  const exerciseDays = data.filter(d => d.checkin?.exercise).length;

  return (
    <View style={styles.weeklyCard}>
      <Text style={styles.weeklyTitle}>This Week</Text>

      {/* Day dots */}
      <View style={styles.dayDotsRow}>
        {data.map((d, i) => {
          const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
          return (
            <View key={i} style={styles.dayDot}>
              <Text style={styles.dayDotLabel}>{dayLabel}</Text>
              <View style={[styles.dot, d.checkin ? styles.dotFilled : styles.dotEmpty]}>
                {d.checkin && <Text style={styles.dotEmoji}>{MOODS[(d.checkin.mood || 1) - 1]?.emoji}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completed}/7</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{avgMood}</Text>
          <Text style={styles.statLabel}>Avg Mood</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{avgWater}</Text>
          <Text style={styles.statLabel}>Avg Water</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{avgSleep}h</Text>
          <Text style={styles.statLabel}>Avg Sleep</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{exerciseDays}</Text>
          <Text style={styles.statLabel}>Exercise Days</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAF8F3' },
  container: { paddingHorizontal: 28, paddingTop: Platform.OS === 'web' ? 48 : 60, paddingBottom: 40, width: '100%' },

  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#B8963E', fontFamily: bodySerif },

  title: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 24 },

  streakBadge: {
    backgroundColor: '#FFF9EE', borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: '#D4B96A', alignItems: 'center',
  },
  streakNumber: { fontSize: 36, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  streakLabel: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif },
  milestone: { fontSize: 15, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 12 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#EDE3CC', flex: 1, marginHorizontal: 3,
    backgroundColor: '#FFFFFF',
  },
  moodBtnActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  moodEmoji: { fontSize: 28, marginBottom: 4 },
  moodLabel: { fontSize: 12, color: '#999', fontFamily: bodySerif },
  moodLabelActive: { color: '#B8963E', fontWeight: '600' },

  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counterBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  counterBtnText: { fontSize: 22, color: '#B8963E', fontWeight: '600' },
  counterValue: { fontSize: 20, color: '#3A3A3A', fontFamily: bodySerif, marginHorizontal: 24, minWidth: 100, textAlign: 'center' },

  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#EDE3CC',
    alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  toggleText: { fontSize: 16, color: '#999', fontFamily: bodySerif },
  toggleTextActive: { color: '#B8963E', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#B8963E', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif },

  weeklyToggle: { alignSelf: 'center', marginBottom: 16 },
  weeklyToggleText: { fontSize: 15, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif },

  weeklyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  weeklyTitle: { fontSize: 20, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 16, textAlign: 'center' },

  dayDotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dayDot: { alignItems: 'center' },
  dayDotLabel: { fontSize: 12, color: '#999', fontFamily: bodySerif, marginBottom: 6 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dotFilled: { backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A' },
  dotEmpty: { backgroundColor: '#F0ECE4', borderWidth: 1.5, borderColor: '#E0D8C8' },
  dotEmoji: { fontSize: 18 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: {
    width: '48%' as any, backgroundColor: '#FAF8F3', borderRadius: 12, padding: 14,
    marginBottom: 10, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  statLabel: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 2 },
});

export default CheckInScreen;
