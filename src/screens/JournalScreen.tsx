import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform,
  useWindowDimensions, Animated, Easing,
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
  moodTag: string;
  timestamp: number;
  wordCount: number;
}

const QUICK_TAGS = ['grateful', 'anxious', 'productive', 'tired', 'hopeful', 'stressed', 'peaceful', 'motivated', 'creative', 'reflective'];

const MOOD_TAGS: { label: string; moods: number[] }[] = [
  { label: 'calm', moods: [3, 4, 5] },
  { label: 'energized', moods: [4, 5] },
  { label: 'heavy', moods: [1, 2] },
  { label: 'content', moods: [3, 4] },
  { label: 'restless', moods: [1, 2, 3] },
  { label: 'inspired', moods: [4, 5] },
  { label: 'drained', moods: [1, 2] },
  { label: 'balanced', moods: [3, 4, 5] },
];

const PROMPTS_BY_MOOD: Record<number, string[]> = {
  1: [
    "What feels heaviest right now? Name it without judgment.",
    "What is one small kindness you can offer yourself today?",
    "Write about a time you got through something hard. You did it then, you can do it now.",
    "What would you tell a friend feeling this way?",
    "What do you need most that you haven't asked for?",
  ],
  2: [
    "What drained your energy today? What could restore it?",
    "Write about one thing that went okay, even if small.",
    "What would a gentle version of tomorrow look like?",
    "What boundary do you need to set or reinforce?",
    "Is there something you are avoiding? Write around it.",
  ],
  3: [
    "What is on your mind right now?",
    "What are you grateful for today?",
    "What would make tomorrow slightly better than today?",
    "Describe a moment from today you want to remember.",
    "What is one habit that is serving you well right now?",
  ],
  4: [
    "What contributed to your good mood today? Capture it.",
    "Who or what made you smile recently?",
    "What did you accomplish today that you are proud of?",
    "Write about something you are looking forward to.",
    "What lesson did today teach you?",
  ],
  5: [
    "What is making life feel full right now? Savor it in words.",
    "Write a letter to your future self about this moment.",
    "What choices led to this great feeling? Remember them.",
    "Who do you want to share this energy with?",
    "If every day could feel like today, what would you protect?",
  ],
};

const GENERIC_PROMPTS = [
  "What is on your mind right now?",
  "What are you grateful for today?",
  "What challenged you today?",
  "What would make tomorrow better?",
  "What did you learn today?",
  "Describe today in three words, then explain each one.",
  "What is something you noticed today that you usually overlook?",
  "Write about a conversation that stayed with you.",
  "What does your ideal morning look like? How close is reality?",
  "What are you holding onto that you could let go of?",
];

const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

const getWritingMilestone = (wordCount: number): string | null => {
  if (wordCount >= 500) return 'Deep reflection -- over 500 words. Powerful.';
  if (wordCount >= 300) return 'Rich entry -- 300+ words of insight.';
  if (wordCount >= 150) return 'Thoughtful reflection -- keep going.';
  if (wordCount >= 50) return 'Good start. Let the words flow.';
  return null;
};

const JournalScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = todayKey();

  const [journalText, setJournalText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [moodTag, setMoodTag] = useState('');
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<(JournalEntry & { checkin: CheckInData | null })[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  useEffect(() => {
    // Pick prompt based on mood if available
    const checkin = getCheckIn(today);
    const mood = checkin?.mood || 0;
    const dayIdx = new Date().getDate();

    if (mood > 0 && PROMPTS_BY_MOOD[mood]) {
      const prompts = PROMPTS_BY_MOOD[mood];
      setPrompt(prompts[dayIdx % prompts.length]);
    } else {
      setPrompt(GENERIC_PROMPTS[dayIdx % GENERIC_PROMPTS.length]);
    }

    const existing = storage.getJSON<JournalEntry | null>(`${JOURNAL_PREFIX}${today}`, null);
    if (existing) {
      setJournalText(existing.text);
      setSelectedTags(existing.tags);
      setMoodTag(existing.moodTag || '');
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
          moodTag: entry?.moodTag || '',
          timestamp: entry?.timestamp || 0,
          wordCount: entry?.wordCount || getWordCount(entry?.text || ''),
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
      moodTag,
      timestamp: Date.now(),
      wordCount: getWordCount(journalText),
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

  const cyclePrompt = () => {
    const checkin = getCheckIn(today);
    const mood = checkin?.mood || 0;
    const prompts = (mood > 0 && PROMPTS_BY_MOOD[mood]) ? PROMPTS_BY_MOOD[mood] : GENERIC_PROMPTS;
    const next = (promptIndex + 1) % prompts.length;
    setPromptIndex(next);
    setPrompt(prompts[next]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const moodEntries = entries.filter(e => e.checkin?.mood).slice(0, 7).reverse();
  const wordCount = getWordCount(journalText);
  const writingMilestone = getWritingMilestone(wordCount);
  const todayMood = getCheckIn(today)?.mood || 0;
  const relevantMoodTags = todayMood > 0
    ? MOOD_TAGS.filter(mt => mt.moods.includes(todayMood))
    : MOOD_TAGS;

  // Stats
  const totalWords = entries.reduce((s, e) => s + (e.wordCount || 0), 0);
  const journalDays = entries.filter(e => e.text).length;
  const avgWords = journalDays > 0 ? Math.round(totalWords / journalDays) : 0;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title} accessibilityRole="header" aria-level={1}>Journal</Text>
      <Text style={styles.subtitle}>A quiet space to reflect</Text>

      {/* Writing Stats Summary */}
      {journalDays > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{journalDays}</Text>
            <Text style={styles.statLabel}>entries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalWords}</Text>
            <Text style={styles.statLabel}>total words</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{avgWords}</Text>
            <Text style={styles.statLabel}>avg words</Text>
          </View>
        </View>
      )}

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

        {/* Prompt with cycle button */}
        <View style={styles.promptRow}>
          <Text style={[styles.promptText, { flex: 1 }]}>{prompt}</Text>
          <TouchableOpacity onPress={cyclePrompt} style={styles.promptCycleBtn} activeOpacity={0.7}>
            <Text style={styles.promptCycleText}>new prompt</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder="Write freely. No one sees this but you."
          placeholderTextColor="#CCBBAA"
          value={journalText}
          onChangeText={(t) => { setJournalText(t); setSaved(false); }}
        />

        {/* Word count + milestone */}
        <View style={styles.wordCountRow}>
          <Text style={styles.wordCountText}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</Text>
          {writingMilestone && <Text style={styles.writingMilestone}>{writingMilestone}</Text>}
        </View>

        {/* Mood Tag */}
        {todayMood > 0 && (
          <>
            <Text style={styles.tagLabel}>How would you describe this feeling?</Text>
            <View style={styles.tagsRow}>
              {relevantMoodTags.map(mt => (
                <TouchableOpacity
                  key={mt.label}
                  onPress={() => { setMoodTag(moodTag === mt.label ? '' : mt.label); setSaved(false); }}
                  style={[styles.tag, moodTag === mt.label && styles.tagActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagText, moodTag === mt.label && styles.tagTextActive]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {entry.wordCount > 0 && (
                <Text style={styles.historyWordCount}>{entry.wordCount}w</Text>
              )}
              {entry.checkin?.mood && (
                <Text style={styles.historyMood}>{MOOD_LABELS[(entry.checkin.mood || 1) - 1]}</Text>
              )}
            </View>
          </View>
          {entry.moodTag ? (
            <Text style={styles.historyMoodTag}>Feeling {entry.moodTag}</Text>
          ) : null}
          {entry.checkin && (
            <View style={styles.historyStats}>
              {entry.checkin.water > 0 && <Text style={styles.historyStat}>{entry.checkin.water} glasses</Text>}
              {entry.checkin.sleep > 0 && <Text style={styles.historyStat}>{entry.checkin.sleep}h sleep</Text>}
              {entry.checkin.exercise && <Text style={styles.historyStat}>Exercised</Text>}
            </View>
          )}
          {entry.text ? (
            <Text style={styles.historyText} numberOfLines={4}>{entry.text}</Text>
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
      </Animated.View>
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

  // Writing stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF',
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EDE3CC',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  statLabel: { fontSize: 10, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8, marginTop: 2 },

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

  promptRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  promptText: { fontSize: 14, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic', lineHeight: 22 },
  promptCycleBtn: {
    paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#EDE3CC',
    backgroundColor: '#FFFFFF',
  },
  promptCycleText: { fontSize: 10, color: '#B8963E', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8 },

  textInput: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 22, fontSize: 17, lineHeight: 30,
    fontFamily: bodySerif, color: '#3A3A3A', minHeight: 200, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web' ? { outlineColor: '#D4B96A' } as any : {}),
  },

  wordCountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, marginBottom: 4, paddingHorizontal: 2,
  },
  wordCountText: { fontSize: 12, color: '#BBAA88', fontFamily: bodySerif, letterSpacing: 0.5 },
  writingMilestone: { fontSize: 12, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic' },

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
  historyWordCount: { fontSize: 11, color: '#BBAA88', fontFamily: bodySerif },
  historyMoodTag: { fontSize: 13, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 6 },
  historyStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  historyStat: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif },
  historyText: { fontSize: 15, lineHeight: 26, color: '#3A3A3A', fontFamily: bodySerif },
  historyEmpty: { fontSize: 14, color: '#CCBBAA', fontStyle: 'italic', fontFamily: bodySerif },
  historyTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  historyTag: { fontSize: 12, color: '#B8963E', fontFamily: bodySerif },

  noEntries: { fontSize: 15, color: '#999', fontStyle: 'italic', fontFamily: bodySerif, textAlign: 'center' },
});

export default JournalScreen;
