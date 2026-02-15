import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions, Share,
} from 'react-native';
import storage, { getCheckIn, getStreak, CheckInData } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const CHECKIN_PREFIX = 'wellth_checkin_';
const JOURNAL_PREFIX = 'wellth_journal_';
const HYDRATION_PREFIX = 'wellth_hydration_';
const BREATHING_PREFIX = 'wellth_breathing_';
const MOOD_LABELS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface JourneyStats {
  totalCheckIns: number;
  longestStreak: number;
  currentStreak: number;
  totalJournalEntries: number;
  totalWordsWritten: number;
  avgMood: number;
  moodByMonth: { month: string; avg: number; count: number }[];
  hydrationConsistency: number; // percentage of days with 6+ glasses
  breathingSessions: number;
  mostActiveDay: string;
  totalDaysTracked: number;
  firstCheckInDate: string | null;
}

// Get all dates from start of tracking to today
const getAllDates = (): string[] => {
  const dates: string[] = [];
  const now = new Date();
  // Go back up to 365 days
  for (let i = 365; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

const computeJourneyStats = (): JourneyStats => {
  const allDates = getAllDates();
  let totalCheckIns = 0;
  let longestStreak = 0;
  let currentRun = 0;
  let totalJournalEntries = 0;
  let totalWordsWritten = 0;
  let moodSum = 0;
  let moodCount = 0;
  let hydrationGoodDays = 0;
  let hydrationTotalDays = 0;
  let breathingSessions = 0;
  let firstCheckInDate: string | null = null;
  const dayCount: number[] = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const monthMoods: Record<string, { sum: number; count: number }> = {};

  for (const date of allDates) {
    const checkin = getCheckIn(date);
    const journal = storage.getJSON<any>(`${JOURNAL_PREFIX}${date}`, null);
    const hydration = storage.getJSON<any>(`${HYDRATION_PREFIX}${date}`, null);
    const breathing = storage.getJSON<any>(`${BREATHING_PREFIX}${date}`, null);

    if (checkin) {
      totalCheckIns++;
      if (!firstCheckInDate) firstCheckInDate = date;
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;

      moodSum += checkin.mood;
      moodCount++;

      const d = new Date(date + 'T12:00:00');
      dayCount[d.getDay()]++;

      // Monthly mood tracking
      const monthKey = date.slice(0, 7);
      if (!monthMoods[monthKey]) monthMoods[monthKey] = { sum: 0, count: 0 };
      monthMoods[monthKey].sum += checkin.mood;
      monthMoods[monthKey].count++;
    } else {
      currentRun = 0;
    }

    if (journal) {
      totalJournalEntries++;
      const text = journal.text || journal.entry || '';
      totalWordsWritten += text.split(/\s+/).filter((w: string) => w.length > 0).length;
    }

    if (hydration) {
      hydrationTotalDays++;
      const glasses = hydration.glasses || 0;
      if (glasses >= 6) hydrationGoodDays++;
    }

    if (breathing) {
      breathingSessions++;
    }
  }

  // Most active day of week
  const maxDayIdx = dayCount.indexOf(Math.max(...dayCount));
  const mostActiveDay = Math.max(...dayCount) > 0 ? DAY_NAMES[maxDayIdx] : 'N/A';

  // Mood by month
  const moodByMonth = Object.entries(monthMoods)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // last 6 months
    .map(([month, data]) => ({
      month: new Date(month + '-15').toLocaleDateString('en-US', { month: 'short' }),
      avg: data.sum / data.count,
      count: data.count,
    }));

  return {
    totalCheckIns,
    longestStreak,
    currentStreak: getStreak(),
    totalJournalEntries,
    totalWordsWritten,
    avgMood: moodCount > 0 ? moodSum / moodCount : 0,
    moodByMonth,
    hydrationConsistency: hydrationTotalDays > 0 ? (hydrationGoodDays / hydrationTotalDays) * 100 : 0,
    breathingSessions,
    mostActiveDay,
    totalDaysTracked: totalCheckIns,
    firstCheckInDate,
  };
};

const getMotivationalMessage = (stats: JourneyStats): string => {
  if (stats.totalCheckIns === 0) {
    return 'Your journey begins with a single step. Start your first check-in today.';
  }
  const parts: string[] = [];
  if (stats.longestStreak >= 30) {
    parts.push(`A ${stats.longestStreak}-day streak speaks volumes about your dedication.`);
  } else if (stats.longestStreak >= 7) {
    parts.push(`${stats.longestStreak} days in a row -- you are building real consistency.`);
  }
  if (stats.totalWordsWritten > 1000) {
    parts.push(`Over ${Math.floor(stats.totalWordsWritten / 100) * 100} words journaled. You have given your thoughts a voice.`);
  }
  if (stats.avgMood >= 3.5) {
    parts.push('Your average mood reflects someone choosing growth.');
  }
  if (stats.breathingSessions >= 10) {
    parts.push(`${stats.breathingSessions} breathing sessions. You have made stillness a practice.`);
  }
  if (stats.hydrationConsistency >= 70) {
    parts.push('Your hydration consistency is strong. Your body thanks you.');
  }
  if (parts.length === 0) {
    parts.push('Every check-in is a declaration that you matter. Keep going.');
  }
  return parts.join(' ');
};

const generateShareText = (stats: JourneyStats): string => {
  const lines = ['My Wellth Journey'];
  if (stats.firstCheckInDate) {
    lines.push(`Tracking since ${new Date(stats.firstCheckInDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
  }
  lines.push('');
  lines.push(`${stats.totalCheckIns} check-ins completed`);
  lines.push(`${stats.longestStreak}-day longest streak`);
  if (stats.totalJournalEntries > 0) {
    lines.push(`${stats.totalJournalEntries} journal entries, ${stats.totalWordsWritten.toLocaleString()} words`);
  }
  if (stats.breathingSessions > 0) {
    lines.push(`${stats.breathingSessions} breathing sessions`);
  }
  if (stats.avgMood > 0) {
    lines.push(`Average mood: ${stats.avgMood.toFixed(1)}/5`);
  }
  lines.push('');
  lines.push('Growing my wellth, one day at a time.');
  lines.push('wellth.app');
  return lines.join('\n');
};

// ── SVG Bar Chart ────────────────────────────────────────
const MoodChart = ({ data }: { data: { month: string; avg: number; count: number }[] }) => {
  if (data.length === 0) return null;
  const chartW = 280;
  const chartH = 120;
  const barW = Math.min(32, (chartW - 20) / data.length - 8);
  const maxVal = 5;

  if (Platform.OS !== 'web') return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
      <svg width={chartW} height={chartH + 30} viewBox={`0 0 ${chartW} ${chartH + 30}`}>
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map(v => {
          const y = chartH - (v / maxVal) * chartH;
          return (
            <line key={v} x1={0} y1={y} x2={chartW} y2={y}
              stroke="#EDE3CC" strokeWidth={0.5} />
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = (i * (chartW / data.length)) + (chartW / data.length - barW) / 2;
          const h = (d.avg / maxVal) * chartH;
          const y = chartH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill="#B8963E" opacity={0.85} />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle"
                fill="#8A7A5A" fontSize={10} fontFamily="Georgia, serif">
                {d.avg.toFixed(1)}
              </text>
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle"
                fill="#BBAA88" fontSize={10} fontFamily="Georgia, serif">
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Hydration Gauge ──────────────────────────────────────
const HydrationGauge = ({ percent }: { percent: number }) => {
  if (Platform.OS !== 'web') return null;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const filled = (percent / 100) * circ;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#EDE3CC" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke="#87CEEB" strokeWidth={8}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="butt" />
        <text x={50} y={50} textAnchor="middle" dominantBaseline="central"
          fill="#4A90D9" fontSize={16} fontWeight="700" fontFamily="Georgia, serif">
          {Math.round(percent)}%
        </text>
      </svg>
    </div>
  );
};

// ── Stat Card ────────────────────────────────────────────
const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <View style={{
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC',
    padding: 18, flex: 1, marginHorizontal: 4, marginBottom: 8, alignItems: 'center',
  }}>
    <Text style={{
      fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
      textTransform: 'uppercase' as any, letterSpacing: 1.2, marginBottom: 8, textAlign: 'center',
    }}>{label}</Text>
    <Text style={{
      fontSize: 28, fontWeight: '700', color: '#B8963E',
      fontFamily: serif, lineHeight: 34,
    }}>{value}</Text>
    {sub ? (
      <Text style={{
        fontSize: 11, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 4, textAlign: 'center',
      }}>{sub}</Text>
    ) : null}
  </View>
);

const MyJourneyScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStats(computeJourneyStats());
  }, []);

  const handleShare = async () => {
    if (!stats) return;
    const text = generateShareText(stats);
    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({ text });
        } catch { /* user cancelled */ }
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } else {
      try {
        await Share.share({ message: text });
      } catch { /* cancelled */ }
    }
  };

  if (!stats) return null;

  const message = getMotivationalMessage(stats);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      {/* Header */}
      <View style={{ marginBottom: 28 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} activeOpacity={0.7} style={{ marginBottom: 16 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={{ fontSize: 14, color: '#B8963E', fontFamily: bodySerif }}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={{
          fontSize: 28, fontWeight: '700', color: '#3A3A3A',
          fontFamily: serif, marginBottom: 6,
        }} accessibilityRole="header" aria-level={1}>My Journey</Text>
        {stats.firstCheckInDate && (
          <Text style={{
            fontSize: 13, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic',
          }}>
            Tracking since {new Date(stats.firstCheckInDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        )}
      </View>

      {/* Motivational Message */}
      <View style={{
        backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A',
        padding: 22, marginBottom: 24, alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
          textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 10,
        }}>You Have Grown</Text>
        <Text style={{
          fontSize: 16, lineHeight: 28, color: '#3A3A3A', fontFamily: serif,
          fontStyle: 'italic', textAlign: 'center',
        }}>{message}</Text>
      </View>

      {/* Core Stats Row 1 */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        <StatCard label="Check-Ins" value={stats.totalCheckIns} />
        <StatCard label="Longest Streak" value={stats.longestStreak} sub="days" />
      </View>

      {/* Core Stats Row 2 */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        <StatCard label="Current Streak" value={stats.currentStreak} sub="days" />
        <StatCard label="Avg Mood" value={stats.avgMood > 0 ? stats.avgMood.toFixed(1) : '--'} sub={stats.avgMood > 0 ? MOOD_LABELS[Math.round(stats.avgMood)] : ''} />
      </View>

      {/* Mood Over Time Chart */}
      {stats.moodByMonth.length > 1 && (
        <View style={{
          backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC',
          padding: 20, marginBottom: 12,
        }}>
          <Text style={{
            fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
            textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 16, textAlign: 'center',
          }}>Average Mood Over Time</Text>
          <MoodChart data={stats.moodByMonth} />
        </View>
      )}

      {/* Journal Stats */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        <StatCard label="Journal Entries" value={stats.totalJournalEntries} />
        <StatCard label="Words Written" value={stats.totalWordsWritten > 999 ? `${(stats.totalWordsWritten / 1000).toFixed(1)}k` : stats.totalWordsWritten} />
      </View>

      {/* Hydration Consistency */}
      <View style={{
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC',
        padding: 20, marginBottom: 12,
      }}>
        <Text style={{
          fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
          textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 12, textAlign: 'center',
        }}>Hydration Consistency</Text>
        <HydrationGauge percent={stats.hydrationConsistency} />
        <Text style={{
          fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, textAlign: 'center',
        }}>Days meeting 6+ glasses goal</Text>
      </View>

      {/* Breathing & Active Day */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        <StatCard label="Breathing Sessions" value={stats.breathingSessions} />
        <StatCard label="Most Active Day" value={stats.mostActiveDay.slice(0, 3)} sub={stats.mostActiveDay} />
      </View>

      {/* Share Button */}
      <TouchableOpacity
        onPress={handleShare}
        activeOpacity={0.7}
        style={{
          backgroundColor: '#B8963E', paddingVertical: 16, alignItems: 'center',
          marginTop: 16, marginBottom: 8, borderWidth: 1.5, borderColor: '#B8963E',
        }}
        {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
      >
        <Text style={{
          fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5,
        }}>{copied ? 'Copied to Clipboard' : 'Share My Journey'}</Text>
      </TouchableOpacity>

      <Text style={{
        fontSize: 11, color: '#BBAA88', fontFamily: bodySerif, textAlign: 'center',
        marginBottom: 40, fontStyle: 'italic',
      }}>Generates a text summary you can share anywhere</Text>

      <QuickNav navigation={navigation} current="MyJourney" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAF8F3' },
  container: {
    padding: 28, paddingTop: Platform.OS === 'web' ? 48 : 60,
    width: '100%',
  },
});

export default MyJourneyScreen;
