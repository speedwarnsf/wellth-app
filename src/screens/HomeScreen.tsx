import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, Platform,
  useWindowDimensions, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { wealthTips, wellnessTips, fetchTips, getWealthTips, getWellnessTips } from '../data/tipData';
import { getStreak, getStreakMilestone, getCheckIn, todayKey, getWeekDates, CheckInData } from '../utils/storage';
import storage from '../utils/storage';
import OnboardingScreen, { hasOnboarded } from './OnboardingScreen';
import TutorialOverlay, { hasTutorialCompleted, markTutorialDone } from '../components/TutorialOverlay';
import Confetti from '../components/Confetti';
import {
  initNotifications,
} from '../utils/notifications';
import { getSettings } from './SettingsScreen';

// ── Feature Icons ───────────────────────────────────────
const iconPaths: Record<string, string> = {
  checkIn: '/icons/checkin.png?v=6',
  checkedIn: '/icons/checkin.png?v=6',
  tips: '/icons/tips.png?v=6',
  breathe: '/icons/breathe.png?v=6',
  journal: '/icons/journal.png?v=6',
  hydration: '/icons/hydration.png?v=6',
  report: '/icons/report.png?v=6',
};

const ICON_ALT_TEXT: Record<string, string> = {
  checkIn: 'Check-in icon',
  checkedIn: 'Checked in icon',
  tips: 'Tips icon',
  breathe: 'Breathing exercise icon',
  journal: 'Journal icon',
  hydration: 'Hydration tracking icon',
  report: 'Report icon',
};

const FeatureIcon = ({ name, size = 36 }: { name: string; size?: number }) => {
  if (Platform.OS !== 'web') return null;
  const src = iconPaths[name] || iconPaths.checkIn;
  return (
    <img
      src={src}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ marginBottom: 6, opacity: 0.85 }}
      alt=""
      aria-hidden="true"
    /> as any
  );
};

// ── helpers ──────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Still up? Rest well';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
};

const getPersonalGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'The quiet hours are yours.';
  if (h < 9) return 'A fresh start awaits.';
  if (h < 12) return 'Make this morning count.';
  if (h < 14) return 'Midday — pause and recalibrate.';
  if (h < 17) return 'The afternoon is still full of possibility.';
  if (h < 21) return 'Settle in. Reflect on today.';
  return 'Let the day go gently.';
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
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseHeart {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.25); }
    }
    @keyframes splashFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes logoReveal {
      from { opacity: 0; transform: scale(0.8) translateY(20px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    /* videoGlow removed — owl videos are full frame, no effects */
    @keyframes streakPulse {
      0%, 100% { transform: scaleX(1); }
      50% { transform: scaleX(1.02); }
    }
    @keyframes streakFillIn {
      from { width: 0%; }
    }
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
      overflow: hidden;
      cursor: pointer; position: relative;
    }
    .owl-video-container video {
      display: block; width: 100%;
    }
    .wellth-header-logo {
      transition: transform 0.3s ease;
    }
    .wellth-header-logo:hover {
      transform: scale(1.05);
    }
    .feature-btn-web {
      transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
    }
    .feature-btn-web:hover {
      background-color: #FFF9EE !important;
      border-color: #D4B96A !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(184,150,62,0.12);
    }
    .feature-btn-web:active {
      transform: translateY(0) scale(0.97);
      transition-duration: 0.05s;
    }
    @keyframes cardTapFeedback {
      0% { transform: scale(1); }
      50% { transform: scale(0.98); }
      100% { transform: scale(1); }
    }
    .streak-bar-fill {
      animation: streakFillIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: 0.3s;
    }
    .streak-segment {
      transition: background-color 0.3s ease, transform 0.2s ease;
    }
    .streak-segment:hover {
      transform: scaleY(1.15);
    }
    @keyframes milestonePulse {
      0% { border-color: #D4B96A; }
      50% { border-color: #B8963E; box-shadow: 0 0 20px rgba(184,150,62,0.2); }
      100% { border-color: #D4B96A; }
    }
    .milestone-celebration {
      animation: milestonePulse 2s ease-in-out 3;
    }
    [data-testid="title"], div[style*="Playfair"] { text-wrap: balance; }
    * { text-wrap: balance; border-radius: 0 !important; }
    
    /* Fix scrolling on web */
    html, body { height: 100vh; }
    body { overflow: auto !important; -webkit-font-smoothing: antialiased; }
    #root { height: 100vh; min-height: 100vh; }
    html { scroll-behavior: smooth; }

    /* Kill hairlines around videos */
    video { vertical-align: bottom; }
    .owl-video-container video, div video {
      vertical-align: bottom;
      image-rendering: auto;
    }

    /* Better text rendering */
    h1, h2, h3, p, span, div {
      text-rendering: optimizeLegibility;
    }

    /* WCAG AA contrast: ensure reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* Smooth scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #D4B96A; }
    ::-webkit-scrollbar-thumb:hover { background: #B8963E; }

    /* Focus states for accessibility */
    button:focus-visible, [role="button"]:focus-visible, a:focus-visible,
    [tabindex]:focus-visible, [accessibilityRole="button"]:focus-visible {
      outline: 3px solid #7A6520;
      outline-offset: 3px;
    }

    /* Input focus */
    textarea:focus-visible, input:focus-visible {
      outline: none;
      border-color: #7A6520 !important;
      box-shadow: 0 0 0 3px rgba(122,101,32,0.25);
    }

    /* Skip to content link */
    .skip-link {
      position: absolute; left: -9999px; top: auto;
      width: 1px; height: 1px; overflow: hidden;
      z-index: 99999;
      background: #1a1a1a; color: #FFFFFF; padding: 12px 24px;
      font-family: Georgia, serif; font-size: 14px;
      text-decoration: none;
    }
    .skip-link:focus {
      position: fixed; top: 10px; left: 10px;
      width: auto; height: auto;
      outline: 3px solid #7A6520;
    }

    /* Screen reader only utility */
    .sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    /* Ensure interactive elements are keyboard navigable */
    .feature-btn-web:focus-visible {
      outline: 3px solid #7A6520;
      outline-offset: 2px;
    }
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
    }, 2800);
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
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`} onClick={handleSkip} role="dialog" aria-label="Welcome to Wellth">
      <img
        src={require('../assets/wellth-logo.png')}
        className="splash-logo"
        style={{ width: 200, marginTop: 24 }}
        alt="Wellth logo"
      />
      <div className="splash-tagline" style={{ color: '#D4B96A' }}>Grow your wellth. Nourish your wellness.</div>
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

// ── Owl Video Section (no box/container — full frame, edge to edge) ──
const OwlVideoSection = React.memo(() => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const videos = [
    { src: '/videos/owl-looking.mp4', label: 'Owl is watching over your wellth' },
    { src: '/videos/owl-maturing.mp4', label: 'Growing wiser every day' },
    { src: '/videos/owl-emerging.mp4', label: 'Growing together' },
  ];

  const cycleVideo = () => {
    setCurrentVideo(prev => (prev + 1) % videos.length);
  };

  if (Platform.OS !== 'web') return null;

  return (
    <div onClick={cycleVideo} style={{
      width: '100vw', position: 'relative', left: '50%', right: '50%',
      marginLeft: '-50vw', marginRight: '-50vw',
      overflow: 'hidden',
      background: '#FFFFFF',
      lineHeight: 0,
      fontSize: 0,
    } as any}>
      <video
        key={videos[currentVideo].src}
        autoPlay
        muted
        playsInline
        loop
        src={videos[currentVideo].src}
        style={{ width: '100%', display: 'block', verticalAlign: 'bottom' }}
        aria-label={videos[currentVideo].label}
        role="img"
      />
    </div>
  );
});

// ── Streak Visualization ─────────────────────────────────
const StreakVisualization = ({ streak }: { streak: number }) => {
  if (streak <= 0) return null;

  const milestone = getStreakMilestone(streak);
  // Show last 7 days as segments
  const segments = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hasCheckIn = !!getCheckIn(key);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
    segments.push({ key, hasCheckIn, dayLabel, isToday: i === 0 });
  }

  // Progress toward next milestone
  const milestones = [7, 14, 21, 30, 60, 90, 365];
  const nextMilestone = milestones.find(m => m > streak) || streak + 10;
  const prevMilestone = milestones.filter(m => m <= streak).pop() || 0;
  const progress = ((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.streakBanner}>
        <Text style={styles.streakCount}>{streak}</Text>
        <Text style={styles.streakText}>{streak === 1 ? 'day' : 'days'} consistent</Text>
        {milestone && <Text style={styles.streakMilestone}>{milestone}</Text>}
      </View>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF', border: '1.5px solid #D4B96A', padding: '20px 24px',
      marginBottom: 24,
    }}>
      {/* Top row: count + label */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }} role="status" aria-label={`${streak} ${streak === 1 ? 'day' : 'days'} consistent streak`}>
        <span style={{
          fontSize: 42, fontWeight: '700', color: '#B8963E',
          fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1',
        }}>{streak}</span>
        <span style={{
          fontSize: 15, color: '#8A7A5A',
          fontFamily: 'Georgia, serif',
        }}>{streak === 1 ? 'day' : 'days'} consistent</span>
      </div>

      {/* 7-day segments */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {segments.map((seg) => (
          <div key={seg.key} className="streak-segment" style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{
              width: '100%', height: 32,
              backgroundColor: seg.hasCheckIn ? '#B8963E' : '#F0E8D8',
              border: seg.isToday ? '2px solid #8A7030' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {seg.hasCheckIn && (
                <span style={{ color: '#FFF', fontSize: 11, fontWeight: '700', fontFamily: 'Georgia, serif' }}>
                  {'\u2713'}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10, color: seg.isToday ? '#B8963E' : '#999',
              fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: 0.5,
              fontWeight: seg.isToday ? '700' : '400',
            }}>{seg.dayLabel}</span>
          </div>
        ))}
      </div>

      {/* Progress bar toward next milestone */}
      <div style={{ marginBottom: milestone ? 10 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: 1 }}>
            Progress
          </span>
          <span style={{ fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif' }}>
            {nextMilestone} day{nextMilestone !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ height: 6, backgroundColor: '#F0E8D8', width: '100%' }}>
          <div className="streak-bar-fill" style={{
            height: '100%', backgroundColor: '#B8963E',
            width: `${Math.min(progress, 100)}%`,
          }} />
        </div>
      </div>

      {milestone && (
        <div className="milestone-celebration" style={{
          marginTop: 14, padding: '16px 20px', backgroundColor: '#FFF9EE',
          border: '1.5px solid #D4B96A', textAlign: 'center',
        }}>
          <div style={{
            fontSize: 11, color: '#BBAA88', fontFamily: 'Georgia, serif',
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6,
          }}>Milestone Reached</div>
          <div style={{
            fontSize: 16, color: '#B8963E', fontStyle: 'italic',
            fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1.6',
          }}>{milestone}</div>
        </div>
      )}
    </div>
  );
};

// ── Daily Reflection Prompts ─────────────────────────────
const WEALTH_REFLECTIONS: string[] = [
  'What is one purchase you made recently that truly added value to your life?',
  'Where does your money go when you are not paying attention?',
  'What would financial peace look like for you, specifically?',
  'If you could teach one money lesson to your younger self, what would it be?',
  'What is one expense you could release without missing it?',
  'How do you define "enough" — and has that definition changed?',
  'What is the relationship between your spending and your happiness?',
  'When did you last feel genuinely proud of a financial decision?',
  'What fear drives your financial behavior the most?',
  'If money were no concern, how would your daily life actually change?',
];

const WELLNESS_REFLECTIONS: string[] = [
  'What did your body need today that you may have overlooked?',
  'When did you last feel truly at peace — and what were you doing?',
  'What habit serves you well that you rarely acknowledge?',
  'How does your energy shift between morning and evening?',
  'What would you do differently today if rest were your priority?',
  'Who in your life makes you feel most like yourself?',
  'What is one boundary you need to set — or reinforce?',
  'When did you last do something purely for the joy of it?',
  'What is your body telling you right now, in this moment?',
  'How would you describe your relationship with stillness?',
];

const getReflection = (label: string, tipIdx: number): string => {
  const reflections = label.toLowerCase().includes('wellth') || label.toLowerCase().includes('wealth') ? WEALTH_REFLECTIONS : WELLNESS_REFLECTIONS;
  return reflections[tipIdx % reflections.length];
};

// ── AnimatedTipCard with cycling ─────────────────────────
const AnimatedTipCard = React.memo(({ label, tips, dayIndex, favorites, onToggleFav }: {
  label: string; tips: string[]; dayIndex: number;
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
        </View>
        <TouchableOpacity
          onPress={() => onToggleFav(tip)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isFav ? 'Remove from saved tips' : 'Save this tip'}
          accessibilityState={{ selected: isFav }}
          {...(Platform.OS === 'web' ? { className: `fav-btn ${isFav ? 'active' : ''}` } : {})}
        >
          <Text style={[styles.favHeart, isFav && styles.favHeartActive]}>
            {isFav ? 'SAVED' : 'SAVE'}
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.tipText}>{tip}</Text>
        <View style={styles.reflectionBox}>
          <Text style={styles.reflectionLabel}>Daily Reflection</Text>
          <Text style={styles.reflectionText}>{getReflection(label, tipIdx)}</Text>
        </View>
      </Animated.View>

      <View style={styles.tipNav}>
        <TouchableOpacity onPress={() => cycleTip(-1)} activeOpacity={0.6} style={styles.tipNavBtn} accessibilityRole="button" accessibilityLabel="Previous tip">
          <Text style={styles.tipNavArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.tipNavCounter} accessibilityLabel={`Tip ${tipIdx + 1} of ${tips.length}`}>{tipIdx + 1} / {tips.length}</Text>
        <TouchableOpacity onPress={() => cycleTip(1)} activeOpacity={0.6} style={styles.tipNavBtn} accessibilityRole="button" accessibilityLabel="Next tip">
          <Text style={styles.tipNavArrow}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

// ── FavoritesPanel ───────────────────────────────────────
const FavoritesPanel = ({ favorites, onClose }: { favorites: string[]; onClose: () => void }) => {
  const webProps: any = Platform.OS === 'web' ? { className: 'fav-panel' } : {};
  return (
    <View style={styles.favPanel} {...webProps}>
      <View style={styles.favPanelHeader}>
        <Text style={styles.favPanelTitle}>Saved Tips</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close saved tips panel">
          <Text style={styles.favPanelClose}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
      {favorites.length === 0 ? (
        <Text style={styles.favEmpty}>Tap SAVE on any tip to keep it here.</Text>
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

// ── Weekly Motivational Quotes ───────────────────────────
const WEEKLY_QUOTES = [
  { text: 'The body benefits from movement, and the mind benefits from stillness.', author: 'Sakyong Mipham' },
  { text: 'Take care of your body. It is the only place you have to live.', author: 'Jim Rohn' },
  { text: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott' },
  { text: 'Wellness is the complete integration of body, mind, and spirit.', author: 'Greg Anderson' },
  { text: 'The greatest wealth is health.', author: 'Virgil' },
  { text: 'Calm mind brings inner strength and self-confidence, so that is very important for good health.', author: 'Dalai Lama' },
  { text: 'Happiness is the highest form of health.', author: 'Dalai Lama' },
  { text: 'To keep the body in good health is a duty, otherwise we shall not be able to keep the mind strong and clear.', author: 'Buddha' },
  { text: 'The mind and body are not separate. What affects one, affects the other.', author: 'Unknown' },
  { text: 'Self-care is not self-indulgence, it is self-preservation.', author: 'Audre Lorde' },
  { text: 'You cannot pour from an empty cup. Take care of yourself first.', author: 'Unknown' },
  { text: 'Health is not valued till sickness comes.', author: 'Thomas Fuller' },
  { text: 'Rest when you are weary. Refresh and renew yourself, your body, your mind, your spirit.', author: 'Ralph Marston' },
  { text: 'Investing in yourself is the best investment you will ever make.', author: 'Robin Sharma' },
  { text: 'A healthy outside starts from the inside.', author: 'Robert Urich' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'The secret of health for both mind and body is not to mourn for the past, not to worry about the future, but to live the present moment wisely.', author: 'Buddha' },
  { text: 'Your calm mind is the ultimate weapon against your challenges.', author: 'Bryant McGill' },
  { text: 'Be patient with yourself. Nothing in nature blooms all year.', author: 'Unknown' },
  { text: 'Sleep is the best meditation.', author: 'Dalai Lama' },
  { text: 'When you own your breath, nobody can steal your peace.', author: 'Unknown' },
  { text: 'It is health that is real wealth and not pieces of gold and silver.', author: 'Mahatma Gandhi' },
  { text: 'Nourishing yourself in a way that helps you blossom in the direction you want to go is attainable, and you are worth the effort.', author: 'Deborah Day' },
  { text: 'Life is not merely to be alive, but to be well.', author: 'Marcus Valerius Martial' },
  { text: 'The only way to keep your health is to eat what you do not want, drink what you do not like, and do what you would rather not.', author: 'Mark Twain' },
  { text: 'An early morning walk is a blessing for the whole day.', author: 'Henry David Thoreau' },
  { text: 'He who has health has hope, and he who has hope has everything.', author: 'Thomas Carlyle' },
  { text: 'Every day is a chance to begin again. Do not focus on the failures of yesterday, start today with positive thoughts and expectations.', author: 'Catherine Pulsifer' },
  { text: 'Physical fitness is the first requisite of happiness.', author: 'Joseph Pilates' },
  { text: 'Water is the driving force of all nature.', author: 'Leonardo da Vinci' },
  { text: 'The wish for healing has always been half of health.', author: 'Lucius Annaeus Seneca' },
  { text: 'To ensure good health: eat lightly, breathe deeply, live moderately, cultivate cheerfulness, and maintain an interest in life.', author: 'William Londen' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'Your body hears everything your mind says.', author: 'Naomi Judd' },
  { text: 'Time and health are two precious assets that we do not recognize and appreciate until they have been depleted.', author: 'Denis Waitley' },
  { text: 'Keeping your body healthy is an expression of gratitude to the whole cosmos.', author: 'Thich Nhat Hanh' },
  { text: 'A good laugh and a long sleep are the best cures in the doctor is book.', author: 'Irish Proverb' },
  { text: 'Health is a state of complete harmony of the body, mind and spirit.', author: 'B.K.S. Iyengar' },
  { text: 'Looking after my health today gives me a better hope for tomorrow.', author: 'Anne Wilson Schaef' },
  { text: 'In the midst of movement and chaos, keep stillness inside of you.', author: 'Deepak Chopra' },
  { text: 'Tension is who you think you should be. Relaxation is who you are.', author: 'Chinese Proverb' },
  { text: 'Movement is a medicine for creating change in a person is physical, emotional, and mental states.', author: 'Carol Welch' },
  { text: 'A fit body, a calm mind, a house full of love. These things cannot be bought. They must be earned.', author: 'Naval Ravikant' },
  { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
  { text: 'You are what you do, not what you say you will do.', author: 'Carl Jung' },
  { text: 'Create healthy habits, not restrictions.', author: 'Unknown' },
  { text: 'The groundwork for all happiness is good health.', author: 'Leigh Hunt' },
  { text: 'Peace comes from within. Do not seek it without.', author: 'Buddha' },
  { text: 'What we achieve inwardly will change outer reality.', author: 'Plutarch' },
  { text: 'One small positive thought in the morning can change your whole day.', author: 'Dalai Lama' },
  { text: 'True silence is the rest of the mind, and is to the spirit what sleep is to the body, nourishment and refreshment.', author: 'William Penn' },
  { text: 'Gratitude turns what we have into enough.', author: 'Melody Beattie' },
];

const getWeeklyQuote = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 864e5));
  return WEEKLY_QUOTES[weekNumber % WEEKLY_QUOTES.length];
};

const WeeklyQuote = () => {
  const quote = getWeeklyQuote();
  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D4B96A',
      padding: 24, marginBottom: 16, alignItems: 'center',
    }}>
      <Text style={{
        fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
        textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 12,
      }} accessibilityRole="header" aria-level={2}>Quote of the Week</Text>
      <Text style={{
        fontSize: 17, lineHeight: 30, color: '#3A3A3A', fontFamily: serif,
        fontStyle: 'italic', textAlign: 'center', marginBottom: 10,
      }}>{quote.text}</Text>
      <Text style={{
        fontSize: 12, color: '#BBAA88', fontFamily: bodySerif,
      }}>-- {quote.author}</Text>
    </View>
  );
};

// ── Evening Prompt Banner ────────────────────────────────
const EveningPromptBanner = ({ navigation }: { navigation?: any }) => {
  const h = new Date().getHours();
  if (h < 17 && h >= 5) return null; // Only show in evening/night

  const today = new Date().toISOString().slice(0, 10);
  const alreadyReflected = storage.getJSON(`wellth_evening_${today}`, null);
  if (alreadyReflected) return null;

  return (
    <TouchableOpacity
      onPress={() => navigation?.navigate('EveningReflection')}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A',
        padding: 20, marginBottom: 16,
      }}
      {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
    >
      <Text style={{
        fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
        textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 8,
      }}>Evening Check-In</Text>
      <Text style={{
        fontSize: 17, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic', lineHeight: 26,
      }}>How was your day?</Text>
      <Text style={{
        fontSize: 12, color: '#B8963E', fontFamily: bodySerif, marginTop: 8,
      }}>Tap to reflect {'\u2192'}</Text>
    </TouchableOpacity>
  );
};

// ── Daily Affirmations ───────────────────────────────────
const AFFIRMATIONS = [
  'You are building something meaningful, one day at a time.',
  'Your consistency today is your freedom tomorrow.',
  'Small steps, taken daily, lead to extraordinary places.',
  'You deserve the peace you are creating for yourself.',
  'Progress, not perfection, is the path.',
  'What you nurture in yourself will flourish.',
  'Today is another chance to grow your wellth.',
  'Your discipline is an act of self-love.',
  'The best investment you can make is in yourself.',
  'You are more resilient than you realize.',
  'Every healthy choice compounds over time.',
  'Be patient with yourself. Growth takes time.',
  'Your future self is grateful for what you do today.',
  'Stillness and action both have their season.',
  'You are worthy of the life you are building.',
  'Trust the process. Trust yourself.',
  'What matters most is that you showed up.',
  'Rest is not the opposite of progress. It is part of it.',
  'Your presence here is proof of your commitment.',
  'The wealth that matters most cannot be measured in dollars.',
];

const DailyAffirmation = ({ dayIndex }: { dayIndex: number }) => {
  const affirmation = AFFIRMATIONS[dayIndex % AFFIRMATIONS.length];

  return (
    <View style={{
      backgroundColor: '#FFF9EE', borderWidth: 1.5, borderColor: '#D4B96A',
      padding: 22, marginBottom: 24, alignItems: 'center',
    }}>
      <Text style={{
        fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
        textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 10,
      }} accessibilityRole="header" aria-level={2}>Daily Affirmation</Text>
      <Text style={{
        fontSize: 17, lineHeight: 30, color: '#3A3A3A', fontFamily: serif,
        fontStyle: 'italic', textAlign: 'center',
      }}>{affirmation}</Text>
    </View>
  );
};

// ── Quick Pulse (one-tap mood check-in) ──────────────────
const PULSE_PREFIX = 'wellth_pulse_';
const PULSE_MOODS = [
  { label: 'Rough', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Okay', value: 3 },
  { label: 'Good', value: 4 },
  { label: 'Great', value: 5 },
];

const QuickPulse = () => {
  const [pulseMood, setPulseMood] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const now = new Date();
  const pulseKey = `${PULSE_PREFIX}${now.toISOString().slice(0, 13)}`; // hourly granularity

  useEffect(() => {
    const existing = storage.getJSON<number | null>(pulseKey, null);
    if (existing) { setPulseMood(existing); setJustSaved(true); }
  }, []);

  const handlePulse = (value: number) => {
    setPulseMood(value);
    storage.setJSON(pulseKey, value);
    setJustSaved(true);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC',
      padding: 18, marginBottom: 16,
    }}>
      <Text style={{
        fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
        textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 12, textAlign: 'center',
      }} accessibilityRole="header" aria-level={2}>How are you right now?</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="radiogroup" accessibilityLabel="Mood selection">
        {PULSE_MOODS.map(m => (
          <TouchableOpacity
            key={m.value}
            onPress={() => handlePulse(m.value)}
            activeOpacity={0.6}
            accessibilityRole="radio"
            accessibilityLabel={`${m.label}, ${m.value} out of 5`}
            accessibilityState={{ selected: pulseMood === m.value }}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2,
              borderWidth: 1.5,
              borderColor: pulseMood === m.value ? '#B8963E' : '#EDE3CC',
              backgroundColor: pulseMood === m.value ? '#FFF9EE' : '#FFFFFF',
            }}
          >
            <Text style={{
              fontSize: 18, fontWeight: '700', fontFamily: serif,
              color: pulseMood === m.value ? '#B8963E' : '#CCBBAA',
            }}>{m.value}</Text>
            <Text style={{
              fontSize: 9, fontFamily: bodySerif, textTransform: 'uppercase' as any,
              letterSpacing: 0.3, marginTop: 2,
              color: pulseMood === m.value ? '#B8963E' : '#999',
              fontWeight: pulseMood === m.value ? '600' : '400',
            }}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {justSaved && (
        <Text style={{
          fontSize: 12, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic',
          textAlign: 'center', marginTop: 8,
        }}>Noted. Keep going.</Text>
      )}
    </View>
  );
};

// ── Wellness Score Breakdown ─────────────────────────────
const SCORE_WEIGHTS = [
  { key: 'mood', label: 'Mood', weight: 30, color: '#B8963E' },
  { key: 'sleep', label: 'Sleep', weight: 25, color: '#4A90D9' },
  { key: 'water', label: 'Water', weight: 20, color: '#87CEEB' },
  { key: 'breathing', label: 'Breathing', weight: 15, color: '#8BC34A' },
  { key: 'journal', label: 'Journal', weight: 10, color: '#D4B96A' },
];

const WellnessBreakdown = () => {
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const dates = getWeekDates();
    const checkins = dates.map(d => getCheckIn(d)).filter(Boolean) as CheckInData[];
    const n = checkins.length || 1;

    const moodScore = checkins.length > 0
      ? (checkins.reduce((s, c) => s + c.mood, 0) / n) / 5 * 100 : 0;

    const sleepScore = checkins.length > 0
      ? Math.min(((checkins.reduce((s, c) => s + c.sleep, 0) / n) / 8) * 100, 100) : 0;

    const waterScore = checkins.length > 0
      ? Math.min(((checkins.reduce((s, c) => s + c.water, 0) / n) / 8) * 100, 100) : 0;

    // Breathing: check if any sessions logged
    let breathDays = 0;
    dates.forEach(d => {
      if (storage.getJSON(`wellth_breathing_${d}`, null)) breathDays++;
    });
    const breathScore = (breathDays / 7) * 100;

    // Journal entries
    let journalDays = 0;
    dates.forEach(d => {
      if (storage.getJSON(`wellth_journal_${d}`, null)) journalDays++;
    });
    const journalScore = (journalDays / 7) * 100;

    setScores({ mood: moodScore, sleep: sleepScore, water: waterScore, breathing: breathScore, journal: journalScore });
  }, []);

  const totalScore = SCORE_WEIGHTS.reduce((s, w) => s + ((scores[w.key] || 0) * w.weight / 100), 0);

  if (totalScore === 0) return null;

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE3CC',
      padding: 20, marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <Text style={{
          fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
          textTransform: 'uppercase' as any, letterSpacing: 1.5,
        }}>Wellness Score</Text>
        <Text style={{
          fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif,
        }}>{Math.round(totalScore)}</Text>
      </View>
      {SCORE_WEIGHTS.map(w => {
        const val = scores[w.key] || 0;
        const contribution = (val * w.weight / 100);
        return (
          <View key={w.key} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif }}>{w.label} ({w.weight}%)</Text>
              <Text style={{ fontSize: 12, color: '#B8963E', fontFamily: bodySerif, fontWeight: '600' }}>
                {contribution.toFixed(0)} pts
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#F0E8D8', width: '100%' }}>
              <View style={{ height: '100%', backgroundColor: w.color, width: `${Math.min(val, 100)}%` }} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ── HomeScreen ───────────────────────────────────────────
const HomeScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const dayIndex = getDayIndex();

  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [showOnboarding, setShowOnboarding] = useState(!hasOnboarded());
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [liveTips, setLiveTips] = useState<{ wealth: string[]; wellness: string[] }>({ wealth: wealthTips, wellness: wellnessTips });
  const [showConfetti, setShowConfetti] = useState(false);

  // Alternate between wealth and wellness tips daily
  const todayTipLabel = dayIndex % 2 === 0 ? 'Wellth tip' : 'wellness tip';
  const todayTips = dayIndex % 2 === 0 ? liveTips.wealth : liveTips.wellness;

  useEffect(() => {
    const s = getStreak();
    setStreak(s);
    setCheckedInToday(!!getCheckIn(todayKey()));
    if (getStreakMilestone(s)) {
      const confettiKey = `wellth_confetti_${s}`;
      if (Platform.OS === 'web' && !sessionStorage.getItem(confettiKey)) {
        sessionStorage.setItem(confettiKey, 'true');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4500);
      }
    }
    fetchTips().then(() => {
      setLiveTips({ wealth: getWealthTips(), wellness: getWellnessTips() });
    });
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => { initNotifications(); }, []);

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

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => {
      setShowOnboarding(false);
      if (!hasTutorialCompleted()) setShowTutorial(true);
    }} />;
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]} accessibilityRole="main" accessibilityLabel="Wellth home screen">
      {Platform.OS === 'web' && (<a href="#main-content" className="skip-link">Skip to main content</a> as any)}
      <Confetti active={showConfetti} />
      {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}
      <Animated.View style={Platform.OS !== 'web' ? { opacity: fadeAnim, transform: [{ translateY: slideAnim }] } : undefined}>

        {/* ── Hero: Logo ── */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/wellth-logo.png')}
            style={[styles.headerLogo, isSmall && { width: 209, height: 63 }]}
            resizeMode="contain"
            {...(Platform.OS === 'web' ? { className: 'wellth-header-logo' } as any : {})}
            accessibilityLabel="Wellth"
          />
        </View>

        {/* ── Hero: Owl Video — DO NOT TOUCH ── */}
        <OwlVideoSection />

        {/* ── Hero: Greeting ── */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText} accessibilityRole="header" aria-level={1}>{getGreeting()}</Text>
        </View>
        <Text style={styles.greetingSubtext}>{getPersonalGreeting()}</Text>
        <Text style={styles.greetingDate} accessibilityRole="text">{getFormattedDate()}</Text>

        {/* ── Content ── */}
        <View style={{ backgroundColor: '#FAF8F3', marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28, paddingTop: 24, marginTop: 8 }}>

        {Platform.OS === 'web' && (<div id="main-content" tabIndex={-1} /> as any)}

        {/* Primary Action — Check In (only if not yet done) */}
        {!checkedInToday && (
          <TouchableOpacity
            style={{
              backgroundColor: '#B8963E', paddingVertical: 18, alignItems: 'center',
              marginBottom: 24, borderWidth: 1.5, borderColor: '#B8963E',
            }}
            onPress={() => navigation?.navigate('CheckIn')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Start your daily check-in"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 }}>
              Daily Check-In
            </Text>
          </TouchableOpacity>
        )}

        {/* Streak (only if checked in) */}
        {checkedInToday && <StreakVisualization streak={streak} />}

        {/* Quick Pulse */}
        <QuickPulse />

        {/* Feature Grid — Row 1 */}
        <View style={[styles.featureGrid, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.featureBtn, checkedInToday && styles.featureBtnHighlight]}
            onPress={() => navigation?.navigate('CheckIn')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={checkedInToday ? 'Check-in complete for today' : 'Daily check-in'}
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name={checkedInToday ? 'checkedIn' : 'checkIn'} />
            <Text style={styles.featureBtnLabel}>{checkedInToday ? 'Checked In' : 'Check In'}</Text>
            {!checkedInToday && <View style={styles.featureDot} accessibilityLabel="Not completed" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Breathing')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Breathing exercise"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="breathe" />
            <Text style={styles.featureBtnLabel}>Breathe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Journal')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open journal"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="journal" />
            <Text style={styles.featureBtnLabel}>Journal</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Grid — Row 2 */}
        <View style={[styles.featureGrid, { marginBottom: 24 }]}>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Sleep')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sleep tracking"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="report" />
            <Text style={styles.featureBtnLabel}>Sleep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Hydration')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Hydration tracking"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="hydration" />
            <Text style={styles.featureBtnLabel}>Hydration</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('WeeklyReport')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Weekly wellness report"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="report" />
            <Text style={styles.featureBtnLabel}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* More — expandable secondary features */}
        <TouchableOpacity
          style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 28, borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF', marginBottom: 16 }}
          onPress={() => setShowMore(s => !s)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={showMore ? 'Show fewer options' : 'Show more options'}
          accessibilityState={{ expanded: showMore }}
          {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8 }}>
            {showMore ? 'Less' : 'More'}
          </Text>
        </TouchableOpacity>

        {showMore && (
          <>
            <View style={styles.featureGrid}>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Gratitude')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Gratitude journal" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="journal" />
                <Text style={styles.featureBtnLabel}>Gratitude</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Achievements')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="View achievement badges" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="tips" />
                <Text style={styles.featureBtnLabel}>Badges</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('MyJourney')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="View my wellness journey" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Journey</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.featureGrid, { marginBottom: 8 }]}>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('MoodHistory')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Mood history" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Mood</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('ShareStreak')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share your streak" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('EveningReflection')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Evening reflection" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="journal" />
                <Text style={styles.featureBtnLabel}>Evening</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.featureGrid, { marginBottom: 16 }]}>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Tips')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Wellness tips" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="tips" />
                <Text style={styles.featureBtnLabel}>Tips</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Settings')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Settings" {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Settings</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>
          </>
        )}

        {/* Single Tip Card — alternates daily */}
        <AnimatedTipCard label={todayTipLabel} tips={todayTips} dayIndex={dayIndex} favorites={favorites} onToggleFav={toggleFav} />

        {/* Footer */}
        <View style={styles.footerDivider} />
        <Text style={styles.footer}>Grow your wellth. Nourish your wellness.</Text>
        <Text style={styles.copyright}>{'\u00A9'} {new Date().getFullYear()} Wellth</Text>

        </View>
      </Animated.View>
    </ScrollView>
  );
};

// ── styles ───────────────────────────────────────────────
const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const styles = StyleSheet.create({
  scrollView: Platform.OS === 'web' ? { minHeight: '100vh', backgroundColor: '#FFFFFF' } : { flex: 1, backgroundColor: '#FFFFFF' },
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
    width: 278, height: 84,
  },

  greetingRow: { marginBottom: 2, marginTop: 4 },
  greetingText: { fontSize: 24, color: '#3A3A3A', fontFamily: serif, fontWeight: '600', letterSpacing: 0.3 },
  greetingSubtext: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 4, lineHeight: 24 },
  greetingDate: { fontSize: 14, color: '#BBAA88', fontFamily: bodySerif, marginBottom: 24, letterSpacing: 0.3 },

  // Streak banner (native fallback)
  streakBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF9EE', borderRadius: 0, padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: '#D4B96A', flexWrap: 'wrap',
  },
  streakCount: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginRight: 8 },
  streakText: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif },
  streakMilestone: { width: '100%' as any, textAlign: 'center', fontSize: 14, color: '#B8963E', fontStyle: 'italic', fontFamily: bodySerif, marginTop: 6 },

  // Feature buttons
  featureGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  featureBtn: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 0, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#EDE3CC',
  },
  featureBtnHighlight: { borderColor: '#D4B96A', borderWidth: 1.5 },
  featureBtnLabel: { fontSize: 12, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8 },
  featureDot: {
    width: 6, height: 6, backgroundColor: '#D4B96A', borderRadius: 0,
    position: 'absolute' as any, top: 8, right: 8,
  },

  // Tip card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18,
  },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', flex: 1 },
  tipLabel: { fontSize: 12, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5 },
  tipLabelBoldGold: { fontSize: 12, fontWeight: '700', color: '#B8963E', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5 },
  tipText: { fontSize: 19, lineHeight: 34, color: '#3A3A3A', fontFamily: serif, letterSpacing: 0.2 },

  // Daily Reflection
  reflectionBox: {
    marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#F0E8D8',
  },
  reflectionLabel: {
    fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
    textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 8,
  },
  reflectionText: {
    fontSize: 16, lineHeight: 28, color: '#8A7A5A', fontFamily: serif,
    fontStyle: 'italic',
  },

  // Settings button
  settingsBtn: {
    alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 28,
    borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  settingsBtnText: {
    fontSize: 12, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif,
    textTransform: 'uppercase' as any, letterSpacing: 0.8,
  },

  // Tip navigation
  tipNav: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0E8D8',
  },
  tipNavBtn: { paddingHorizontal: 16, paddingVertical: 4 },
  tipNavArrow: { fontSize: 24, color: '#B8963E', fontWeight: '600' },
  tipNavCounter: { fontSize: 12, color: '#BBAA88', fontFamily: bodySerif, minWidth: 60, textAlign: 'center', letterSpacing: 1 },

  // Favorite heart
  favHeart: { fontSize: 10, color: '#CCBBAA', paddingLeft: 12, letterSpacing: 1, fontWeight: '600' as const },
  favHeartActive: { color: '#D4536A' },

  // Fav toggle button
  favToggle: {
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 0, borderWidth: 1.5, borderColor: '#D4B96A',
    marginBottom: 12,
  },
  favToggleText: { fontSize: 14, color: '#B8963E', fontWeight: '600', fontFamily: bodySerif, letterSpacing: 0.5 },

  // Fav panel
  favPanel: {
    backgroundColor: '#FFF9EE', borderRadius: 0, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#EDE3CC',
  },
  favPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  favPanelTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  favPanelClose: { fontSize: 20, color: '#999', paddingLeft: 12 },
  favEmpty: { fontSize: 15, color: '#999', fontStyle: 'italic', fontFamily: bodySerif },
  favItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDE3CC' },
  favItemText: { fontSize: 16, lineHeight: 28, color: '#3A3A3A', fontFamily: serif },

  // Footer
  footerDivider: {
    width: 40, height: 1, backgroundColor: '#D4B96A', alignSelf: 'center', marginTop: 16, marginBottom: 16,
  },
  footer: {
    textAlign: 'center', fontSize: 13, color: '#BBAA88',
    marginBottom: 4, fontStyle: 'italic', fontFamily: bodySerif,
  },
  copyright: {
    textAlign: 'center', fontSize: 11, color: '#CCBBAA',
    marginBottom: 8, fontFamily: bodySerif,
  },
});

export default HomeScreen;
