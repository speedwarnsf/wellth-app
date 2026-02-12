import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import storage, { getCheckIn, getWeekDates, CheckInData, getStreak } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];
const HYDRATION_PREFIX = 'wellth_hydration_';
const JOURNAL_PREFIX = 'wellth_journal_';

interface WeekStats {
  checkins: number;
  avgMood: number;
  avgWater: number;
  avgSleep: number;
  exerciseDays: number;
  totalGlasses: number;
  journalEntries: number;
  bestDay: string | null;
  moodTrend: number[]; // daily moods
  sleepTrend: number[]; // daily sleep
  waterTrend: number[]; // daily water (from hydration tracker)
}

const getInsights = (stats: WeekStats, streak: number): string[] => {
  const insights: string[] = [];

  if (stats.checkins === 7) insights.push("🌟 Perfect week! You checked in every single day.");
  else if (stats.checkins >= 5) insights.push(`📝 Solid consistency — ${stats.checkins}/7 check-ins this week.`);
  else if (stats.checkins > 0) insights.push(`📝 ${stats.checkins} check-in${stats.checkins > 1 ? 's' : ''} this week. Try to build the habit!`);

  if (stats.avgMood >= 4) insights.push("😄 Your mood has been great this week! Keep doing what you're doing.");
  else if (stats.avgMood >= 3) insights.push("🙂 Steady mood this week. Small wins add up.");
  else if (stats.avgMood > 0) insights.push("💛 Tougher week mood-wise. Be gentle with yourself — better days are ahead.");

  if (stats.avgSleep >= 7.5) insights.push("😴 Excellent sleep habits! You're averaging over 7.5 hours.");
  else if (stats.avgSleep >= 6.5) insights.push("🛏️ Decent sleep, but aiming for 7-8 hours could help even more.");
  else if (stats.avgSleep > 0) insights.push("⚠️ Sleep is below 6.5 hours on average. Your body needs more rest.");

  if (stats.avgWater >= 8) insights.push("💧 Hydration champion! Great water intake this week.");
  else if (stats.avgWater >= 5) insights.push("💧 Good hydration. Try adding one more glass per day.");
  else if (stats.avgWater > 0) insights.push("💧 Your water intake could use a boost. Aim for 8 glasses daily.");

  if (stats.exerciseDays >= 5) insights.push("🏃 Active lifestyle! " + stats.exerciseDays + " exercise days this week.");
  else if (stats.exerciseDays >= 3) insights.push("🏃 " + stats.exerciseDays + " exercise days — nice momentum!");
  else if (stats.exerciseDays > 0) insights.push("🏃 " + stats.exerciseDays + " exercise day" + (stats.exerciseDays > 1 ? 's' : '') + ". Can you add one more next week?");

  if (stats.journalEntries >= 5) insights.push("📖 Reflective week — " + stats.journalEntries + " journal entries. Writing heals.");
  else if (stats.journalEntries > 0) insights.push("📖 " + stats.journalEntries + " journal entr" + (stats.journalEntries > 1 ? 'ies' : 'y') + ". Keep reflecting!");

  if (streak >= 7) insights.push("🔥 You're on a " + streak + "-day streak! Incredible discipline.");

  return insights;
};

const getWellnessScore = (stats: WeekStats): number => {
  let score = 0;
  // Checkins: up to 20 points
  score += Math.min(stats.checkins / 7, 1) * 20;
  // Mood: up to 20 points
  if (stats.avgMood > 0) score += (stats.avgMood / 5) * 20;
  // Sleep: up to 20 points (7-9 hrs is optimal)
  if (stats.avgSleep > 0) {
    const sleepScore = stats.avgSleep >= 7 && stats.avgSleep <= 9 ? 1 : stats.avgSleep >= 6 ? 0.7 : 0.4;
    score += sleepScore * 20;
  }
  // Water: up to 20 points
  if (stats.avgWater > 0) score += Math.min(stats.avgWater / 8, 1) * 20;
  // Exercise: up to 20 points
  score += Math.min(stats.exerciseDays / 5, 1) * 20;
  return Math.round(score);
};

const WeeklyReportScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);

  const [stats, setStats] = useState<WeekStats>({
    checkins: 0, avgMood: 0, avgWater: 0, avgSleep: 0,
    exerciseDays: 0, totalGlasses: 0, journalEntries: 0,
    bestDay: null, moodTrend: [], sleepTrend: [], waterTrend: [],
  });
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const dates = getWeekDates();
    const checkins: (CheckInData | null)[] = dates.map(d => getCheckIn(d));
    const validCheckins = checkins.filter(Boolean) as CheckInData[];

    const moodTrend = checkins.map(c => c?.mood || 0);
    const sleepTrend = checkins.map(c => c?.sleep || 0);
    const waterTrend = dates.map(d => {
      const hydration = storage.getJSON<{ glasses: number } | null>(`${HYDRATION_PREFIX}${d}`, null);
      return hydration?.glasses || (getCheckIn(d)?.water || 0);
    });

    let journalEntries = 0;
    dates.forEach(d => {
      if (storage.getJSON(`${JOURNAL_PREFIX}${d}`, null)) journalEntries++;
    });

    // Best day = highest mood
    let bestDay: string | null = null;
    let bestMood = 0;
    dates.forEach((d, i) => {
      const c = checkins[i];
      if (c && c.mood > bestMood) {
        bestMood = c.mood;
        bestDay = d;
      }
    });

    setStats({
      checkins: validCheckins.length,
      avgMood: validCheckins.length > 0
        ? validCheckins.reduce((s, c) => s + c.mood, 0) / validCheckins.length : 0,
      avgWater: validCheckins.length > 0
        ? validCheckins.reduce((s, c) => s + c.water, 0) / validCheckins.length : 0,
      avgSleep: validCheckins.length > 0
        ? validCheckins.reduce((s, c) => s + c.sleep, 0) / validCheckins.length : 0,
      exerciseDays: validCheckins.filter(c => c.exercise).length,
      totalGlasses: waterTrend.reduce((s, g) => s + g, 0),
      journalEntries,
      bestDay,
      moodTrend,
      sleepTrend,
      waterTrend,
    });
    setStreak(getStreak());
  }, []);

  const score = getWellnessScore(stats);
  const insights = getInsights(stats, streak);
  const dates = getWeekDates();

  const getScoreLabel = (s: number) => {
    if (s >= 80) return { label: 'Excellent', emoji: '🌟', color: '#4CAF50' };
    if (s >= 60) return { label: 'Good', emoji: '👍', color: '#B8963E' };
    if (s >= 40) return { label: 'Fair', emoji: '🙂', color: '#FF9800' };
    return { label: 'Getting Started', emoji: '🌱', color: '#8A7A5A' };
  };

  const scoreInfo = getScoreLabel(score);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Weekly Report</Text>
      <Text style={styles.subtitle}>Your wellness at a glance 🦉</Text>

      {/* Wellness Score */}
      <View style={styles.scoreCard}>
        {Platform.OS === 'web' ? (
          <div style={{
            width: 160, height: 160, borderRadius: '50%', position: 'relative',
            background: `conic-gradient(${scoreInfo.color} ${score}%, #EDE3CC ${score}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <div style={{
              width: 130, height: 130, borderRadius: '50%', backgroundColor: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <span style={{ fontSize: 36, fontWeight: '700', color: scoreInfo.color, fontFamily: '"Playfair Display", Georgia, serif' }}>
                {score}
              </span>
              <span style={{ fontSize: 12, color: '#8A7A5A', fontFamily: 'Georgia, serif' }}>/ 100</span>
            </div>
          </div>
        ) : (
          <View style={styles.scoreBubble}>
            <Text style={[styles.scoreNum, { color: scoreInfo.color }]}>{score}</Text>
            <Text style={styles.scoreOf}>/ 100</Text>
          </View>
        )}
        <Text style={styles.scoreLabel}>{scoreInfo.emoji} {scoreInfo.label}</Text>
      </View>

      {/* Stat Grid */}
      <View style={styles.statGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>{stats.avgMood >= 4 ? '😄' : stats.avgMood >= 3 ? '🙂' : stats.avgMood > 0 ? '😐' : '—'}</Text>
          <Text style={styles.statValue}>{stats.avgMood > 0 ? stats.avgMood.toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>Avg Mood</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>😴</Text>
          <Text style={styles.statValue}>{stats.avgSleep > 0 ? stats.avgSleep.toFixed(1) + 'h' : '—'}</Text>
          <Text style={styles.statLabel}>Avg Sleep</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>💧</Text>
          <Text style={styles.statValue}>{stats.totalGlasses}</Text>
          <Text style={styles.statLabel}>Total Glasses</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🏃</Text>
          <Text style={styles.statValue}>{stats.exerciseDays}</Text>
          <Text style={styles.statLabel}>Exercise Days</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>📝</Text>
          <Text style={styles.statValue}>{stats.checkins}/7</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>📖</Text>
          <Text style={styles.statValue}>{stats.journalEntries}</Text>
          <Text style={styles.statLabel}>Journal</Text>
        </View>
      </View>

      {/* Mood Trend */}
      {stats.moodTrend.some(m => m > 0) && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>Mood This Week</Text>
          <View style={styles.trendRow}>
            {dates.map((d, i) => {
              const mood = stats.moodTrend[i];
              const dayLabel = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              return (
                <View key={i} style={styles.trendCol}>
                  <Text style={{ fontSize: 20 }}>{mood > 0 ? MOODS[mood - 1] : '·'}</Text>
                  <Text style={styles.trendDay}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Sleep Trend */}
      {stats.sleepTrend.some(s => s > 0) && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>Sleep This Week</Text>
          <View style={styles.chartRow}>
            {dates.map((d, i) => {
              const sleep = stats.sleepTrend[i];
              const barHeight = sleep > 0 ? Math.max(8, (sleep / 10) * 80) : 4;
              const dayLabel = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              const color = sleep >= 7 ? '#B8963E' : sleep >= 6 ? '#D4B96A' : sleep > 0 ? '#CCBBAA' : '#EDE3CC';
              return (
                <View key={i} style={styles.chartCol}>
                  {sleep > 0 && <Text style={styles.chartVal}>{sleep}h</Text>}
                  <View style={[styles.chartBar, { height: barHeight, backgroundColor: color }]} />
                  <Text style={styles.chartDay}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Water Trend */}
      {stats.waterTrend.some(w => w > 0) && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>Water This Week</Text>
          <View style={styles.chartRow}>
            {dates.map((d, i) => {
              const water = stats.waterTrend[i];
              const barHeight = water > 0 ? Math.max(8, (water / 12) * 80) : 4;
              const dayLabel = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              return (
                <View key={i} style={styles.chartCol}>
                  {water > 0 && <Text style={styles.chartVal}>{water}</Text>}
                  <View style={[styles.chartBar, { height: barHeight, backgroundColor: water >= 8 ? '#4A90D9' : '#87CEEB' }]} />
                  <Text style={styles.chartDay}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>🦉 Owl's Insights</Text>
          {insights.map((insight, i) => (
            <Text key={i} style={styles.insightText}>{insight}</Text>
          ))}
        </View>
      )}

      {/* Best Day */}
      {stats.bestDay && (
        <View style={styles.bestDayCard}>
          <Text style={styles.bestDayTitle}>⭐ Best Day</Text>
          <Text style={styles.bestDayText}>
            {new Date(stats.bestDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      <Text style={styles.footer}>Keep building your wellness, one day at a time.</Text>

      <QuickNav navigation={navigation} currentScreen="WeeklyReport" />
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

  scoreCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, marginBottom: 20, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  scoreBubble: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFF9EE',
    borderWidth: 6, borderColor: '#D4B96A', alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 36, fontWeight: '700', fontFamily: serif },
  scoreOf: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif },
  scoreLabel: { fontSize: 18, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginTop: 12 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statBox: {
    width: '31%' as any, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 10, alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 8px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 1 }),
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  statLabel: { fontSize: 11, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 2, textAlign: 'center' },

  trendCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 12px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 }),
  },
  trendTitle: { fontSize: 16, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 14, textAlign: 'center' },
  trendRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  trendCol: { alignItems: 'center', gap: 4 },
  trendDay: { fontSize: 11, color: '#999', fontFamily: bodySerif },

  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: 100 },
  chartCol: { alignItems: 'center', gap: 4 },
  chartVal: { fontSize: 11, fontWeight: '600', color: '#B8963E', fontFamily: bodySerif },
  chartBar: { width: 28, borderRadius: 6, minHeight: 4 },
  chartDay: { fontSize: 11, color: '#999', fontFamily: bodySerif },

  insightsCard: {
    backgroundColor: '#FFF9EE', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#D4B96A',
  },
  insightsTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 12 },
  insightText: { fontSize: 15, lineHeight: 24, color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 8 },

  bestDayCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#D4B96A',
  },
  bestDayTitle: { fontSize: 16, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  bestDayText: { fontSize: 15, color: '#3A3A3A', fontFamily: bodySerif, marginTop: 4 },

  footer: {
    textAlign: 'center', fontSize: 14, color: '#BBAA88', fontStyle: 'italic',
    fontFamily: bodySerif, marginTop: 8,
  },
});

export default WeeklyReportScreen;
