import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import { wellnessTips, wealthTips, fetchTips, getWellnessTips, getWealthTips } from '../data/tipData';
import storage from '../utils/storage';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

type Category = 'all' | 'nutrition' | 'mental' | 'exercise' | 'sleep' | 'mindfulness';
type TipType = 'wellness' | 'wealth';

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

const getDayIndex = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 864e5);
};

// Inject TipsScreen-specific CSS
const injectTipsCSS = () => {
  if (Platform.OS !== 'web') return;
  if (document.getElementById('wellth-tips-css')) return;
  const style = document.createElement('style');
  style.id = 'wellth-tips-css';
  style.textContent = `
    @keyframes tipCardEnter {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes tipCardExit {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-12px); }
    }
    @keyframes featuredPulse {
      0%, 100% { border-color: #D4B96A; }
      50% { border-color: #B8963E; }
    }
    .tips-card-grid {
      display: flex; flex-direction: column; gap: 0;
    }
    .tip-card-item {
      animation: tipCardEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .tip-card-item:nth-child(1) { animation-delay: 0.05s; }
    .tip-card-item:nth-child(2) { animation-delay: 0.1s; }
    .tip-card-item:nth-child(3) { animation-delay: 0.15s; }
    .tip-card-item:nth-child(4) { animation-delay: 0.2s; }
    .tip-card-item:nth-child(5) { animation-delay: 0.25s; }
    .tip-card-item:nth-child(6) { animation-delay: 0.3s; }
    .tip-card-item:nth-child(7) { animation-delay: 0.35s; }
    .tip-card-item:nth-child(8) { animation-delay: 0.4s; }
    .tip-featured {
      animation: featuredPulse 3s ease-in-out 2;
    }
    .tip-pill-btn {
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
    }
    .tip-pill-btn:hover {
      transform: translateY(-1px);
    }
    .tip-pill-btn:active {
      transform: scale(0.97);
    }
    .tip-action-btn {
      transition: color 0.15s ease, transform 0.15s ease;
    }
    .tip-action-btn:hover {
      transform: scale(1.05);
    }
    .tip-type-toggle {
      transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease;
    }
    .tip-type-toggle:hover {
      background-color: #FFF9EE !important;
    }
    .tip-view-toggle {
      transition: background-color 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
    }
    .tip-view-toggle:hover {
      background-color: #FFF9EE !important;
    }
  `;
  document.head.appendChild(style);
};

// Featured Tip Card - larger, more prominent
const FeaturedTipCard = ({ tip, tipNumber, totalTips, isFav, onToggleFav, onNext, onPrev, categories }: {
  tip: string; tipNumber: number; totalTips: number;
  isFav: boolean; onToggleFav: () => void;
  onNext: () => void; onPrev: () => void;
  categories: Category[];
}) => {
  const [transitioning, setTransitioning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (direction: 1 | -1, callback: () => void) => {
    setTransitioning(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction * -20, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction * 20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start(() => setTransitioning(false));
    });
  };

  const webProps: any = Platform.OS === 'web' ? { className: 'tip-featured' } : {};

  return (
    <View style={styles.featuredCard} {...webProps}>
      <View style={styles.featuredHeader}>
        <View>
          <Text style={styles.featuredLabel}>Featured Tip</Text>
          <View style={styles.featuredCatRow}>
            {categories.map(c => {
              const cat = CATEGORIES.find(x => x.key === c);
              return cat ? <Text key={c} style={styles.featuredCatTag}>{cat.label}</Text> : null;
            })}
          </View>
        </View>
        <Text style={styles.featuredNumber}>{tipNumber}</Text>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.featuredText}>{tip}</Text>
      </Animated.View>

      <View style={styles.featuredFooter}>
        <View style={styles.featuredNav}>
          <TouchableOpacity
            onPress={() => !transitioning && animateTransition(-1, onPrev)}
            activeOpacity={0.6}
            style={styles.featuredNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous featured tip"
          >
            <Text style={styles.featuredNavArrow}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.featuredCounter}>{tipNumber} / {totalTips}</Text>
          <TouchableOpacity
            onPress={() => !transitioning && animateTransition(1, onNext)}
            activeOpacity={0.6}
            style={styles.featuredNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Next featured tip"
          >
            <Text style={styles.featuredNavArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web' && navigator.share) {
                navigator.share({ text: tip + '\n\n-- Wellth' }).catch(() => {});
              } else if (Platform.OS === 'web' && navigator.clipboard) {
                navigator.clipboard.writeText(tip).catch(() => {});
              }
            }}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'tip-action-btn' } as any : {})}
          >
            <Text style={styles.actionBtn}>SHARE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleFav}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'tip-action-btn' } as any : {})}
          >
            <Text style={[styles.actionBtn, isFav && styles.actionBtnActive]}>
              {isFav ? 'SAVED' : 'SAVE'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Individual tip card in the grid
const TipCard = ({ tip, index, isFav, onToggleFav, categories }: {
  tip: string; index: number; isFav: boolean;
  onToggleFav: () => void; categories: Category[];
}) => {
  const webProps: any = Platform.OS === 'web' ? { className: 'tip-card-item' } : {};

  return (
    <View style={styles.card} {...webProps}>
      <View style={styles.cardTop}>
        <View style={styles.cardMeta}>
          <Text style={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={styles.cardDividerDot} />
          {categories.map(c => {
            const cat = CATEGORIES.find(x => x.key === c);
            return cat ? <Text key={c} style={styles.catTag}>{cat.label}</Text> : null;
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web' && navigator.share) {
                navigator.share({ text: tip + '\n\n-- Wellth' }).catch(() => {});
              } else if (Platform.OS === 'web' && navigator.clipboard) {
                navigator.clipboard.writeText(tip).catch(() => {});
              }
            }}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'tip-action-btn' } as any : {})}
          >
            <Text style={styles.actionBtn}>SHARE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleFav}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'tip-action-btn' } as any : {})}
          >
            <Text style={[styles.actionBtn, isFav && styles.actionBtnActive]}>
              {isFav ? 'SAVED' : 'SAVE'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
};

const TipsScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [tipType, setTipType] = useState<TipType>('wellness');
  const [viewMode, setViewMode] = useState<'featured' | 'browse'>('featured');
  const [favorites, setFavorites] = useState<string[]>(() => storage.getJSON(FAVS_KEY, []));
  const [wellTips, setWellTips] = useState<string[]>(wellnessTips);
  const [finTips, setFinTips] = useState<string[]>(wealthTips);
  const [animKey, setAnimKey] = useState(0); // force re-render for animations
  const dayIndex = getDayIndex();
  const [featuredIdx, setFeaturedIdx] = useState(dayIndex);

  useEffect(() => {
    injectTipsCSS();
    fetchTips().then(() => {
      setWellTips(getWellnessTips());
      setFinTips(getWealthTips());
    });
  }, []);

  const tips = tipType === 'wellness' ? wellTips : finTips;

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

  // Category counts
  const getCatCount = (cat: Category) => {
    if (cat === 'all') return tips.length;
    return tips.filter(tip => categorize(tip).includes(cat)).length;
  };

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setAnimKey(prev => prev + 1);
    // Reset featured index when filtering
    setFeaturedIdx(0);
  };

  const handleTypeChange = (type: TipType) => {
    setTipType(type);
    setActiveCategory('all');
    setAnimKey(prev => prev + 1);
    setFeaturedIdx(dayIndex);
  };

  const currentFeaturedIdx = featuredIdx % (filtered.length || 1);
  const featuredTip = filtered[currentFeaturedIdx] || '';
  const featuredCats = featuredTip ? categorize(featuredTip) : [];

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title} accessibilityRole="header" aria-level={1}>Daily Tips</Text>
      <Text style={styles.subtitle}>Curated guidance for a richer life</Text>

      {/* Tip type toggle: Wellness / Wealth */}
      <View style={styles.typeToggleRow}>
        <TouchableOpacity
          onPress={() => handleTypeChange('wellness')}
          style={[styles.typeToggle, tipType === 'wellness' && styles.typeToggleActive]}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: tipType === 'wellness' }}
          {...(Platform.OS === 'web' ? { className: 'tip-type-toggle' } as any : {})}
        >
          <Text style={[styles.typeToggleText, tipType === 'wellness' && styles.typeToggleTextActive]}>Wellness</Text>
          <Text style={[styles.typeToggleCount, tipType === 'wellness' && styles.typeToggleCountActive]}>{wellTips.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleTypeChange('wealth')}
          style={[styles.typeToggle, tipType === 'wealth' && styles.typeToggleActive]}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: tipType === 'wealth' }}
          {...(Platform.OS === 'web' ? { className: 'tip-type-toggle' } as any : {})}
        >
          <Text style={[styles.typeToggleText, tipType === 'wealth' && styles.typeToggleTextActive]}>Wellth</Text>
          <Text style={[styles.typeToggleCount, tipType === 'wealth' && styles.typeToggleCountActive]}>{finTips.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Category pills - only for wellness */}
      {tipType === 'wellness' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsRow}>
          {CATEGORIES.map(cat => {
            const count = getCatCount(cat.key);
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => handleCategoryChange(cat.key)}
                style={[styles.pill, activeCategory === cat.key && styles.pillActive]}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeCategory === cat.key }}
                {...(Platform.OS === 'web' ? { className: 'tip-pill-btn' } as any : {})}
              >
                <Text style={[styles.pillText, activeCategory === cat.key && styles.pillTextActive]}>
                  {cat.label}
                </Text>
                <Text style={[styles.pillCount, activeCategory === cat.key && styles.pillCountActive]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* View mode toggle */}
      <View style={styles.viewToggleRow}>
        <Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'tip' : 'tips'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setViewMode('featured')}
            style={[styles.viewToggle, viewMode === 'featured' && styles.viewToggleActive]}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'featured' }}
            {...(Platform.OS === 'web' ? { className: 'tip-view-toggle' } as any : {})}
          >
            <Text style={[styles.viewToggleText, viewMode === 'featured' && styles.viewToggleTextActive]}>Focus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('browse')}
            style={[styles.viewToggle, viewMode === 'browse' && styles.viewToggleActive]}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'browse' }}
            {...(Platform.OS === 'web' ? { className: 'tip-view-toggle' } as any : {})}
          >
            <Text style={[styles.viewToggleText, viewMode === 'browse' && styles.viewToggleTextActive]}>Browse All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'featured' && filtered.length > 0 && (
        <FeaturedTipCard
          tip={featuredTip}
          tipNumber={currentFeaturedIdx + 1}
          totalTips={filtered.length}
          isFav={favorites.includes(featuredTip)}
          onToggleFav={() => toggleFav(featuredTip)}
          onNext={() => setFeaturedIdx(prev => (prev + 1) % filtered.length)}
          onPrev={() => setFeaturedIdx(prev => (prev - 1 + filtered.length) % filtered.length)}
          categories={featuredCats}
        />
      )}

      {viewMode === 'browse' && (
        <View key={animKey} {...(Platform.OS === 'web' ? { className: 'tips-card-grid' } as any : {})}>
          {filtered.map((tip, i) => {
            const cats = categorize(tip);
            return (
              <TipCard
                key={`${animKey}-${i}`}
                tip={tip}
                index={i}
                isFav={favorites.includes(tip)}
                onToggleFav={() => toggleFav(tip)}
                categories={cats}
              />
            );
          })}
        </View>
      )}

      {filtered.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No tips in this category yet</Text>
          <Text style={styles.emptySubtext}>Try selecting a different category above.</Text>
        </View>
      )}

      {/* Saved tips count */}
      {favorites.length > 0 && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedBannerText}>
            {favorites.length} {favorites.length === 1 ? 'tip' : 'tips'} saved to your collection
          </Text>
        </View>
      )}

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

  title: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 24 },

  // Type toggle
  typeToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeToggle: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
  },
  typeToggleActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  typeToggleText: { fontSize: 14, fontWeight: '600', color: '#999', fontFamily: bodySerif, letterSpacing: 0.5 },
  typeToggleTextActive: { color: '#B8963E' },
  typeToggleCount: { fontSize: 11, color: '#CCBBAA', fontFamily: bodySerif, marginTop: 2 },
  typeToggleCountActive: { color: '#B8963E' },

  // Category pills
  pillsScroll: { marginBottom: 20, flexGrow: 0 },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pillActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  pillText: { fontSize: 13, color: '#999', fontFamily: bodySerif, letterSpacing: 0.3 },
  pillTextActive: { color: '#B8963E', fontWeight: '600' },
  pillCount: { fontSize: 10, color: '#CCBBAA', fontFamily: bodySerif, fontWeight: '600' },
  pillCountActive: { color: '#B8963E' },

  // View toggle
  viewToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  resultCount: { fontSize: 13, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic' },
  viewToggle: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
  },
  viewToggleActive: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  viewToggleText: { fontSize: 11, color: '#999', fontFamily: bodySerif, letterSpacing: 0.8, textTransform: 'uppercase' as any },
  viewToggleTextActive: { color: '#B8963E', fontWeight: '600' },

  // Featured card
  featuredCard: {
    backgroundColor: '#FFFFFF', padding: 32, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#D4B96A',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 24px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 5 }),
  },
  featuredHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24,
  },
  featuredLabel: {
    fontSize: 10, color: '#B8963E', fontFamily: bodySerif,
    textTransform: 'uppercase' as any, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6,
  },
  featuredCatRow: { flexDirection: 'row', gap: 8 },
  featuredCatTag: { fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1 },
  featuredNumber: {
    fontSize: 48, fontWeight: '700', color: '#F0E8D8', fontFamily: serif, lineHeight: 48,
  },
  featuredText: {
    fontSize: 22, lineHeight: 38, color: '#3A3A3A', fontFamily: serif, letterSpacing: 0.2,
  },
  featuredFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F0E8D8',
  },
  featuredNav: { flexDirection: 'row', alignItems: 'center' },
  featuredNavBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  featuredNavArrow: { fontSize: 28, color: '#B8963E', fontWeight: '600' },
  featuredCounter: { fontSize: 13, color: '#BBAA88', fontFamily: bodySerif, minWidth: 64, textAlign: 'center', letterSpacing: 1 },

  // Browse cards
  card: {
    backgroundColor: '#FFFFFF', padding: 24, marginBottom: 14,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 12px rgba(184,150,62,0.06)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  cardNumber: {
    fontSize: 12, fontWeight: '700', color: '#D4B96A', fontFamily: bodySerif, letterSpacing: 0.5,
  },
  cardDividerDot: {
    width: 3, height: 3, backgroundColor: '#EDE3CC',
  },
  catTag: { fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.2 },
  actionBtn: { fontSize: 10, color: '#BBAA88', letterSpacing: 1, fontWeight: '600' as any },
  actionBtnActive: { color: '#D4536A' },
  tipText: { fontSize: 18, lineHeight: 32, color: '#3A3A3A', fontFamily: serif, letterSpacing: 0.2 },

  // Empty state
  emptyState: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 18, color: '#B8963E', fontFamily: serif, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic' },

  // Saved banner
  savedBanner: {
    paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EDE3CC', marginTop: 8,
  },
  savedBannerText: { fontSize: 13, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic', letterSpacing: 0.3 },
});

export default TipsScreen;
