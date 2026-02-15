import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform, useWindowDimensions,
} from 'react-native';
import { getCheckIn, CheckInData, getStreak } from '../utils/storage';
import storage from '../utils/storage';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

interface TimelineEntry {
  date: string;
  dateLabel: string;
  type: 'checkin' | 'milestone' | 'streak' | 'journal' | 'breathing' | 'first';
  title: string;
  detail: string;
  score?: number;
}

const MILESTONE_STREAKS = [3, 7, 14, 21, 30, 60, 90, 180, 365];

const WellnessJourneyScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [range, setRange] = useState(30); // days to look back

  useEffect(() => {
    const timeline: TimelineEntry[] = [];
    const now = new Date();
    let consecutiveDays = 0;
    let firstCheckInFound = false;

    for (let i = 0; i < range; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const checkin = getCheckIn(key);

      if (checkin) {
        consecutiveDays++;

        // Check-in entry
        const avgScore = Math.round(((checkin.mood / 5) * 30 + Math.min(checkin.sleep / 8, 1) * 25 + Math.min(checkin.water / 8, 1) * 20) / 0.75);
        timeline.push({
          date: key, dateLabel, type: 'checkin',
          title: 'Daily Check-In',
          detail: `Mood ${checkin.mood}/5 | Sleep ${checkin.sleep}h | Water ${checkin.water} glasses`,
          score: avgScore,
        });

        // Milestone check
        if (MILESTONE_STREAKS.includes(consecutiveDays)) {
          timeline.push({
            date: key, dateLabel, type: 'milestone',
            title: `${consecutiveDays}-Day Milestone`,
            detail: consecutiveDays >= 30 ? 'An extraordinary commitment to yourself.' : 'Your consistency is building something real.',
          });
        }
      } else {
        consecutiveDays = 0;
      }

      // Journal entry?
      const journal = storage.getJSON<any>(`wellth_journal_${key}`, null);
      if (journal) {
        timeline.push({
          date: key, dateLabel, type: 'journal',
          title: 'Journal Entry',
          detail: typeof journal === 'string' ? journal.slice(0, 80) + (journal.length > 80 ? '...' : '') : 'Reflection recorded.',
        });
      }

      // Breathing session?
      const breathing = storage.getJSON<any>(`wellth_breathing_${key}`, null);
      if (breathing) {
        timeline.push({
          date: key, dateLabel, type: 'breathing',
          title: 'Breathing Session',
          detail: 'Mindful breathing completed.',
        });
      }
    }

    // Find first ever check-in
    for (let i = range; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (getCheckIn(key)) {
        const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        timeline.push({
          date: key, dateLabel, type: 'first',
          title: 'Journey Began',
          detail: 'Your wellness journey started here.',
        });
        break;
      }
    }

    setEntries(timeline);
  }, [range]);

  const typeColors: Record<string, string> = {
    checkin: '#B8963E',
    milestone: '#D4536A',
    streak: '#4A90D9',
    journal: '#8BC34A',
    breathing: '#87CEEB',
    first: '#B8963E',
  };

  const typeLabels: Record<string, string> = {
    checkin: 'CHECK-IN',
    milestone: 'MILESTONE',
    streak: 'STREAK',
    journal: 'JOURNAL',
    breathing: 'BREATHE',
    first: 'BEGINNING',
  };

  // Group entries by date
  const grouped: Record<string, TimelineEntry[]> = {};
  entries.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ maxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, color: '#B8963E', fontFamily: bodySerif }}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
        Your Story
      </Text>
      <Text style={{ fontSize: 24, color: '#3A3A3A', fontFamily: serif, fontWeight: '600', marginBottom: 8 }}>
        Wellness Journey
      </Text>
      <Text style={{ fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 24, lineHeight: 22 }}>
        Every check-in, every breath, every reflection — it all adds up.
      </Text>

      {/* Range selector */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
        {[7, 30, 90].map(r => (
          <TouchableOpacity
            key={r}
            onPress={() => setRange(r)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderWidth: 1.5,
              borderColor: range === r ? '#B8963E' : '#EDE3CC',
              backgroundColor: range === r ? '#FFF9EE' : '#FFFFFF',
            }}
            activeOpacity={0.7}
          >
            <Text style={{
              fontSize: 12, fontWeight: '600', fontFamily: bodySerif,
              color: range === r ? '#B8963E' : '#8A7A5A',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>{r}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats summary */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        <View style={{ flex: 1, backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#EDE3CC', padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#B8963E', fontFamily: serif }}>{getStreak()}</Text>
          <Text style={{ fontSize: 9, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1 }}>Current Streak</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#EDE3CC', padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#B8963E', fontFamily: serif }}>
            {entries.filter(e => e.type === 'checkin').length}
          </Text>
          <Text style={{ fontSize: 9, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1 }}>Check-ins</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#EDE3CC', padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#B8963E', fontFamily: serif }}>
            {entries.filter(e => e.type === 'milestone').length}
          </Text>
          <Text style={{ fontSize: 9, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1 }}>Milestones</Text>
        </View>
      </View>

      {/* Timeline */}
      {dateKeys.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#EDE3CC' }}>
          <Text style={{ fontSize: 16, color: '#8A7A5A', fontFamily: serif, fontStyle: 'italic', textAlign: 'center' }}>
            Your journey begins with your first check-in.
          </Text>
        </View>
      ) : (
        dateKeys.map((dateKey, di) => (
          <View key={dateKey} style={{ marginBottom: 4 }}>
            {/* Date header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 12, height: 12, backgroundColor: '#B8963E', marginRight: 12 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, letterSpacing: 0.5 }}>
                {grouped[dateKey][0].dateLabel}
              </Text>
            </View>
            {/* Entries for this date */}
            {grouped[dateKey].map((entry, ei) => (
              <View key={`${dateKey}-${ei}`} style={{
                marginLeft: 5, borderLeftWidth: 2, borderLeftColor: di < dateKeys.length - 1 || ei < grouped[dateKey].length - 1 ? '#EDE3CC' : 'transparent',
                paddingLeft: 19, paddingBottom: 20,
              }}>
                <View style={{
                  backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC', padding: 16,
                  borderLeftWidth: 3, borderLeftColor: typeColors[entry.type] || '#B8963E',
                }}>
                  <Text style={{
                    fontSize: 9, color: typeColors[entry.type] || '#BBAA88', fontFamily: bodySerif,
                    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, fontWeight: '700',
                  }}>{typeLabels[entry.type]}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#3A3A3A', fontFamily: serif, marginBottom: 4 }}>
                    {entry.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif, lineHeight: 20 }}>
                    {entry.detail}
                  </Text>
                  {entry.score !== undefined && (
                    <Text style={{ fontSize: 11, color: '#B8963E', fontFamily: bodySerif, marginTop: 6, fontWeight: '600' }}>
                      Score: {entry.score}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))
      )}

      {/* Footer */}
      <View style={{ width: 40, height: 1, backgroundColor: '#D4B96A', alignSelf: 'center', marginTop: 24, marginBottom: 16 }} />
      <Text style={{ textAlign: 'center', fontSize: 13, color: '#BBAA88', fontStyle: 'italic', fontFamily: bodySerif }}>
        Every day you show up is a day you grow.
      </Text>
    </ScrollView>
  );
};

export default WellnessJourneyScreen;
