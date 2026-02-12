import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform,
  useWindowDimensions,
} from 'react-native';
import storage, { getCheckIn, todayKey, CheckInData } from '../utils/storage';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];
const JOURNAL_PREFIX = 'wellth_journal_';

interface JournalEntry {
  date: string;
  text: string;
  tags: string[];
  timestamp: number;
}

const QUICK_TAGS = ['grateful', 'anxious', 'productive', 'tired', 'hopeful', 'stressed', 'peaceful', 'motivated'];

const JournalScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = todayKey();

  const [journalText, setJournalText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<(JournalEntry & { checkin: CheckInData | null })[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  // Load existing entry for today and history
  useEffect(() => {
    const existing = storage.getJSON<JournalEntry | null>(`${JOURNAL_PREFIX}${today}`, null);
    if (existing) {
      setJournalText(existing.text);
      setSelectedTags(existing.tags);
      setSaved(true);
    }
    loadHistory();
  }, []);

  const loadHistory = () => {
    const allEntries: (JournalEntry & { checkin: CheckInData | null })[] = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = storage.getJSON<JournalEntry | null>(`${JOURNAL_PREFIX}${key}`, null);
      const checkin = getCheckIn(key);
      if (entry || checkin) {
        allEntries.push({
          date: key,
          text: entry?.text || '',
          tags: entry?.tags || [],
          timestamp: entry?.timestamp || 0,
          checkin,
        });
      }
    }
    setEntries(allEntries);
  };

  const handleSave = () => {
    if (!journalText.trim()) return;
    const entry: JournalEntry = {
      date: today,
      text: journalText.trim(),
      tags: selectedTags,
      timestamp: Date.now(),
    };
    storage.setJSON(`${JOURNAL_PREFIX}${today}`, entry);
    setSaved(true);
    loadHistory();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setSaved(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Mood trend: last 7 entries with moods
  const moodEntries = entries.filter(e => e.checkin?.mood).slice(0, 7).reverse();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Mood Journal</Text>
      <Text style={styles.subtitle}>Reflect, track, and grow 🦉</Text>

      {/* Today's mood from check-in */}
      {getCheckIn(today) && (
        <View style={styles.todayMood}>
          <Text style={styles.todayMoodLabel}>Today's mood:</Text>
          <Text style={styles.todayMoodEmoji}>{MOODS[(getCheckIn(today)!.mood || 1) - 1]}</Text>
          <Text style={styles.todayMoodText}>{MOOD_LABELS[(getCheckIn(today)!.mood || 1) - 1]}</Text>
        </View>
      )}

      {/* Mood Trend Mini-Chart */}
      {moodEntries.length > 1 && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>Mood Trend</Text>
          <View style={styles.trendRow}>
            {moodEntries.map((e, i) => {
              const mood = e.checkin!.mood;
              const barHeight = mood * 16;
              const dayLabel = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              return (
                <View key={i} style={styles.trendCol}>
                  <Text style={{ fontSize: 16 }}>{MOODS[mood - 1]}</Text>
                  <View style={[styles.trendBar, { height: barHeight, backgroundColor: mood >= 4 ? '#B8963E' : mood >= 3 ? '#D4B96A' : '#CCBBAA' }]} />
                  <Text style={styles.trendDay}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Journal Entry */}
      <View style={styles.entrySection}>
        <Text style={styles.sectionTitle}>Today's Reflection</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={5}
          placeholder="How are you feeling? What's on your mind?"
          placeholderTextColor="#BBAA88"
          value={journalText}
          onChangeText={(t) => { setJournalText(t); setSaved(false); }}
        />

        {/* Quick Tags */}
        <Text style={styles.tagLabel}>Quick tags:</Text>
        <View style={styles.tagsRow}>
          {QUICK_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, !journalText.trim() && styles.saveBtnDisabled]}
          disabled={!journalText.trim()}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Entry'}</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
        <Text style={styles.historyToggleText}>
          {showHistory ? 'Hide History' : `📖 View History (${entries.length} entries)`}
        </Text>
      </TouchableOpacity>

      {showHistory && entries.map((entry, i) => (
        <View key={i} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
            {entry.checkin?.mood && (
              <Text style={{ fontSize: 20 }}>{MOODS[(entry.checkin.mood || 1) - 1]}</Text>
            )}
          </View>
          {entry.checkin && (
            <View style={styles.historyStats}>
              {entry.checkin.water > 0 && <Text style={styles.historyStat}>💧 {entry.checkin.water}</Text>}
              {entry.checkin.sleep > 0 && <Text style={styles.historyStat}>😴 {entry.checkin.sleep}h</Text>}
              {entry.checkin.exercise && <Text style={styles.historyStat}>🏃 ✓</Text>}
            </View>
          )}
          {entry.text ? (
            <Text style={styles.historyText}>{entry.text}</Text>
          ) : (
            <Text style={styles.historyEmpty}>No journal entry</Text>
          )}
          {entry.tags.length > 0 && (
            <View style={styles.historyTags}>
              {entry.tags.map(t => (
                <Text key={t} style={styles.historyTag}>#{t}</Text>
              ))}
            </View>
          )}
        </View>
      ))}

      {showHistory && entries.length === 0 && (
        <Text style={styles.noEntries}>No entries yet. Start your first check-in and journal entry today!</Text>
      )}

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

  todayMood: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9EE',
    borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: '#D4B96A',
  },
  todayMoodLabel: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, marginRight: 8 },
  todayMoodEmoji: { fontSize: 28, marginRight: 8 },
  todayMoodText: { fontSize: 16, fontWeight: '600', color: '#B8963E', fontFamily: bodySerif },

  trendCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  trendTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 16, textAlign: 'center' },
  trendRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  trendCol: { alignItems: 'center', gap: 4 },
  trendBar: { width: 24, borderRadius: 6, minHeight: 8 },
  trendDay: { fontSize: 11, color: '#999', fontFamily: bodySerif },

  entrySection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 12 },

  textInput: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, fontSize: 16, lineHeight: 24,
    fontFamily: bodySerif, color: '#3A3A3A', minHeight: 120, textAlignVertical: 'top',
    borderWidth: 1.5, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web' ? { outlineColor: '#D4B96A' } as any : {}),
  },

  tagLabel: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 12, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
  },
  tagActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  tagText: { fontSize: 13, color: '#999', fontFamily: bodySerif },
  tagTextActive: { color: '#B8963E', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#B8963E', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif },

  historyToggle: { alignSelf: 'center', marginBottom: 16 },
  historyToggleText: { fontSize: 15, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif },

  historyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 12px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 }),
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 15, fontWeight: '600', color: '#B8963E', fontFamily: serif },
  historyStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  historyStat: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif },
  historyText: { fontSize: 15, lineHeight: 24, color: '#3A3A3A', fontFamily: bodySerif },
  historyEmpty: { fontSize: 14, color: '#CCBBAA', fontStyle: 'italic', fontFamily: bodySerif },
  historyTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  historyTag: { fontSize: 12, color: '#B8963E', fontFamily: bodySerif },

  noEntries: { fontSize: 15, color: '#999', fontStyle: 'italic', fontFamily: bodySerif, textAlign: 'center' },
});

export default JournalScreen;
