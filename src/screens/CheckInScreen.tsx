import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import { saveCheckIn, getCheckIn, todayKey, getWeekDates, CheckInData, getStreak, getStreakMilestone } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const MOODS = [
  { label: 'Rough', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Okay', value: 3 },
  { label: 'Good', value: 4 },
  { label: 'Great', value: 5 },
];

// ── inject CSS for check-in animations ──────────────────
const injectCheckInCSS = () => {
  if (Platform.OS !== 'web') return;
  if (document.getElementById('wellth-checkin-css')) return;
  const style = document.createElement('style');
  style.id = 'wellth-checkin-css';
  style.textContent = `
    @keyframes completionReveal {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes streakCountUp {
      from { opacity: 0; transform: scale(0.5); }
      50% { transform: scale(1.1); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes checkmarkDraw {
      from { stroke-dashoffset: 24; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes completionBarFill {
      from { width: 0%; }
    }
    .completion-card {
      animation: completionReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .completion-streak {
      animation: streakCountUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
    }
    .completion-message {
      animation: completionReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
    }
    .completion-bar-fill {
      animation: completionBarFill 1s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both;
    }
  `;
  document.head.appendChild(style);
};

// ── Completion State Component ───────────────────────────
const CompletionState = ({ streak, mood }: { streak: number; mood: number }) => {
  const milestone = getStreakMilestone(streak);
  const moodLabel = MOODS.find(m => m.value === mood)?.label || '';

  // Messages based on streak
  const getMessage = () => {
    if (streak <= 1) return 'First step taken. Tomorrow, take another.';
    if (streak <= 3) return 'Building momentum. Keep showing up.';
    if (streak <= 7) return 'A week of intention. This is becoming yours.';
    if (streak <= 14) return 'Two weeks of consistency. You are proving something.';
    if (streak <= 30) return 'The habit is real. This is who you are now.';
    return 'Remarkable discipline. You inspire.';
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.completionCard}>
        <Text style={styles.completionCheck}>{'\u2713'}</Text>
        <Text style={styles.completionTitle}>Checked in</Text>
        <Text style={styles.completionStreak}>{streak}</Text>
        <Text style={styles.completionStreakLabel}>{streak === 1 ? 'day' : 'days'} consistent</Text>
        <Text style={styles.completionMessage}>{getMessage()}</Text>
      </View>
    );
  }

  injectCheckInCSS();

  // Build 7-day visual
  const segments = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hasCheckIn = !!getCheckIn(key);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
    segments.push({ key, hasCheckIn, dayLabel, isToday: i === 0 });
  }

  return (
    <div className="completion-card" style={{
      backgroundColor: '#FFFFFF', border: '1.5px solid #D4B96A',
      padding: '36px 28px', marginBottom: 28, textAlign: 'center',
    }}>
      {/* Checkmark */}
      <div style={{ marginBottom: 20 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'block', margin: '0 auto' }}>
          <rect x="4" y="4" width="40" height="40" fill="none" stroke="#B8963E" strokeWidth="2" />
          <path d="M14 24 L22 32 L34 16" fill="none" stroke="#B8963E" strokeWidth="3"
            strokeLinecap="square" strokeDasharray="24" style={{ animation: 'checkmarkDraw 0.6s ease-out 0.2s both' }} />
        </svg>
      </div>

      {/* Streak number */}
      <div className="completion-streak" style={{
        fontSize: 56, fontWeight: '700', color: '#B8963E',
        fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1',
        marginBottom: 4,
      }}>{streak}</div>
      <div style={{
        fontSize: 15, color: '#8A7A5A', fontFamily: 'Georgia, serif',
        marginBottom: 6,
      }}>{streak === 1 ? 'day' : 'days'} consistent</div>

      {/* Feeling badge */}
      <div style={{
        display: 'inline-block', padding: '6px 16px', border: '1px solid #EDE3CC',
        fontSize: 13, color: '#8A7A5A', fontFamily: 'Georgia, serif',
        marginBottom: 20, letterSpacing: 0.5,
      }}>Feeling {moodLabel.toLowerCase()}</div>

      {/* 7-day strip */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
        {segments.map((seg) => (
          <div key={seg.key} style={{
            flex: 1, height: 6,
            backgroundColor: seg.hasCheckIn ? '#B8963E' : '#F0E8D8',
          }} />
        ))}
      </div>

      {/* Message */}
      <div className="completion-message" style={{
        fontSize: 17, color: '#3A3A3A', fontStyle: 'italic',
        fontFamily: '"Playfair Display", Georgia, serif',
        lineHeight: '1.7', maxWidth: 320, margin: '0 auto',
      }}>{getMessage()}</div>

      {milestone && (
        <div style={{
          marginTop: 16, padding: '10px 20px', backgroundColor: '#FFF9EE',
          border: '1px solid #D4B96A', fontSize: 14, color: '#B8963E',
          fontFamily: 'Georgia, serif', fontStyle: 'italic',
        }}>{milestone}</div>
      )}
    </div>
  );
};

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
  const [showCompletion, setShowCompletion] = useState(false);

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
    const newStreak = getStreak();
    setStreak(newStreak);
    setShowCompletion(true);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Daily Check-In</Text>
      <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

      {/* Completion State */}
      {showCompletion && <CompletionState streak={streak} mood={mood} />}

      {/* Mood */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m.value}
              onPress={() => setMood(m.value)}
              style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.moodValue, mood === m.value && styles.moodValueActive]}>{m.value}</Text>
              <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Water */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Water intake</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity onPress={() => setWater(Math.max(0, water - 1))} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>{'\u2212'}</Text>
          </TouchableOpacity>
          <View style={styles.counterCenter}>
            <Text style={styles.counterValue}>{water}</Text>
            <Text style={styles.counterUnit}>glasses</Text>
          </View>
          <TouchableOpacity onPress={() => setWater(water + 1)} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sleep */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep last night</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity onPress={() => setSleep(Math.max(0, sleep - 0.5))} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>{'\u2212'}</Text>
          </TouchableOpacity>
          <View style={styles.counterCenter}>
            <Text style={styles.counterValue}>{sleep}</Text>
            <Text style={styles.counterUnit}>hours</Text>
          </View>
          <TouchableOpacity onPress={() => setSleep(sleep + 0.5)} style={styles.counterBtn}>
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Did you exercise?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setExercise(true)}
            style={[styles.toggleBtn, exercise && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, exercise && styles.toggleTextActive]}>Yes</Text>
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
        <Text style={styles.saveBtnText}>{saved ? 'Update Check-In' : 'Save Check-In'}</Text>
      </TouchableOpacity>

      {/* Weekly Summary Toggle */}
      <TouchableOpacity onPress={() => setShowWeekly(!showWeekly)} style={styles.weeklyToggle}>
        <Text style={styles.weeklyToggleText}>{showWeekly ? 'Hide Weekly Summary' : 'View Weekly Summary'}</Text>
      </TouchableOpacity>

      {showWeekly && <WeeklySummary />}

      <QuickNav navigation={navigation} currentScreen="CheckIn" />
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
    : '\u2014';
  const avgWater = completed > 0
    ? (data.reduce((s, d) => s + (d.checkin?.water || 0), 0) / completed).toFixed(1)
    : '\u2014';
  const avgSleep = completed > 0
    ? (data.reduce((s, d) => s + (d.checkin?.sleep || 0), 0) / completed).toFixed(1)
    : '\u2014';
  const exerciseDays = data.filter(d => d.checkin?.exercise).length;

  return (
    <View style={styles.weeklyCard}>
      <Text style={styles.weeklyTitle}>This Week</Text>

      <View style={styles.dayDotsRow}>
        {data.map((d, i) => {
          const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
          return (
            <View key={i} style={styles.dayDot}>
              <Text style={styles.dayDotLabel}>{dayLabel}</Text>
              <View style={[styles.dot, d.checkin ? styles.dotFilled : styles.dotEmpty]}>
                {d.checkin && <Text style={styles.dotText}>{d.checkin.mood}</Text>}
              </View>
            </View>
          );
        })}
      </View>

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
          <Text style={styles.statLabel}>Exercise</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAF8F3' },
  container: { paddingHorizontal: 28, paddingTop: Platform.OS === 'web' ? 48 : 60, paddingBottom: 40, width: '100%' },

  backBtn: { marginBottom: 20 },
  backText: { fontSize: 15, color: '#B8963E', fontFamily: bodySerif, letterSpacing: 0.3 },

  title: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 28 },

  // Completion state (native fallback)
  completionCard: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D4B96A',
    padding: 36, marginBottom: 28, alignItems: 'center',
  },
  completionCheck: { fontSize: 36, color: '#B8963E', fontWeight: '700', marginBottom: 12 },
  completionTitle: { fontSize: 18, color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 8 },
  completionStreak: { fontSize: 56, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  completionStreakLabel: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, marginBottom: 12 },
  completionMessage: { fontSize: 16, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic', textAlign: 'center', lineHeight: 26 },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 14 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: 0, borderWidth: 1.5, borderColor: '#EDE3CC', flex: 1, marginHorizontal: 3,
    backgroundColor: '#FFFFFF',
  },
  moodBtnActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  moodValue: { fontSize: 24, fontWeight: '700', color: '#CCBBAA', fontFamily: serif, marginBottom: 4 },
  moodValueActive: { color: '#B8963E' },
  moodLabel: { fontSize: 11, color: '#999', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  moodLabelActive: { color: '#B8963E', fontWeight: '600' },

  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counterBtn: {
    width: 48, height: 48, borderRadius: 0, borderWidth: 1.5, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  counterBtnText: { fontSize: 22, color: '#B8963E', fontWeight: '600' },
  counterCenter: { alignItems: 'center', marginHorizontal: 28, minWidth: 80 },
  counterValue: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  counterUnit: { fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1 },

  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 0, borderWidth: 1.5, borderColor: '#EDE3CC',
    alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  toggleText: { fontSize: 15, color: '#999', fontFamily: bodySerif },
  toggleTextActive: { color: '#B8963E', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#B8963E', borderRadius: 0, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 },

  weeklyToggle: { alignSelf: 'center', marginBottom: 16, paddingVertical: 8 },
  weeklyToggleText: { fontSize: 14, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif, letterSpacing: 0.3 },

  weeklyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 22, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  weeklyTitle: { fontSize: 20, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 18, textAlign: 'center' },

  dayDotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dayDot: { alignItems: 'center' },
  dayDotLabel: { fontSize: 11, color: '#999', fontFamily: bodySerif, marginBottom: 6, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  dot: { width: 36, height: 36, borderRadius: 0, alignItems: 'center', justifyContent: 'center' },
  dotFilled: { backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A' },
  dotEmpty: { backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#E0D8C8' },
  dotText: { fontSize: 14, fontWeight: '700', color: '#B8963E', fontFamily: serif },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: {
    width: '48%' as any, backgroundColor: '#FAF8F3', borderRadius: 0, padding: 14,
    marginBottom: 10, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  statLabel: { fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 2, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
});

export default CheckInScreen;
