import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import { getStreak, getWeekDates, getCheckIn, CheckInData } from '../utils/storage';
import storage from '../utils/storage';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const SCORE_WEIGHTS = [
  { key: 'mood', label: 'Mood', weight: 30 },
  { key: 'sleep', label: 'Sleep', weight: 25 },
  { key: 'water', label: 'Water', weight: 20 },
  { key: 'breathing', label: 'Breathing', weight: 15 },
  { key: 'journal', label: 'Journal', weight: 10 },
];

const getWellnessScore = (): number => {
  const dates = getWeekDates();
  const checkins = dates.map(d => getCheckIn(d)).filter(Boolean) as CheckInData[];
  const n = checkins.length || 1;
  const moodScore = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.mood, 0) / n) / 5 * 100 : 0;
  const sleepScore = checkins.length > 0 ? Math.min(((checkins.reduce((s, c) => s + c.sleep, 0) / n) / 8) * 100, 100) : 0;
  const waterScore = checkins.length > 0 ? Math.min(((checkins.reduce((s, c) => s + c.water, 0) / n) / 8) * 100, 100) : 0;
  let breathDays = 0;
  let journalDays = 0;
  dates.forEach(d => {
    if (storage.getJSON(`wellth_breathing_${d}`, null)) breathDays++;
    if (storage.getJSON(`wellth_journal_${d}`, null)) journalDays++;
  });
  const breathScore = (breathDays / 7) * 100;
  const journalScore = (journalDays / 7) * 100;
  const scores: Record<string, number> = { mood: moodScore, sleep: sleepScore, water: waterScore, breathing: breathScore, journal: journalScore };
  return Math.round(SCORE_WEIGHTS.reduce((s, w) => s + ((scores[w.key] || 0) * w.weight / 100), 0));
};

const ShareStreakScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const streak = getStreak();
  const score = getWellnessScore();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<any>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Build last 7 days
  const segments = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hasCheckIn = !!getCheckIn(key);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
    segments.push({ key, hasCheckIn, dayLabel, isToday: i === 0 });
  }

  const shareText = `I'm on a ${streak}-day wellness streak with a score of ${score} on Wellth. Growing my wellth, one day at a time.`;

  const handleCopyText = () => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (Platform.OS === 'web' && navigator.share) {
      try {
        await navigator.share({ title: 'My Wellth Streak', text: shareText, url: 'https://wellth-app.vercel.app' });
      } catch {}
    } else {
      handleCopyText();
    }
  };

  const handleDownloadCard = () => {
    if (Platform.OS !== 'web') return;
    // Generate a simple SVG card for download
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#FFFFFF"/>
      <rect x="0" y="0" width="600" height="6" fill="#B8963E"/>
      <rect x="0" y="394" width="600" height="6" fill="#B8963E"/>
      <rect x="0" y="0" width="6" height="400" fill="#B8963E"/>
      <rect x="594" y="0" width="6" height="400" fill="#B8963E"/>
      <text x="300" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#BBAA88" letter-spacing="3">MY WELLTH</text>
      <text x="300" y="140" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#B8963E">${streak}</text>
      <text x="300" y="175" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#8A7A5A">${streak === 1 ? 'day' : 'days'} consistent</text>
      <text x="300" y="230" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#BBAA88" letter-spacing="2">WELLNESS SCORE</text>
      <text x="300" y="270" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#B8963E">${score}</text>
      <text x="300" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#BBAA88" font-style="italic">Grow your wellth. Nourish your wellness.</text>
      <text x="300" y="370" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#CCBBAA">${dateStr}</text>
    </svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellth-streak-${streak}days.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ maxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40 }}>
      {/* Back button */}
      <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginBottom: 24 }} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={{ fontSize: 14, color: '#B8963E', fontFamily: bodySerif }}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
        Share Your Streak
      </Text>
      <Text style={{ fontSize: 24, color: '#3A3A3A', fontFamily: serif, fontWeight: '600', marginBottom: 24 }} accessibilityRole="header" aria-level={1}>
        Celebrate Your Progress
      </Text>

      {/* Shareable Card Preview */}
      <View ref={cardRef} style={{
        backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#B8963E',
        padding: 32, marginBottom: 24, alignItems: 'center',
      }}>
        <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 20 }}>
          MY WELLTH
        </Text>

        <Text style={{ fontSize: 64, fontWeight: '700', color: '#B8963E', fontFamily: serif, lineHeight: 72 }}>
          {streak}
        </Text>
        <Text style={{ fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif, marginBottom: 20 }}>
          {streak === 1 ? 'day' : 'days'} consistent
        </Text>

        {/* 7-day visualization */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, width: '100%', justifyContent: 'center' }}>
          {segments.map(seg => (
            <View key={seg.key} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 36, height: 28,
                backgroundColor: seg.hasCheckIn ? '#B8963E' : '#F0E8D8',
                borderWidth: seg.isToday ? 2 : 0, borderColor: '#8A7030',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {seg.hasCheckIn && (
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{'\u2713'}</Text>
                )}
              </View>
              <Text style={{ fontSize: 9, color: seg.isToday ? '#B8963E' : '#999', fontFamily: bodySerif, textTransform: 'uppercase' }}>
                {seg.dayLabel}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ width: 40, height: 1, backgroundColor: '#D4B96A', marginBottom: 16 }} />

        <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          Wellness Score
        </Text>
        <Text style={{ fontSize: 36, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 16 }}>
          {score}
        </Text>

        <Text style={{ fontSize: 12, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic' }}>
          Grow your wellth. Nourish your wellness.
        </Text>
        <Text style={{ fontSize: 10, color: '#CCBBAA', fontFamily: bodySerif, marginTop: 8 }}>
          {dateStr}
        </Text>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        onPress={handleShare}
        style={{
          backgroundColor: '#B8963E', paddingVertical: 16, alignItems: 'center',
          marginBottom: 12, borderWidth: 1.5, borderColor: '#B8963E',
        }}
        activeOpacity={0.7}
        {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 }}>
          {typeof navigator !== 'undefined' && navigator.share ? 'Share' : 'Copy to Clipboard'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDownloadCard}
        style={{
          backgroundColor: '#FFFFFF', paddingVertical: 16, alignItems: 'center',
          marginBottom: 12, borderWidth: 1.5, borderColor: '#D4B96A',
        }}
        activeOpacity={0.7}
        {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#B8963E', fontFamily: bodySerif, letterSpacing: 0.5 }}>
          Download Card
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleCopyText}
        style={{
          backgroundColor: '#FFFFFF', paddingVertical: 16, alignItems: 'center',
          marginBottom: 24, borderWidth: 1, borderColor: '#EDE3CC',
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, letterSpacing: 0.5 }}>
          {copied ? 'Copied!' : 'Copy Text'}
        </Text>
      </TouchableOpacity>

      {/* Preview text */}
      <View style={{ backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#EDE3CC', padding: 20 }}>
        <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
          Share Text Preview
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 24, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic' }}>
          {shareText}
        </Text>
      </View>
    </ScrollView>
  );
};

export default ShareStreakScreen;
