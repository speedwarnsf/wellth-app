import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform,
  useWindowDimensions,
} from 'react-native';
import storage, { getCheckIn, todayKey, CheckInData } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];
const JOURNAL_PREFIX = 'wellth_journal_';

interface JournalEntry {
  date: string;
  text: string;
  tags: string[];
  timestamp: number;
}

const QUICK_TAGS = ['grateful', 'anxious', 'productive', 'tired', 'hopeful', 'stressed', 'peaceful', 'motivated'];

const PROMPTS = [
  "What is on your mind right now?",
  "What are you grateful for today?",
  "What challenged you today?",
  "What would make tomorrow better?",
  "What did you learn today?",
];

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
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    // Pick a prompt based on day
    const dayIdx = new Date().getDate() % PROMPTS.length;
    setPrompt(PROMPTS[dayIdx]);

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

  const moodEntries = entries.filter(e => e.checkin?.mood).slice(0, 7).reverse();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>A quiet space to reflect</Text>

      {/* Today's mood from check-in */}
      {getCheckIn(today) && (
        <View style={styles.todayMood}>
          <Text style={styles.todayMoodLabel}>Today you felt:</Text>
          <Text style={styles.todayMoodText}>{MOOD_LABELS[(getCheckIn(today)!.mood || 1) - 1]}</Text>
        </View>
      )}

      {/* Mood Trend */}
      {moodEntries.length > 1 && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>Mood Trend</Text>
          <View style={styles.trendRow}>
            {moodEntries.map((e, i) => {
              const mood = e.checkin!.mood;
              const barHeight = mood * 14;
              const dayLabel = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              return (
                <View key={i} style={styles.trendCol}>
                  <Text style={styles.trendMoodNum}>{mood}</Text>
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
        <Text style={styles.promptText}>{prompt}</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder="Write freely. No one sees this but you."
          placeholderTextColor="#CCBBAA"
          value={journalText}
          onChangeText={(t) => { setJournalText(t); setSaved(false); }}
        />

        {/* Quick Tags */}
        <Text style={styles.tagLabel}>Tags</Text>
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
          <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save Entry'}</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
        <Text style={styles.historyToggleText}>
          {showHistory ? 'Hide History' : `View History (${entries.length})`}
        </Text>
      </TouchableOpacity>

      {showHistory && entries.map((entry, i) => (
        <View key={i} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
            {entry.checkin?.mood && (
              <Text style={styles.historyMood}>{MOOD_LABELS[(entry.checkin.mood || 1) - 1]}</Text>
            )}
          </View>
          {entry.checkin && (
            <View style={styles.historyStats}>
              {entry.checkin.water > 0 && <Text style={styles.historyStat}>{entry.checkin.water} glasses</Text>}
              {entry.checkin.sleep > 0 && <Text style={styles.historyStat}>{entry.checkin.sleep}h sleep</Text>}
              {entry.checkin.exercise && <Text style={styles.historyStat}>Exercised</Text>}
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
        <Text style={styles.noEntries}>No entries yet. Start your first reflection today.</Text>
      )}

      <QuickNav navigation={navigation} currentScreen="Journal" />
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
  subtitle: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 28 },

  todayMood: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9EE',
    borderRadius: 0, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: '#D4B96A',
  },
  todayMoodLabel: { fontSize: 14, color: '#8A7A5A', fontFamily: bodySerif, marginRight: 8 },
  todayMoodText: { fontSize: 16, fontWeight: '700', color: '#B8963E', fontFamily: serif },

  trendCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  trendTitle: { fontSize: 16, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  trendCol: { alignItems: 'center', gap: 4 },
  trendMoodNum: { fontSize: 13, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  trendBar: { width: 24, borderRadius: 0, minHeight: 8 },
  trendDay: { fontSize: 10, color: '#999', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.5 },

  entrySection: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 6 },
  promptText: { fontSize: 14, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 14 },

  textInput: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 22, fontSize: 17, lineHeight: 30,
    fontFamily: bodySerif, color: '#3A3A3A', minHeight: 200, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web' ? { outlineColor: '#D4B96A' } as any : {}),
  },

  tagLabel: { fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 14, marginBottom: 10, textTransform: 'uppercase' as any, letterSpacing: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 0,
    borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
  },
  tagActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  tagText: { fontSize: 13, color: '#999', fontFamily: bodySerif },
  tagTextActive: { color: '#B8963E', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#B8963E', borderRadius: 0, paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 },

  historyToggle: { alignSelf: 'center', marginBottom: 16, paddingVertical: 8 },
  historyToggleText: { fontSize: 14, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif, letterSpacing: 0.3 },

  historyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 8px rgba(184,150,62,0.06)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 }),
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#B8963E', fontFamily: serif },
  historyMood: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic' },
  historyStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  historyStat: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif },
  historyText: { fontSize: 15, lineHeight: 26, color: '#3A3A3A', fontFamily: bodySerif },
  historyEmpty: { fontSize: 14, color: '#CCBBAA', fontStyle: 'italic', fontFamily: bodySerif },
  historyTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  historyTag: { fontSize: 12, color: '#B8963E', fontFamily: bodySerif },

  noEntries: { fontSize: 15, color: '#999', fontStyle: 'italic', fontFamily: bodySerif, textAlign: 'center' },
});

export default JournalScreen;
