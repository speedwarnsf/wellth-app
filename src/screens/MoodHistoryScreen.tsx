import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import { getCheckIn } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const MOOD_LABELS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];
const MOOD_COLORS: Record<number, string> = {
  1: '#C4836A',
  2: '#CCAA77',
  3: '#BBAA88',
  4: '#B8963E',
  5: '#8A9A5A',
};

interface DayData {
  date: string;
  mood: number | null;
  label: string;
}

const getLast30Days = (): DayData[] => {
  const days: DayData[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const checkin = getCheckIn(key);
    days.push({
      date: key,
      mood: checkin ? checkin.mood : null,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  return days;
};

const MoodHistoryScreen = ({ navigation }: { navigation: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [days, setDays] = useState<DayData[]>([]);

  useEffect(() => {
    setDays(getLast30Days());
  }, []);

  const daysWithMood = days.filter(d => d.mood !== null);
  const avgMood = daysWithMood.length > 0
    ? (daysWithMood.reduce((s, d) => s + (d.mood || 0), 0) / daysWithMood.length)
    : 0;
  const checkInRate = Math.round((daysWithMood.length / 30) * 100);

  // Trend: compare last 7 vs previous 7
  const last7 = days.slice(-7).filter(d => d.mood !== null);
  const prev7 = days.slice(-14, -7).filter(d => d.mood !== null);
  const last7Avg = last7.length > 0 ? last7.reduce((s, d) => s + (d.mood || 0), 0) / last7.length : 0;
  const prev7Avg = prev7.length > 0 ? prev7.reduce((s, d) => s + (d.mood || 0), 0) / prev7.length : 0;
  const trendDir = last7Avg > prev7Avg ? 'improving' : last7Avg < prev7Avg ? 'declining' : 'steady';

  // Chart dimensions
  const chartWidth = maxWidth - 56;
  const chartHeight = 160;
  const chartPadding = { top: 10, bottom: 30, left: 0, right: 0 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  // Build SVG path for area chart
  const points = days.map((d, i) => ({
    x: chartPadding.left + (i / (days.length - 1)) * plotWidth,
    y: d.mood !== null
      ? chartPadding.top + plotHeight - ((d.mood - 1) / 4) * plotHeight
      : null,
  }));

  // Line path (skip nulls)
  let linePath = '';
  let areaPath = '';
  const baseY = chartPadding.top + plotHeight;
  let started = false;
  for (const p of points) {
    if (p.y === null) { started = false; continue; }
    if (!started) {
      linePath += `M ${p.x} ${p.y} `;
      areaPath += `M ${p.x} ${baseY} L ${p.x} ${p.y} `;
      started = true;
    } else {
      linePath += `L ${p.x} ${p.y} `;
      areaPath += `L ${p.x} ${p.y} `;
    }
  }
  // Close area
  const lastPoint = [...points].reverse().find(p => p.y !== null);
  if (lastPoint) {
    areaPath += `L ${lastPoint.x} ${baseY} Z`;
  }

  const renderChart = () => {
    if (Platform.OS !== 'web') return null;
    if (daysWithMood.length < 2) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Check in for at least 2 days to see your mood chart.</Text>
        </View>
      );
    }

    // Show labels for every 5th day
    const labels = days.filter((_, i) => i % 5 === 0 || i === days.length - 1);

    return (
      <div style={{ marginBottom: 28 }}>
        <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map(v => {
            const y = chartPadding.top + plotHeight - ((v - 1) / 4) * plotHeight;
            return (
              <g key={v}>
                <line x1={0} y1={y} x2={chartWidth} y2={y} stroke="#F0E8D8" strokeWidth={1} />
                <text x={chartWidth + 4} y={y + 4} fontSize={9} fill="#BBAA88"
                  fontFamily="Georgia, serif">{MOOD_LABELS[v]}</text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="rgba(184,150,62,0.12)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#B8963E" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots */}
          {points.map((p, i) => p.y !== null ? (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#B8963E" stroke="#FFFFFF" strokeWidth={1.5} />
          ) : null)}

          {/* Date labels */}
          {labels.map((d) => {
            const idx = days.indexOf(d);
            const x = chartPadding.left + (idx / (days.length - 1)) * plotWidth;
            return (
              <text key={d.date} x={x} y={chartHeight - 4} fontSize={9} fill="#BBAA88"
                textAnchor="middle" fontFamily="Georgia, serif">{d.label}</text>
            );
          })}
        </svg>
      </div>
    ) as any;
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title} accessibilityRole="header" aria-level={1}>Mood History</Text>
      <Text style={styles.subtitle}>Your emotional landscape over 30 days</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{avgMood > 0 ? avgMood.toFixed(1) : '\u2014'}</Text>
          <Text style={styles.statLabel}>Avg Mood</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{checkInRate}%</Text>
          <Text style={styles.statLabel}>Check-in Rate</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, {
            color: trendDir === 'improving' ? '#8A9A5A' : trendDir === 'declining' ? '#C4836A' : '#B8963E',
          }]}>
            {trendDir === 'improving' ? '\u2191' : trendDir === 'declining' ? '\u2193' : '\u2194'}
          </Text>
          <Text style={styles.statLabel}>Trend</Text>
        </View>
      </View>

      {/* Chart */}
      {renderChart()}

      {/* Day grid */}
      <Text style={styles.gridTitle}>Daily Breakdown</Text>
      <View style={styles.dayGrid}>
        {days.map((d) => (
          <View key={d.date} style={[styles.dayCell, d.mood !== null && {
            backgroundColor: MOOD_COLORS[d.mood!] || '#EDE3CC',
          }]}>
            <Text style={[styles.dayCellDate, d.mood !== null && { color: '#FFFFFF' }]}>
              {new Date(d.date + 'T12:00:00').getDate()}
            </Text>
            {d.mood !== null && (
              <Text style={styles.dayCellMood}>{d.mood}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Insight */}
      {daysWithMood.length >= 7 && (
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Insight</Text>
          <Text style={styles.insightText}>
            {trendDir === 'improving'
              ? 'Your mood has been trending upward this week. Keep doing what feels right.'
              : trendDir === 'declining'
              ? 'Your mood has dipped recently. Consider what may have shifted, and be gentle with yourself.'
              : 'Your mood has been steady. Consistency in how you feel often reflects consistency in your habits.'}
          </Text>
        </View>
      )}

      <QuickNav navigation={navigation} currentScreen="MoodHistory" />
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
  subtitle: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 24 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statBox: {
    flex: 1, backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center',
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  statLabel: { fontSize: 11, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8, marginTop: 4 },

  emptyChart: { padding: 32, alignItems: 'center', marginBottom: 28 },
  emptyText: { fontSize: 15, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic', textAlign: 'center' },

  gridTitle: { fontSize: 14, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 12 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 28 },
  dayCell: {
    width: 38, height: 42, backgroundColor: '#F0E8D8', alignItems: 'center', justifyContent: 'center',
  },
  dayCellDate: { fontSize: 11, color: '#BBAA88', fontFamily: bodySerif, fontWeight: '600' },
  dayCellMood: { fontSize: 13, color: '#FFFFFF', fontFamily: serif, fontWeight: '700' },

  insightCard: {
    backgroundColor: '#FFF9EE', padding: 22, borderWidth: 1.5, borderColor: '#D4B96A', marginBottom: 24,
  },
  insightTitle: { fontSize: 12, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 8 },
  insightText: { fontSize: 16, lineHeight: 28, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic' },
});

export default MoodHistoryScreen;
