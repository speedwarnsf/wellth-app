import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions,
} from 'react-native';
import { wellnessTips, fetchTips, getWellnessTips } from '../data/tipData';
import storage from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

type Category = 'all' | 'nutrition' | 'mental' | 'exercise' | 'sleep' | 'mindfulness';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'mental', label: 'Mental Health' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'mindfulness', label: 'Mindfulness' },
];

const categorize = (tip: string): Category[] => {
  const t = tip.toLowerCase();
  const cats: Category[] = [];
  if (/food|eat|meal|cook|gut|fiber|nutrient|rainbow|fruit|vegetable|bite|diet|water|drink|hydrat/.test(t)) cats.push('nutrition');
  if (/brain|mental|emotion|anxiety|depress|mood|forgiv|compar|kindness|connect|lonely|loneliness|boundar|journal|write down/.test(t)) cats.push('mental');
  if (/exercise|move|movement|walk|stretch|dance|body|posture|cold exposure|shower/.test(t)) cats.push('exercise');
  if (/sleep|rest|bed|screen|circadian|melatonin|digital sunset|morning|sunlight/.test(t)) cats.push('sleep');
  if (/breath|meditat|stillness|quiet|mindful|grounding|gratitude|attention|focus|boredom|laugh|nature|hug/.test(t)) cats.push('mindfulness');
  if (cats.length === 0) cats.push('mindfulness');
  return cats;
};

const FAVS_KEY = 'wellth_favorites';

const TipsScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [favorites, setFavorites] = useState<string[]>(() => storage.getJSON(FAVS_KEY, []));
  const [tips, setTips] = useState<string[]>(wellnessTips);

  useEffect(() => {
    fetchTips().then(() => setTips(getWellnessTips()));
  }, []);

  const toggleFav = useCallback((tip: string) => {
    setFavorites(prev => {
      const next = prev.includes(tip) ? prev.filter(t => t !== tip) : [...prev, tip];
      storage.setJSON(FAVS_KEY, next);
      return next;
    });
  }, []);

  const filtered = activeCategory === 'all'
    ? tips
    : tips.filter(tip => categorize(tip).includes(activeCategory));

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
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
                  {isFav ? '\u2665' : '\u2661'}
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

  backBtn: { marginBottom: 20 },
  backText: { fontSize: 15, color: '#B8963E', fontFamily: bodySerif, letterSpacing: 0.3 },

  title: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 20 },

  pillsScroll: { marginBottom: 24, flexGrow: 0 },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 0,
    borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
  },
  pillActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  pillText: { fontSize: 13, color: '#999', fontFamily: bodySerif, letterSpacing: 0.3 },
  pillTextActive: { color: '#B8963E', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 22, marginBottom: 16,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 12px rgba(184,150,62,0.06)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catTags: { flexDirection: 'row', gap: 8 },
  catTag: { fontSize: 11, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1 },
  favHeart: { fontSize: 22, color: '#CCBBAA', paddingLeft: 8 },
  favHeartActive: { color: '#D4536A' },
  tipText: { fontSize: 16, lineHeight: 28, color: '#3A3A3A', fontFamily: bodySerif },
});

export default TipsScreen;
