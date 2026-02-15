import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform, useWindowDimensions,
} from 'react-native';
import { getCheckIn, getStreak, getWeekDates, CheckInData } from '../utils/storage';
import storage from '../utils/storage';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

interface Badge {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'hydration' | 'mindfulness' | 'sleep' | 'journal' | 'special';
  earned: boolean;
  earnedDate?: string;
  progress: number; // 0-100
  requirement: string;
}

const categoryColors: Record<string, string> = {
  streak: '#B8963E',
  hydration: '#4A90D9',
  mindfulness: '#8BC34A',
  sleep: '#6A5ACD',
  journal: '#D4B96A',
  special: '#D4536A',
};

const categoryLabels: Record<string, string> = {
  streak: 'CONSISTENCY',
  hydration: 'HYDRATION',
  mindfulness: 'MINDFULNESS',
  sleep: 'SLEEP',
  journal: 'REFLECTION',
  special: 'SPECIAL',
};

const computeBadges = (): Badge[] => {
  const streak = getStreak();
  const now = new Date();
  const badges: Badge[] = [];

  // --- Streak Badges ---
  const streakBadges = [
    { id: 'first_step', title: 'First Step', desc: 'Complete your first check-in.', req: 1 },
    { id: 'three_day', title: 'Building Momentum', desc: '3 days in a row.', req: 3 },
    { id: 'first_week', title: 'First Week', desc: '7 consecutive days of check-ins.', req: 7 },
    { id: 'two_weeks', title: 'Fortnight Strong', desc: '14 days of dedication.', req: 14 },
    { id: 'three_weeks', title: 'The Habit', desc: '21 days — science says it is a habit now.', req: 21 },
    { id: 'thirty_day', title: '30 Day Warrior', desc: 'A full month of consistency.', req: 30 },
    { id: 'sixty_day', title: 'Unstoppable', desc: '60 days. Truly committed.', req: 60 },
    { id: 'ninety_day', title: 'Quarter Year', desc: '90 days of wellness.', req: 90 },
    { id: 'year_one', title: 'The Year', desc: '365 days. Legendary.', req: 365 },
  ];

  streakBadges.forEach(sb => {
    badges.push({
      id: sb.id, title: sb.title, description: sb.desc, category: 'streak',
      earned: streak >= sb.req,
      progress: Math.min((streak / sb.req) * 100, 100),
      requirement: `${sb.req}-day streak`,
    });
  });

  // --- Hydration Badges ---
  let totalWaterDays = 0;
  let perfectWaterDays = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const checkin = getCheckIn(d.toISOString().slice(0, 10));
    if (checkin && checkin.water > 0) totalWaterDays++;
    if (checkin && checkin.water >= 8) perfectWaterDays++;
  }

  badges.push({
    id: 'hydration_start', title: 'First Sip', description: 'Log water for the first time.',
    category: 'hydration', earned: totalWaterDays >= 1,
    progress: Math.min(totalWaterDays / 1 * 100, 100), requirement: 'Log water once',
  });
  badges.push({
    id: 'hydration_hero', title: 'Hydration Hero', description: 'Hit 8+ glasses in a single day.',
    category: 'hydration', earned: perfectWaterDays >= 1,
    progress: Math.min(perfectWaterDays / 1 * 100, 100), requirement: '8+ glasses in one day',
  });
  badges.push({
    id: 'hydration_week', title: 'Water Week', description: '7 days of 8+ glasses.',
    category: 'hydration', earned: perfectWaterDays >= 7,
    progress: Math.min(perfectWaterDays / 7 * 100, 100), requirement: '7 days at 8+ glasses',
  });

  // --- Mindfulness Badges ---
  let breathDays = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (storage.getJSON(`wellth_breathing_${d.toISOString().slice(0, 10)}`, null)) breathDays++;
  }

  badges.push({
    id: 'first_breath', title: 'First Breath', description: 'Complete your first breathing session.',
    category: 'mindfulness', earned: breathDays >= 1,
    progress: Math.min(breathDays / 1 * 100, 100), requirement: 'One breathing session',
  });
  badges.push({
    id: 'mindful_week', title: 'Mindful Week', description: '7 breathing sessions.',
    category: 'mindfulness', earned: breathDays >= 7,
    progress: Math.min(breathDays / 7 * 100, 100), requirement: '7 breathing sessions',
  });
  badges.push({
    id: 'mindful_master', title: 'Mindful Master', description: '30 breathing sessions. True inner calm.',
    category: 'mindfulness', earned: breathDays >= 30,
    progress: Math.min(breathDays / 30 * 100, 100), requirement: '30 breathing sessions',
  });

  // --- Sleep Badges ---
  let goodSleepDays = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const checkin = getCheckIn(d.toISOString().slice(0, 10));
    if (checkin && checkin.sleep >= 7) goodSleepDays++;
  }

  badges.push({
    id: 'sleep_well', title: 'Well Rested', description: 'Log 7+ hours of sleep.',
    category: 'sleep', earned: goodSleepDays >= 1,
    progress: Math.min(goodSleepDays / 1 * 100, 100), requirement: '7+ hours once',
  });
  badges.push({
    id: 'sleep_week', title: 'Sleep Champion', description: '7 days of 7+ hours sleep.',
    category: 'sleep', earned: goodSleepDays >= 7,
    progress: Math.min(goodSleepDays / 7 * 100, 100), requirement: '7 days at 7+ hours',
  });

  // --- Journal Badges ---
  let journalDays = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (storage.getJSON(`wellth_journal_${d.toISOString().slice(0, 10)}`, null)) journalDays++;
  }

  badges.push({
    id: 'first_entry', title: 'First Words', description: 'Write your first journal entry.',
    category: 'journal', earned: journalDays >= 1,
    progress: Math.min(journalDays / 1 * 100, 100), requirement: 'One journal entry',
  });
  badges.push({
    id: 'journal_week', title: 'Reflective Week', description: '7 journal entries.',
    category: 'journal', earned: journalDays >= 7,
    progress: Math.min(journalDays / 7 * 100, 100), requirement: '7 journal entries',
  });
  badges.push({
    id: 'journal_master', title: 'Deep Thinker', description: '30 journal entries. A true chronicler.',
    category: 'journal', earned: journalDays >= 30,
    progress: Math.min(journalDays / 30 * 100, 100), requirement: '30 journal entries',
  });

  return badges;
};

const AchievementsScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { setBadges(computeBadges()); }, []);

  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;

  const filtered = filter === 'all' ? badges : filter === 'earned' ? badges.filter(b => b.earned) : badges.filter(b => b.category === filter);

  const categories = ['all', 'earned', 'streak', 'hydration', 'mindfulness', 'sleep', 'journal'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ maxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginBottom: 24 }} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={{ fontSize: 14, color: '#B8963E', fontFamily: bodySerif }}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
        Your Achievements
      </Text>
      <Text style={{ fontSize: 24, color: '#3A3A3A', fontFamily: serif, fontWeight: '600', marginBottom: 8 }} accessibilityRole="header" aria-level={1}>
        Badges Earned
      </Text>

      {/* Progress */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif }}>{earned} of {total} badges earned</Text>
          <Text style={{ fontSize: 13, color: '#B8963E', fontFamily: bodySerif, fontWeight: '600' }}>{Math.round(earned / total * 100)}%</Text>
        </View>
        <View style={{ height: 8, backgroundColor: '#F0E8D8', width: '100%' }}>
          <View style={{ height: '100%', backgroundColor: '#B8963E', width: `${(earned / total) * 100}%` }} />
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setFilter(c)}
              style={{
                paddingVertical: 8, paddingHorizontal: 14,
                borderWidth: 1.5,
                borderColor: filter === c ? '#B8963E' : '#EDE3CC',
                backgroundColor: filter === c ? '#FFF9EE' : '#FFFFFF',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 10, fontWeight: '600', fontFamily: bodySerif,
                color: filter === c ? '#B8963E' : '#8A7A5A',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>{c === 'all' ? 'All' : c === 'earned' ? 'Earned' : categoryLabels[c] || c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Badge Grid */}
      {filtered.map(badge => (
        <View key={badge.id} style={{
          borderWidth: badge.earned ? 1.5 : 1,
          borderColor: badge.earned ? '#D4B96A' : '#EDE3CC',
          backgroundColor: badge.earned ? '#FFFFFF' : '#FAFAFA',
          padding: 20, marginBottom: 12,
          opacity: badge.earned ? 1 : 0.6,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 9, fontWeight: '700', fontFamily: bodySerif,
                color: categoryColors[badge.category] || '#BBAA88',
                textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
              }}>{categoryLabels[badge.category]}</Text>
              <Text style={{
                fontSize: 17, fontWeight: '600', color: badge.earned ? '#3A3A3A' : '#999',
                fontFamily: serif, marginBottom: 4,
              }}>{badge.title}</Text>
              <Text style={{
                fontSize: 13, color: badge.earned ? '#8A7A5A' : '#BBAA88',
                fontFamily: bodySerif, lineHeight: 20,
              }}>{badge.description}</Text>
            </View>
            {badge.earned && (
              <View style={{
                width: 36, height: 36, backgroundColor: categoryColors[badge.category] || '#B8963E',
                alignItems: 'center', justifyContent: 'center', marginLeft: 12,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{'\u2713'}</Text>
              </View>
            )}
          </View>

          {!badge.earned && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif }}>{badge.requirement}</Text>
                <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif }}>{Math.round(badge.progress)}%</Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#F0E8D8', width: '100%' }}>
                <View style={{ height: '100%', backgroundColor: categoryColors[badge.category] || '#D4B96A', width: `${badge.progress}%` }} />
              </View>
            </View>
          )}
        </View>
      ))}

      {filtered.length === 0 && (
        <View style={{ padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#EDE3CC' }}>
          <Text style={{ fontSize: 15, color: '#8A7A5A', fontFamily: serif, fontStyle: 'italic' }}>
            No badges in this category yet.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default AchievementsScreen;
