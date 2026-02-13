import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import { wellnessTips } from '../data/tipData';
import storage from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

// Categorize wellness tips by keyword matching
type Category = 'all' | 'nutrition' | 'mental' | 'exercise' | 'sleep' | 'mindfulness';

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '' },
  { key: 'nutrition', label: 'Nutrition', emoji: '' },
  { key: 'mental', label: 'Mental Health', emoji: '' },
  { key: 'exercise', label: 'Exercise', emoji: '' },
  { key: 'sleep', label: 'Sleep', emoji: '' },
  { key: 'mindfulness', label: 'Mindfulness', emoji: '' },
];

const categorize = (tip: string): Category[] => {
  const t = tip.toLowerCase();
  const cats: Category[] = [];
  if (/food|eat|meal|cook|gut|fiber|nutrient|rainbow|fruit|vegetable|bite|diet|water|drink|hydrat/.test(t)) cats.push('nutrition');
  if (/brain|mental|emotion|anxiety|depress|mood|forgiv|compar|kindness|connect|lonely|loneliness|boundar|journal|write down/.test(t)) cats.push('mental');
  if (/exercise|move|movement|walk|stretch|dance|body|posture|cold exposure|shower/.test(t)) cats.push('exercise');
  if (/sleep|rest|bed|screen|circadian|melatonin|digital sunset|morning|sunlight/.test(t)) cats.push('sleep');
  if (/breath|meditat|stillness|quiet|mindful|grounding|gratitude|attention|focus|boredom|laugh|nature|hug/.test(t)) cats.push('mindfulness');
  if (cats.length === 0) cats.push('mindfulness'); // default
  return cats;
};

const FAVS_KEY = 'wellth_favorites';

const TipsScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [favorites, setFavorites] = useState<string[]>(() => storage.getJSON(FAVS_KEY, []));

  const toggleFav = useCallback((tip: string) => {
    setFavorites(prev => {
      const next = prev.includes(tip) ? prev.filter(t => t !== tip) : [...prev, tip];
      storage.setJSON(FAVS_KEY, next);
      return next;
    });
  }, []);

  const filtered = activeCategory === 'all'
    ? wellnessTips
    : wellnessTips.filter(tip => categorize(tip).includes(activeCategory));

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Wellness Tips</Text>
      <Text style={styles.subtitle}>{filtered.length} tips to nourish your life</Text>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setActiveCategory(cat.key)}
            style={[styles.pill, activeCategory === cat.key && styles.pillActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, activeCategory === cat.key && styles.pillTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tips */}
      {filtered.map((tip, i) => {
        const cats = categorize(tip);
        const isFav = favorites.includes(tip);
        return (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.catTags}>
                {cats.map(c => {
                  const cat = CATEGORIES.find(x => x.key === c);
                  return cat ? (
                    <Text key={c} style={styles.catTag}>{cat.label}</Text>
                  ) : null;
                })}
              </View>
              <TouchableOpacity onPress={() => toggleFav(tip)} activeOpacity={0.7}>
                <Text style={[styles.favHeart, isFav && styles.favHeartActive]}>
                  {isFav ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        );
      })}

      <QuickNav navigation={navigation} currentScreen="Tips" />
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
  subtitle: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 20 },

  pillsScroll: { marginBottom: 24, flexGrow: 0 },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 0,
    borderWidth: 1.5, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
  },
  pillActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  pillText: { fontSize: 14, color: '#999', fontFamily: bodySerif },
  pillTextActive: { color: '#B8963E', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 20, marginBottom: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catTags: { flexDirection: 'row', gap: 4 },
  catTag: { fontSize: 16 },
  favHeart: { fontSize: 24, color: '#CCBBAA', paddingLeft: 8 },
  favHeartActive: { color: '#D4536A' },
  tipText: { fontSize: 16, lineHeight: 26, color: '#3A3A3A', fontFamily: bodySerif },
});

export default TipsScreen;
