import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, Platform,
  useWindowDimensions, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { wealthTips, wellnessTips } from '../data/tipData';
import { getStreak, getStreakMilestone, getCheckIn, todayKey } from '../utils/storage';
import OnboardingScreen, { hasOnboarded } from './OnboardingScreen';

// ── helpers ──────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const getFormattedDate = () => {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
};

const getDayIndex = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 864e5);
};

// ── localStorage favourites (web only) ───────────────────
const FAVS_KEY = 'wellth_favorites';
const SPLASH_KEY = 'wellth_splash_seen';

const loadFavorites = (): string[] => {
  if (Platform.OS !== 'web') return [];
  try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; }
};

const saveFavorites = (favs: string[]) => {
  if (Platform.OS === 'web') localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
};

const hasSplashBeenSeen = (): boolean => {
  if (Platform.OS !== 'web') return true;
  const seen = sessionStorage.getItem(SPLASH_KEY);
  return seen === 'true';
};

const markSplashSeen = () => {
  if (Platform.OS === 'web') sessionStorage.setItem(SPLASH_KEY, 'true');
};

// ── inject CSS keyframes once ────────────────────────────
const injectCSS = () => {
  if (Platform.OS !== 'web') return;
  if (document.getElementById('wellth-css')) return;
  const style = document.createElement('style');
  style.id = 'wellth-css';
  style.textContent = `
    /* owlFloat animation removed */
    @keyframes owlFloat_UNUSED {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      25% { transform: translateY(-8px) rotate(1.5deg); }
      75% { transform: translateY(4px) rotate(-1deg); }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseHeart {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.25); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes splashFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes logoReveal {
      from { opacity: 0; transform: scale(0.8) translateY(20px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes videoGlow {
      0%, 100% { box-shadow: 0 4px 30px rgba(184,150,62,0.15); }
      50% { box-shadow: 0 8px 50px rgba(184,150,62,0.3); }
    }
    /* owl-mascot class removed (banned asset) */
    .tip-card { animation: fadeSlideIn 0.7s ease-out both; }
    .tip-card:nth-child(2) { animation-delay: 0.15s; }
    .fav-btn { transition: transform 0.2s ease, color 0.2s ease; }
    .fav-btn:hover { transform: scale(1.2); }
    .fav-btn.active { animation: pulseHeart 0.4s ease; }
    .fav-panel { animation: fadeSlideIn 0.35s ease-out both; }
    .splash-screen {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2218 100%); flex-direction: column;
    }
    .splash-screen.fade-out {
      animation: splashFadeOut 0.8s ease-out forwards;
    }
    .splash-video {
      border-radius: 50%; width: 240px; height: 240px; object-fit: cover;
      animation: logoReveal 1s ease-out both;
      box-shadow: 0 8px 40px rgba(184,150,62,0.2);
    }
    .splash-logo {
      animation: logoReveal 1s ease-out 0.3s both;
    }
    .splash-tagline {
      animation: logoReveal 1s ease-out 0.6s both;
      font-family: Georgia, "Times New Roman", serif;
      color: #BBAA88; font-style: italic; font-size: 15px;
      margin-top: 8px;
    }
    .owl-video-container {
      border-radius: 20px; overflow: hidden;
      animation: videoGlow 4s ease-in-out infinite;
      cursor: pointer; position: relative;
    }
    .owl-video-container video {
      display: block; width: 100%; border-radius: 20px;
    }
    .owl-video-label {
      position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(184,150,62,0.85); color: white;
      padding: 4px 16px; border-radius: 20px; font-size: 12px;
      font-family: Georgia, "Times New Roman", serif; font-style: italic;
      backdrop-filter: blur(4px); white-space: nowrap;
    }
    .wellth-header-logo {
      transition: transform 0.3s ease;
    }
    .wellth-header-logo:hover {
      transform: scale(1.05);
    }
    html { scroll-behavior: smooth; }
    body { -webkit-font-smoothing: antialiased; }
  `;
  document.head.appendChild(style);
};

// ── Splash Screen (web only) ────────────────────────────
const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        markSplashSeen();
        onDone();
      }, 800);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const handleSkip = () => {
    setFadeOut(true);
    setTimeout(() => {
      markSplashSeen();
      onDone();
    }, 400);
  };

  if (Platform.OS !== 'web') return null;

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`} onClick={handleSkip}>
      <img
        src={require('../assets/wellth-logo.png')}
        className="splash-logo"
        style={{ width: 200, marginTop: 24 }}
        alt="Wellth"
      />
      <div className="splash-tagline" style={{ color: '#D4B96A' }}>Grow your wealth. Nourish your wellness.</div>
      <div style={{
        position: 'absolute', bottom: 40, color: '#8A7A5A',
        fontFamily: 'Georgia, serif', fontSize: 13, fontStyle: 'italic',
        animation: 'logoReveal 1s ease-out 1s both',
      }}>
        tap anywhere to continue
      </div>
    </div>
  );
};

// ── Owl Video Section (REMOVED — Dustin banned the owl 2026-02-12) ──

// ── AnimatedTipCard with cycling ─────────────────────────
const AnimatedTipCard = ({ label, emoji, tips, dayIndex, favorites, onToggleFav }: {
  label: string; emoji: string; tips: string[]; dayIndex: number;
  favorites: string[]; onToggleFav: (tip: string) => void;
}) => {
  const [tipIdx, setTipIdx] = useState(dayIndex % tips.length);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const tip = tips[tipIdx];
  const isFav = favorites.includes(tip);

  const cycleTip = useCallback((direction: 1 | -1) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction * -12, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setTipIdx(prev => (prev + direction + tips.length) % tips.length);
      slideAnim.setValue(direction * 12);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start();
    });
  }, [tips.length]);

  // Initial entrance animation
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceFade, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(entranceSlide, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  const webProps: any = Platform.OS === 'web' ? { className: 'tip-card' } : {};

  return (
    <Animated.View style={[styles.card, { opacity: entranceFade, transform: [{ translateY: entranceSlide }] }]} {...webProps}>
      <View style={styles.cardHeader}>
        <View style={styles.tipHeaderRow}>
          <Text style={styles.tipLabel}>Your daily </Text>
          <Text style={styles.tipLabelBoldGold}>{label}</Text>
          <Text style={styles.tipLabel}> </Text>
          <Text style={styles.tipIcon}>{emoji}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onToggleFav(tip)}
          activeOpacity={0.7}
          {...(Platform.OS === 'web' ? { className: `fav-btn ${isFav ? 'active' : ''}` } : {})}
        >
          <Text style={[styles.favHeart, isFav && styles.favHeartActive]}>
            {isFav ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.tipText}>{tip}</Text>
      </Animated.View>

      {/* Navigation arrows */}
      <View style={styles.tipNav}>
        <TouchableOpacity onPress={() => cycleTip(-1)} activeOpacity={0.6} style={styles.tipNavBtn}>
          <Text style={styles.tipNavArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.tipNavCounter}>{tipIdx + 1} / {tips.length}</Text>
        <TouchableOpacity onPress={() => cycleTip(1)} activeOpacity={0.6} style={styles.tipNavBtn}>
          <Text style={styles.tipNavArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ── FavoritesPanel ───────────────────────────────────────
const FavoritesPanel = ({ favorites, onClose }: { favorites: string[]; onClose: () => void }) => {
  const webProps: any = Platform.OS === 'web' ? { className: 'fav-panel' } : {};
  return (
    <View style={styles.favPanel} {...webProps}>
      <View style={styles.favPanelHeader}>
        <Text style={styles.favPanelTitle}>♥ Saved Tips</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.favPanelClose}>✕</Text>
        </TouchableOpacity>
      </View>
      {favorites.length === 0 ? (
        <Text style={styles.favEmpty}>Tap the heart on any tip to save it here.</Text>
      ) : (
        favorites.map((tip, i) => (
          <View key={i} style={styles.favItem}>
            <Text style={styles.favItemText}>{tip}</Text>
          </View>
        ))
      )}
    </View>
  );
};

// ── HomeScreen ───────────────────────────────────────────
const HomeScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const dayIndex = getDayIndex();

  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [showFavs, setShowFavs] = useState(false);
  const [showSplash, setShowSplash] = useState(!hasSplashBeenSeen());
  const [showOnboarding, setShowOnboarding] = useState(!hasOnboarded());
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);

  useEffect(() => {
    setStreak(getStreak());
    setCheckedInToday(!!getCheckIn(todayKey()));
  }, []);

  // RN animated values for non-web fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    injectCSS();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  const toggleFav = useCallback((tip: string) => {
    setFavorites(prev => {
      const next = prev.includes(tip) ? prev.filter(t => t !== tip) : [...prev, tip];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isSmall = width < 400;

  if (showSplash && Platform.OS === 'web') {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      <Animated.View style={Platform.OS !== 'web' ? { opacity: fadeAnim, transform: [{ translateY: slideAnim }] } : undefined}>

        {/* Header */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/wellth-logo.png')}
            style={[styles.headerLogo, isSmall && { width: 180, height: 54 }]}
            resizeMode="contain"
            {...(Platform.OS === 'web' ? { className: 'wellth-header-logo' } as any : {})}
            accessibilityLabel="Wellth"
          />
        </View>
        <View style={styles.divider} />

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>{getGreeting()}, </Text>
          <Text style={styles.greetingDate}>{getFormattedDate()}</Text>
        </View>

        {/* Streak Banner */}
        {streak > 0 && (
          <View style={styles.streakBanner}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>{streak}</Text>
            <Text style={styles.streakText}>day streak</Text>
            {getStreakMilestone(streak) && (
              <Text style={styles.streakMilestone}>{getStreakMilestone(streak)}</Text>
            )}
          </View>
        )}

        {/* Feature Buttons */}
        <View style={styles.featureGrid}>
          <TouchableOpacity
            style={[styles.featureBtn, !checkedInToday && styles.featureBtnHighlight]}
            onPress={() => navigation?.navigate('CheckIn')}
            activeOpacity={0.7}
          >
            <Text style={styles.featureBtnEmoji}>{checkedInToday ? '✅' : '📝'}</Text>
            <Text style={styles.featureBtnLabel}>{checkedInToday ? 'Checked In' : 'Check In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Tips')}
            activeOpacity={0.7}
          >
            <Text style={styles.featureBtnEmoji}>💡</Text>
            <Text style={styles.featureBtnLabel}>All Tips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Breathing')}
            activeOpacity={0.7}
          >
            <Text style={styles.featureBtnEmoji}>🧘</Text>
            <Text style={styles.featureBtnLabel}>Breathe</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featureGrid}>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Journal')}
            activeOpacity={0.7}
          >
            <Text style={styles.featureBtnEmoji}>📖</Text>
            <Text style={styles.featureBtnLabel}>Journal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Hydration')}
            activeOpacity={0.7}
          >
            <Text style={styles.featureBtnEmoji}>💧</Text>
            <Text style={styles.featureBtnLabel}>Hydration</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('WeeklyReport')}
            activeOpacity={0.7}
          >
            <Text style={styles.featureBtnEmoji}>📊</Text>
            <Text style={styles.featureBtnLabel}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Tip Cards */}
        <AnimatedTipCard label="Wealth tip" emoji="🪴" tips={wealthTips} dayIndex={dayIndex} favorites={favorites} onToggleFav={toggleFav} />
        <AnimatedTipCard label="Wellness tip" emoji="💛" tips={wellnessTips} dayIndex={dayIndex} favorites={favorites} onToggleFav={toggleFav} />

        {/* Favorites toggle */}
        <TouchableOpacity
          style={styles.favToggle}
          onPress={() => setShowFavs(s => !s)}
          activeOpacity={0.7}
        >
          <Text style={styles.favToggleText}>
            {showFavs ? 'Hide Saved Tips' : `♥ Saved Tips (${favorites.length})`}
          </Text>
        </TouchableOpacity>

        {showFavs && <FavoritesPanel favorites={favorites} onClose={() => setShowFavs(false)} />}

        {/* Footer */}
        <Text style={styles.footer}>Grow your wealth. Nourish your wellness.</Text>
        <Text style={styles.copyright}>© {new Date().getFullYear()} Wellth</Text>

      </Animated.View>
    </ScrollView>
  );
};

// ── styles ───────────────────────────────────────────────
const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAF8F3' },
  container: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? 48 : 60,
    paddingBottom: 40,
    width: '100%',
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 240, height: 72,
  },
  header: {
    fontSize: 52, fontWeight: '700', color: '#B8963E',
    textAlign: 'center', letterSpacing: 12, marginBottom: 8,
    fontFamily: serif,
  },
  divider: {
    width: 60, height: 2, backgroundColor: '#D4B96A',
    alignSelf: 'center', marginBottom: 28, borderRadius: 1,
  },

  greetingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 24 },
  greetingText: { fontSize: 18, color: '#3A3A3A', fontFamily: bodySerif },
  greetingDate: { fontSize: 18, color: '#3A3A3A', fontStyle: 'italic', fontWeight: '600', fontFamily: bodySerif },

  // Streak banner
  streakBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF9EE', borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#D4B96A', flexWrap: 'wrap',
  },
  streakEmoji: { fontSize: 22, marginRight: 6 },
  streakCount: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginRight: 6 },
  streakText: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif },
  streakMilestone: { width: '100%' as any, textAlign: 'center', fontSize: 14, color: '#B8963E', fontStyle: 'italic', fontFamily: bodySerif, marginTop: 4 },

  // Feature buttons
  featureGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  featureBtn: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#EDE3CC',
  },
  featureBtnHighlight: { borderColor: '#B8963E', backgroundColor: '#FFF9EE' },
  featureBtnEmoji: { fontSize: 26, marginBottom: 6 },
  featureBtnLabel: { fontSize: 13, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif },

  // Tip card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', flex: 1 },
  tipLabel: { fontSize: 16, color: '#5A5A5A', fontFamily: bodySerif },
  tipLabelBoldGold: { fontSize: 19, fontWeight: '700', fontStyle: 'italic', color: '#B8963E', fontFamily: serif },
  tipIcon: { fontSize: 18 },
  tipText: { fontSize: 17, lineHeight: 28, color: '#3A3A3A', fontFamily: bodySerif },

  // Tip navigation
  tipNav: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0E8D8',
  },
  tipNavBtn: { paddingHorizontal: 16, paddingVertical: 4 },
  tipNavArrow: { fontSize: 24, color: '#B8963E', fontWeight: '600' },
  tipNavCounter: { fontSize: 13, color: '#BBAA88', fontFamily: bodySerif, minWidth: 60, textAlign: 'center' },

  // Favorite heart
  favHeart: { fontSize: 26, color: '#CCBBAA', paddingLeft: 12 },
  favHeartActive: { color: '#D4536A' },

  // Fav toggle button
  favToggle: {
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 24, borderWidth: 1.5, borderColor: '#D4B96A',
    marginBottom: 12,
  },
  favToggleText: { fontSize: 15, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif },

  // Fav panel
  favPanel: {
    backgroundColor: '#FFF9EE', borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  favPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  favPanelTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  favPanelClose: { fontSize: 20, color: '#999', paddingLeft: 12 },
  favEmpty: { fontSize: 15, color: '#999', fontStyle: 'italic', fontFamily: bodySerif },
  favItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDE3CC' },
  favItemText: { fontSize: 15, lineHeight: 24, color: '#3A3A3A', fontFamily: bodySerif },

  // (mascot styles removed — banned asset)

  // Footer
  footer: {
    textAlign: 'center', fontSize: 13, color: '#BBAA88',
    marginTop: 4, marginBottom: 4, fontStyle: 'italic', fontFamily: bodySerif,
  },
  copyright: {
    textAlign: 'center', fontSize: 11, color: '#CCBBAA',
    marginBottom: 8, fontFamily: bodySerif,
  },
});

export default HomeScreen;
