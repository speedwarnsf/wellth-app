import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import storage, { todayKey } from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const GRATITUDE_PREFIX = 'wellth_gratitude_';

interface GratitudeEntry {
  date: string;
  items: string[];
  freeform: string;
  prompt: string;
  timestamp: number;
}

const GRATITUDE_PROMPTS = [
  '3 things I am grateful for today',
  'Someone who made my day better',
  'A small moment that brought me peace',
  'Something about my body I appreciate',
  'A challenge that taught me something',
  'A comfort I often take for granted',
  'Something beautiful I noticed today',
  'A skill or ability I am thankful for',
  'Someone who believed in me',
  'A place that makes me feel safe',
  'An opportunity I had recently',
  'Something that made me laugh this week',
  'A meal or flavor I truly enjoyed',
  'A memory that warms my heart',
  'Something I have now that I once wished for',
];

const GratitudeScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = todayKey();

  const [items, setItems] = useState<string[]>(['', '', '']);
  const [freeform, setFreeform] = useState('');
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const dayIdx = new Date().getDate();
  const prompt = GRATITUDE_PROMPTS[dayIdx % GRATITUDE_PROMPTS.length];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  useEffect(() => {
    const existing = storage.getJSON<GratitudeEntry | null>(`${GRATITUDE_PREFIX}${today}`, null);
    if (existing) {
      setItems(existing.items.length >= 3 ? existing.items : [...existing.items, ...Array(3 - existing.items.length).fill('')]);
      setFreeform(existing.freeform || '');
      setSaved(true);
    }
    loadHistory();
  }, []);

  const loadHistory = () => {
    const all: GratitudeEntry[] = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = storage.getJSON<GratitudeEntry | null>(`${GRATITUDE_PREFIX}${key}`, null);
      if (entry) all.push(entry);
    }
    setEntries(all);
  };

  const handleSave = () => {
    const filledItems = items.filter(i => i.trim());
    if (filledItems.length === 0 && !freeform.trim()) return;
    const entry: GratitudeEntry = {
      date: today,
      items: items.map(i => i.trim()),
      freeform: freeform.trim(),
      prompt,
      timestamp: Date.now(),
    };
    storage.setJSON(`${GRATITUDE_PREFIX}${today}`, entry);
    setSaved(true);
    loadHistory();
  };

  const updateItem = (index: number, text: string) => {
    const next = [...items];
    next[index] = text;
    setItems(next);
    setSaved(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const totalEntries = entries.length;
  const totalItems = entries.reduce((s, e) => s + e.items.filter(i => i).length, 0);
  const currentStreak = (() => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (storage.getJSON(`${GRATITUDE_PREFIX}${key}`, null)) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={styles.title} accessibilityRole="header" aria-level={1}>Gratitude</Text>
        <Text style={styles.subtitle}>What fills your cup today?</Text>

        {/* Stats */}
        {totalEntries > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{totalEntries}</Text>
              <Text style={styles.statLabel}>entries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{totalItems}</Text>
              <Text style={styles.statLabel}>blessings noted</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{currentStreak}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
          </View>
        )}

        {/* Prompt */}
        <View style={styles.promptBox}>
          <Text style={styles.promptLabel}>Today's Prompt</Text>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>

        {/* Three gratitude items */}
        <Text style={styles.sectionTitle}>3 Things I Am Grateful For</Text>
        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemNumber}>{i + 1}</Text>
            <TextInput
              style={styles.itemInput}
              placeholder={
                i === 0 ? 'Something that made me smile...'
                : i === 1 ? 'Someone I appreciate...'
                : 'A moment of peace...'
              }
              placeholderTextColor="#CCBBAA"
              value={item}
              onChangeText={(t) => updateItem(i, t)}
              multiline
            />
          </View>
        ))}

        {/* Freeform */}
        <Text style={styles.sectionTitle}>Deeper Reflection</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="Expand on your gratitude. What makes these things meaningful?"
          placeholderTextColor="#CCBBAA"
          value={freeform}
          onChangeText={(t) => { setFreeform(t); setSaved(false); }}
        />

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, (items.every(i => !i.trim()) && !freeform.trim()) && styles.saveBtnDisabled]}
          disabled={items.every(i => !i.trim()) && !freeform.trim()}
          activeOpacity={0.7}
        >
          <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save Gratitude'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 11, color: '#BBAA88', fontFamily: Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined, fontStyle: 'italic', textAlign: 'center', lineHeight: 16, marginTop: 12, ...(Platform.OS === 'web' ? { textWrap: 'balance' } as any : {}) }}>
          All data is encrypted with AES-256-GCM end-to-end encryption and can only ever be read by you as a logged-in user. Your entries are unretrievable any other way. Your privacy is secure.
        </Text>

        {/* History */}
        <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
          <Text style={styles.historyToggleText}>
            {showHistory ? 'Hide History' : `View History (${entries.length})`}
          </Text>
        </TouchableOpacity>

        {showHistory && entries.map((entry, i) => (
          <View key={i} style={styles.historyCard}>
            <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
            {entry.items.filter(it => it).map((it, j) => (
              <View key={j} style={styles.historyItem}>
                <View style={styles.historyBullet} />
                <Text style={styles.historyItemText}>{it}</Text>
              </View>
            ))}
            {entry.freeform ? (
              <Text style={styles.historyFreeform} numberOfLines={3}>{entry.freeform}</Text>
            ) : null}
          </View>
        ))}

        <QuickNav navigation={navigation} currentScreen="Gratitude" />
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

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF',
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EDE3CC',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  statLabel: { fontSize: 10, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8, marginTop: 2 },

  promptBox: {
    backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A',
    padding: 22, marginBottom: 24, alignItems: 'center',
  },
  promptLabel: { fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 10 },
  promptText: { fontSize: 17, lineHeight: 28, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic', textAlign: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#3A3A3A', fontFamily: bodySerif, marginBottom: 14 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  itemNumber: { fontSize: 24, fontWeight: '700', color: '#D4B96A', fontFamily: serif, marginRight: 14, marginTop: 10, width: 28 },
  itemInput: {
    flex: 1, backgroundColor: '#FFFFFF', padding: 16, fontSize: 16, lineHeight: 26,
    fontFamily: bodySerif, color: '#3A3A3A', minHeight: 56, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web' ? { outlineColor: '#D4B96A' } as any : {}),
  },

  textInput: {
    backgroundColor: '#FFFFFF', padding: 22, fontSize: 16, lineHeight: 28,
    fontFamily: bodySerif, color: '#3A3A3A', minHeight: 120, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#EDE3CC', marginBottom: 20,
    ...(Platform.OS === 'web' ? { outlineColor: '#D4B96A' } as any : {}),
  },

  saveBtn: {
    backgroundColor: '#B8963E', paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 },

  historyToggle: { alignSelf: 'center', marginBottom: 16, paddingVertical: 8 },
  historyToggleText: { fontSize: 14, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif, letterSpacing: 0.3 },

  historyCard: {
    backgroundColor: '#FFFFFF', padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#B8963E', fontFamily: serif, marginBottom: 10 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  historyBullet: { width: 4, height: 4, backgroundColor: '#D4B96A', marginTop: 9, marginRight: 10 },
  historyItemText: { fontSize: 15, lineHeight: 24, color: '#3A3A3A', fontFamily: bodySerif, flex: 1 },
  historyFreeform: { fontSize: 14, lineHeight: 22, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginTop: 8 },
});

export default GratitudeScreen;
