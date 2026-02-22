import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, Platform,
  useWindowDimensions, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { wealthTips, wellnessTips, fetchTips, getWealthTips, getWellnessTips } from '../data/tipData';
import { getStreak, getStreakMilestone, getCheckIn, todayKey, getWeekDates, CheckInData } from '../utils/storage';
import storage from '../utils/storage';
import Confetti from '../components/Confetti';
import {
  initNotifications,
} from '../utils/notifications';

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

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
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

// ── Storage keys for real-time logging ───────────────────
const TODAY_LOG_KEY = () => `wellth_daylog_${todayKey()}`;
const SETUP_KEY = 'wellth_setup_done';
const SETUP_DATA_KEY = 'wellth_setup_data';
const SPLASH_KEY = 'wellth_splash_seen';

interface DayLog {
  water: number;
  movement: number; // minutes
  meals: number;
  spend: number; // dollar amount
  steps: number; // daily steps
  pulses: { time: string; mood: number }[];
}

const emptyDayLog = (): DayLog => ({
  water: 0, movement: 0, meals: 0, spend: 0, steps: 0, pulses: [],
});

const getDayLog = (): DayLog => {
  return storage.getJSON<DayLog>(TODAY_LOG_KEY(), emptyDayLog());
};

const saveDayLog = (log: DayLog) => {
  storage.setJSON(TODAY_LOG_KEY(), log);
};

interface SetupData {
  focus: string; // 'both' | 'wellness' | 'wealth'
  waterGoal: number;
  name: string;
}

const getSetupData = (): SetupData => {
  return storage.getJSON<SetupData>(SETUP_DATA_KEY, { focus: 'both', waterGoal: 8, name: '' });
};

const hasSetupDone = (): boolean => {
  if (Platform.OS !== 'web') return true;
  return localStorage.getItem(SETUP_KEY) === 'true';
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
    @keyframes splashFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes logoReveal {
      from { opacity: 0; transform: scale(0.8) translateY(20px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes streakFillIn {
      from { width: 0%; }
    }
    .tip-card { animation: fadeSlideIn 0.7s ease-out both; }
    .tip-card:nth-child(2) { animation-delay: 0.15s; }
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
    .tap-btn {
      transition: transform 0.1s ease, background-color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .tap-btn:active {
      transform: scale(0.95);
    }
    .tap-btn:hover {
      background-color: #FFF9EE !important;
    }
    [data-testid="title"], div[style*="Playfair"] { text-wrap: balance; }
    * { text-wrap: balance; border-radius: 0 !important; }

    html, body { height: 100vh; }
    body { overflow: auto !important; -webkit-font-smoothing: antialiased; }
    #root { height: 100vh; min-height: 100vh; }
    html { scroll-behavior: smooth; }
    video { vertical-align: bottom; }
    h1, h2, h3, p, span, div { text-rendering: optimizeLegibility; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #D4B96A; }
    ::-webkit-scrollbar-thumb:hover { background: #B8963E; }

    button:focus-visible, [role="button"]:focus-visible, a:focus-visible,
    [tabindex]:focus-visible {
      outline: 3px solid #7A6520;
      outline-offset: 3px;
    }
    textarea:focus-visible, input:focus-visible {
      outline: none;
      border-color: #7A6520 !important;
      box-shadow: 0 0 0 3px rgba(122,101,32,0.25);
    }
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
    .sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap; border: 0;
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
      setTimeout(() => { markSplashSeen(); onDone(); }, 800);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);

  const handleSkip = () => {
    setFadeOut(true);
    setTimeout(() => { markSplashSeen(); onDone(); }, 400);
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

// ── Owl Video Section (full frame, edge to edge) ──
const OwlVideoSection = React.memo(() => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videos = [
    { src: '/videos/owl-looking.mp4', label: 'Owl is watching over your wellth' },
    { src: '/videos/owl-maturing.mp4', label: 'Growing wiser every day' },
    { src: '/videos/owl-emerging.mp4', label: 'Growing together' },
  ];

  const cycleVideo = () => {
    setCurrentVideo(prev => (prev + 1) % videos.length);
  };

  // Resume playback when page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // Also handle focus events for iOS Safari
    window.addEventListener('focus', () => {
      if (videoRef.current) videoRef.current.play().catch(() => {});
    });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <div onClick={cycleVideo} className="owl-video-wrap" style={{
      marginLeft: -28, marginRight: -28,
    } as any}>
      <style dangerouslySetInnerHTML={{ __html: `
        .owl-video-wrap { line-height: 0; font-size: 0; overflow: hidden; }
        .owl-video-wrap video { width: calc(100% + 10px); margin: -5px -5px; display: block; padding: 0; border: none; outline: none; vertical-align: top; }
      `}} />
      <video
        ref={(el: any) => { videoRef.current = el; }}
        key={videos[currentVideo].src}
        autoPlay
        muted
        playsInline
        loop
        src={videos[currentVideo].src}
        aria-label={videos[currentVideo].label}
        role="img"
      />
    </div>
  );
});

// ── Quick Setup (first visit only — 2 questions) ─────────
const QuickSetup = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState('both');
  const [waterGoal, setWaterGoal] = useState(8);

  const finish = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem(SETUP_KEY, 'true');
      storage.setJSON(SETUP_DATA_KEY, { focus, waterGoal, name: '' });
    }
    onDone();
  };

  if (Platform.OS !== 'web') { onDone(); return null; }

  if (step === 0) {
    return (
      <div style={{
        padding: '48px 28px', maxWidth: 520, margin: '0 auto', textAlign: 'center',
        minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif',
          textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
        }}>Quick Setup</div>
        <div style={{
          fontSize: 26, fontWeight: '700', color: '#B8963E',
          fontFamily: '"Playfair Display", Georgia, serif', marginBottom: 8,
        }}>What matters most to you right now?</div>
        <div style={{
          fontSize: 14, color: '#8A7A5A', fontFamily: 'Georgia, serif',
          fontStyle: 'italic', marginBottom: 32,
        }}>You can always change this later.</div>

        {[
          { key: 'both', label: 'Both wealth and wellness', desc: 'The full picture' },
          { key: 'wellness', label: 'Wellness first', desc: 'Exercise, water, sleep, mindfulness' },
          { key: 'wealth', label: 'Wealth first', desc: 'Spending awareness, financial health' },
        ].map(opt => (
          <div
            key={opt.key}
            className="tap-btn"
            onClick={() => setFocus(opt.key)}
            style={{
              padding: '18px 24px', marginBottom: 10, textAlign: 'left',
              border: focus === opt.key ? '2px solid #B8963E' : '1.5px solid #EDE3CC',
              backgroundColor: focus === opt.key ? '#FFF9EE' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <div style={{
              fontSize: 16, fontWeight: '600', color: '#3A3A3A',
              fontFamily: 'Georgia, serif',
            }}>{opt.label}</div>
            <div style={{
              fontSize: 13, color: '#8A7A5A', fontFamily: 'Georgia, serif', marginTop: 4,
            }}>{opt.desc}</div>
          </div>
        ))}

        <div
          className="tap-btn"
          onClick={() => setStep(1)}
          style={{
            marginTop: 24, padding: '16px 48px', backgroundColor: '#B8963E',
            color: '#FFFFFF', fontFamily: 'Georgia, serif', fontSize: 16,
            fontWeight: '700', border: 'none', cursor: 'pointer', display: 'inline-block',
          }}
        >Continue</div>
      </div>
    ) as any;
  }

  // Step 2: water goal
  return (
    <div style={{
      padding: '48px 28px', maxWidth: 520, margin: '0 auto', textAlign: 'center',
      minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{
        fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif',
        textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
      }}>Quick Setup</div>
      <div style={{
        fontSize: 26, fontWeight: '700', color: '#B8963E',
        fontFamily: '"Playfair Display", Georgia, serif', marginBottom: 8,
      }}>Daily water goal?</div>
      <div style={{
        fontSize: 14, color: '#8A7A5A', fontFamily: 'Georgia, serif',
        fontStyle: 'italic', marginBottom: 32,
      }}>Tap to adjust. Most people aim for 8 glasses.</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 32 }}>
        <div
          className="tap-btn"
          onClick={() => setWaterGoal(Math.max(1, waterGoal - 1))}
          style={{
            width: 48, height: 48, border: '1.5px solid #D4B96A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#B8963E', fontWeight: '600', cursor: 'pointer',
            backgroundColor: '#FFFFFF',
          }}
        >{'\u2212'}</div>
        <div>
          <div style={{
            fontSize: 48, fontWeight: '700', color: '#B8963E',
            fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1',
          }}>{waterGoal}</div>
          <div style={{
            fontSize: 12, color: '#8A7A5A', fontFamily: 'Georgia, serif',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>glasses</div>
        </div>
        <div
          className="tap-btn"
          onClick={() => setWaterGoal(waterGoal + 1)}
          style={{
            width: 48, height: 48, border: '1.5px solid #D4B96A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#B8963E', fontWeight: '600', cursor: 'pointer',
            backgroundColor: '#FFFFFF',
          }}
        >+</div>
      </div>

      <div
        className="tap-btn"
        onClick={finish}
        style={{
          padding: '16px 48px', backgroundColor: '#B8963E',
          color: '#FFFFFF', fontFamily: 'Georgia, serif', fontSize: 16,
          fontWeight: '700', border: 'none', cursor: 'pointer', display: 'inline-block',
        }}
      >Start Tracking</div>
    </div>
  ) as any;
};

// ── Streak Visualization ─────────────────────────────────
const StreakVisualization = ({ streak }: { streak: number }) => {
  if (streak <= 0) return null;

  const milestone = getStreakMilestone(streak);
  const segments: { key: string; hasCheckIn: boolean; dayLabel: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hasCheckIn = !!getCheckIn(key);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
    segments.push({ key, hasCheckIn, dayLabel, isToday: i === 0 });
  }

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
      backgroundColor: '#FFFFFF', border: '1.5px solid #D4B96A', padding: '16px 20px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }} role="status">
        <span style={{
          fontSize: 36, fontWeight: '700', color: '#B8963E',
          fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1',
        }}>{streak}</span>
        <span style={{
          fontSize: 14, color: '#8A7A5A', fontFamily: 'Georgia, serif',
        }}>{streak === 1 ? 'day' : 'days'} consistent</span>
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
        {segments.map((seg) => (
          <div key={seg.key} className="streak-segment" style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <div style={{
              width: '100%', height: 28,
              backgroundColor: seg.hasCheckIn ? '#B8963E' : '#F0E8D8',
              border: seg.isToday ? '2px solid #8A7030' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {seg.hasCheckIn && (
                <span style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{'\u2713'}</span>
              )}
            </div>
            <span style={{
              fontSize: 9, color: seg.isToday ? '#B8963E' : '#999',
              fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: 0.5,
              fontWeight: seg.isToday ? '700' : '400',
            }}>{seg.dayLabel}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: '#BBAA88', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: 1 }}>Progress</span>
          <span style={{ fontSize: 9, color: '#BBAA88', fontFamily: 'Georgia, serif' }}>{nextMilestone} days</span>
        </div>
        <div style={{ height: 5, backgroundColor: '#F0E8D8', width: '100%' }}>
          <div className="streak-bar-fill" style={{ height: '100%', backgroundColor: '#B8963E', width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
      {milestone && (
        <div style={{
          marginTop: 12, padding: '12px 16px', backgroundColor: '#FFF9EE',
          border: '1.5px solid #D4B96A', textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Milestone Reached</div>
          <div style={{ fontSize: 15, color: '#B8963E', fontStyle: 'italic', fontFamily: '"Playfair Display", Georgia, serif' }}>{milestone}</div>
        </div>
      )}
    </div>
  );
};

// ── Real-Time Tap Logger ─────────────────────────────────
const TapLogger = ({ dayLog, onUpdate }: { dayLog: DayLog; onUpdate: (log: DayLog) => void }) => {
  const setupData = getSetupData();
  const waterProgress = setupData.waterGoal > 0 ? Math.min(dayLog.water / setupData.waterGoal, 1) : 0;

  const tap = (field: keyof DayLog, increment: number) => {
    const updated = { ...dayLog };
    if (field === 'pulses') return;
    (updated[field] as number) = Math.max(0, (updated[field] as number) + increment);
    saveDayLog(updated);
    onUpdate(updated);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  if (Platform.OS !== 'web') return null;

  const items = [
    {
      key: 'water' as const,
      label: 'Water',
      value: dayLog.water,
      unit: `/ ${setupData.waterGoal}`,
      color: '#4A90D9',
      progress: waterProgress,
    },
    {
      key: 'movement' as const,
      label: 'Exercise',
      value: dayLog.movement,
      unit: 'min',
      color: '#8BC34A',
      increment: 15,
    },
    {
      key: 'meals' as const,
      label: 'Meals',
      value: dayLog.meals,
      unit: 'eaten',
      color: '#D4B96A',
    },
    {
      key: 'spend' as const,
      label: 'Spending',
      value: dayLog.spend,
      unit: 'today',
      color: '#B8963E',
      increment: 5,
      prefix: '$',
    },
    {
      key: 'steps' as const,
      label: 'Steps',
      value: dayLog.steps,
      unit: '/ 10,000',
      color: '#7A6520',
      increment: 1000,
    },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif',
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
      }}>Today So Far</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(item => {
          const inc = (item as any).increment || 1;
          const prefix = (item as any).prefix || '';
          return (
            <div key={item.key} style={{
              backgroundColor: '#FFFFFF', border: '1.5px solid #EDE3CC', padding: '16px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Progress fill for water */}
              {item.key === 'water' && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${waterProgress * 100}%`,
                  backgroundColor: 'rgba(74, 144, 217, 0.06)',
                  transition: 'height 0.3s ease',
                }} />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif',
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{
                      fontSize: 28, fontWeight: '700', color: item.color,
                      fontFamily: '"Playfair Display", Georgia, serif', lineHeight: '1',
                    }}>{prefix}{item.value}</span>
                    <span style={{
                      fontSize: 11, color: '#BBAA88', fontFamily: 'Georgia, serif', marginLeft: 4,
                    }}>{item.unit}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {item.value > 0 && (
                      <div
                        className="tap-btn"
                        onClick={() => tap(item.key, -inc)}
                        style={{
                          width: 32, height: 32, border: '1px solid #EDE3CC',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, color: '#BBAA88', backgroundColor: '#FFFFFF',
                        }}
                      >{'\u2212'}</div>
                    )}
                    <div
                      className="tap-btn"
                      onClick={() => tap(item.key, inc)}
                      style={{
                        width: 32, height: 32, border: '1.5px solid ' + item.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: item.color, fontWeight: '700',
                        backgroundColor: '#FFFFFF',
                      }}
                    >+</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) as any;
};

// ── Quick Pulse (mood) ───────────────────────────────────
const PULSE_MOODS = [
  { label: 'Rough', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Okay', value: 3 },
  { label: 'Good', value: 4 },
  { label: 'Great', value: 5 },
];

const QuickPulse = ({ dayLog, onUpdate }: { dayLog: DayLog; onUpdate: (log: DayLog) => void }) => {
  const latestPulse = dayLog.pulses.length > 0 ? dayLog.pulses[dayLog.pulses.length - 1].mood : null;
  const [justSaved, setJustSaved] = useState(false);

  const handlePulse = (value: number) => {
    const updated = { ...dayLog };
    updated.pulses = [...updated.pulses, { time: new Date().toISOString(), mood: value }];
    saveDayLog(updated);
    onUpdate(updated);
    setJustSaved(true);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EDE3CC',
      padding: 16, marginBottom: 16,
    }}>
      <Text style={{
        fontSize: 10, color: '#BBAA88', fontFamily: bodySerif,
        textTransform: 'uppercase' as any, letterSpacing: 1.5, marginBottom: 10, textAlign: 'center',
      }}>How are you right now?</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {PULSE_MOODS.map(m => (
          <TouchableOpacity
            key={m.value}
            onPress={() => handlePulse(m.value)}
            activeOpacity={0.6}
            accessibilityRole="radio"
            accessibilityLabel={`${m.label}, ${m.value} out of 5`}
            accessibilityState={{ selected: latestPulse === m.value }}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2,
              borderWidth: 1.5,
              borderColor: latestPulse === m.value ? '#B8963E' : '#EDE3CC',
              backgroundColor: latestPulse === m.value ? '#FFF9EE' : '#FFFFFF',
            }}
          >
            <Text style={{
              fontSize: 18, fontWeight: '700', fontFamily: serif,
              color: latestPulse === m.value ? '#B8963E' : '#CCBBAA',
            }}>{m.value}</Text>
            <Text style={{
              fontSize: 9, fontFamily: bodySerif, textTransform: 'uppercase' as any,
              letterSpacing: 0.3, marginTop: 2,
              color: latestPulse === m.value ? '#B8963E' : '#999',
              fontWeight: latestPulse === m.value ? '600' : '400',
            }}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {justSaved && (
        <Text style={{
          fontSize: 12, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic',
          textAlign: 'center', marginTop: 6,
        }}>Noted. Keep going.</Text>
      )}
    </View>
  );
};

// ── Morning Intention / Evening Summary ──────────────────
const TimeContextBanner = ({ dayLog, navigation }: { dayLog: DayLog; navigation?: any }) => {
  const tod = getTimeOfDay();

  if (Platform.OS !== 'web') return null;

  if (tod === 'morning') {
    const INTENTIONS = [
      'What is the one thing that would make today feel worthwhile?',
      'What will you prioritize today — and what will you let go of?',
      'How do you want to feel by the end of this day?',
      'What is one small act of discipline you can commit to today?',
      'Where will you direct your energy this morning?',
    ];
    const dayIdx = getDayIndex();
    const intention = INTENTIONS[dayIdx % INTENTIONS.length];

    return (
      <div style={{
        backgroundColor: '#FFF9EE', border: '1.5px solid #D4B96A',
        padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{
          fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif',
          textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
        }}>Morning Intention</div>
        <div style={{
          fontSize: 17, color: '#3A3A3A', fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic', lineHeight: '1.7',
        }}>{intention}</div>
      </div>
    ) as any;
  }

  if (tod === 'evening') {
    const avgMood = dayLog.pulses.length > 0
      ? (dayLog.pulses.reduce((s, p) => s + p.mood, 0) / dayLog.pulses.length).toFixed(1)
      : null;

    const summaryItems: string[] = [];
    if (dayLog.water > 0) summaryItems.push(`${dayLog.water} glasses of water`);
    if (dayLog.movement > 0) summaryItems.push(`${dayLog.movement} min of exercise`);
    if (dayLog.meals > 0) summaryItems.push(`${dayLog.meals} meal${dayLog.meals !== 1 ? 's' : ''}`);
    if (dayLog.steps > 0) summaryItems.push(`${dayLog.steps.toLocaleString()} steps`);
    if (dayLog.spend > 0) summaryItems.push(`$${dayLog.spend} spent`);

    return (
      <div style={{
        backgroundColor: '#FFF9EE', border: '1.5px solid #D4B96A',
        padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{
          fontSize: 10, color: '#BBAA88', fontFamily: 'Georgia, serif',
          textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
        }}>Today's Summary</div>
        {summaryItems.length > 0 ? (
          <div style={{ marginBottom: avgMood ? 10 : 0 }}>
            {summaryItems.map((item, i) => (
              <div key={i} style={{
                fontSize: 15, color: '#3A3A3A', fontFamily: 'Georgia, serif',
                lineHeight: '1.8',
              }}>{item}</div>
            ))}
          </div>
        ) : (
          <div style={{
            fontSize: 15, color: '#8A7A5A', fontFamily: 'Georgia, serif', fontStyle: 'italic',
          }}>Nothing logged yet today. Still time.</div>
        )}
        {avgMood && (
          <div style={{
            fontSize: 13, color: '#B8963E', fontFamily: 'Georgia, serif', fontStyle: 'italic',
          }}>Average mood: {avgMood} / 5</div>
        )}
        <div
          className="tap-btn"
          onClick={() => navigation?.navigate('EveningReflection')}
          style={{
            marginTop: 12, fontSize: 13, color: '#B8963E', fontFamily: 'Georgia, serif',
            cursor: 'pointer', fontWeight: '600',
          }}
        >Reflect on today {'\u2192'}</div>
      </div>
    ) as any;
  }

  return null;
};

// ── Tip Save/Share helpers ────────────────────────────────
const FAVORITES_KEY = 'wellth_favorites';

const getFavorites = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch { return []; }
};

const toggleFavorite = (tip: string): boolean => {
  const favs = getFavorites();
  const idx = favs.indexOf(tip);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(tip); }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return idx < 0; // true if now saved
};

const generateShareCard = async (tipText: string): Promise<Blob> => {
  const SIZE = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Tip text - left justified, 20% narrower column
  ctx.fillStyle = '#3A3A3A';
  ctx.font = '42px "Playfair Display", Georgia, "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Word wrap — left justified, adjusted column width
  const textMarginLeft = 100;
  const maxWidth = (SIZE - 360) * 0.92;

  // Helpers for sentence boundary detection
  const isSentenceEnd = (w: string) => /[.!?]$/.test(w) || /[.!?]["'\u201D]$/.test(w);

  // Step 1: Basic word wrap
  const allWords = tipText.split(/\s+/);
  let lines: string[] = [];
  let currentLine = '';
  for (const word of allWords) {
    if (!currentLine) { currentLine = word; continue; }
    const test = currentLine + ' ' + word;
    if (ctx.measureText(test).width <= maxWidth) {
      currentLine = test;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Step 2: Typographic cleanup (multiple passes to resolve cascading fixes)
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
      const lw = lines[i].trim().split(/\s+/);

      // Rule A: Line ENDS with 1 word that starts a new sentence
      // (the word before it ends a sentence with . ! ?)
      // Push that lone sentence-start word to the next line
      if (lw.length >= 2 && i < lines.length - 1) {
        const secondLast = lw[lw.length - 2];
        if (isSentenceEnd(secondLast)) {
          const orphan = lw.pop()!;
          lines[i] = lw.join(' ');
          lines[i + 1] = orphan + ' ' + lines[i + 1];
          changed = true; continue;
        }
      }

      // Rule B: Line has only 1 word — pull last word from previous line
      // so we always have at least 2 words per line
      if (lw.length === 1 && i > 0) {
        const pw = lines[i - 1].trim().split(/\s+/);
        if (pw.length > 2) {
          const pulled = pw.pop()!;
          lines[i - 1] = pw.join(' ');
          lines[i] = pulled + ' ' + lw[0];
          changed = true; continue;
        }
      }

      // Rule C: Next line STARTS with 1 word that ends a sentence (e.g. "go.")
      // Pull a companion word from this line so that ending word isn't alone
      if (i < lines.length - 1) {
        const nw = lines[i + 1].trim().split(/\s+/);
        if (nw.length >= 2 && isSentenceEnd(nw[0]) && lw.length > 2) {
          const pulled = lw.pop()!;
          lines[i] = lw.join(' ');
          lines[i + 1] = pulled + ' ' + lines[i + 1];
          changed = true; continue;
        }
      }
    }

    if (!changed) break;
  }

  // Rule D: Rag smoothing — if a line's last word makes it jut out significantly
  // past the line below (by 3+ characters worth of width), and the next line
  // has room to absorb it, knock that word down for a smoother right rag
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 0; i < lines.length - 1; i++) {
      const thisWidth = ctx.measureText(lines[i]).width;
      const nextWidth = ctx.measureText(lines[i + 1]).width;
      const lw = lines[i].trim().split(/\s+/);
      if (lw.length < 2) continue;
      const lastWord = lw[lw.length - 1];
      const lastWordWidth = ctx.measureText(lastWord).width;
      // How much does this line overshoot the next?
      const overshoot = thisWidth - nextWidth;
      // Threshold: ~3 average characters (~42px at this font size)
      const charWidth = ctx.measureText('abcde').width / 5;
      const threshold = charWidth * 3;
      if (overshoot > threshold) {
        // Check if next line can absorb the word
        const candidateNext = lastWord + ' ' + lines[i + 1];
        if (ctx.measureText(candidateNext).width <= maxWidth) {
          lw.pop();
          lines[i] = lw.join(' ');
          lines[i + 1] = candidateNext;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const lineHeight = 58;
  const totalHeight = lines.length * lineHeight;
  const startY = (SIZE - totalHeight) / 2 - 40;

  // Word spacing polish pass — measure each line, nudge toward average width
  const lineWidths = lines.map(l => ctx.measureText(l).width);
  const avgWidth = lineWidths.reduce((a, b) => a + b, 0) / lineWidths.length;
  const maxAdjust = 4.0; // max ±4px per word gap

  lines.forEach((line, i) => {
    const words = line.split(' ');
    if (words.length <= 1) {
      ctx.fillText(line, textMarginLeft, startY + i * lineHeight);
      return;
    }

    const gaps = words.length - 1;
    const diff = avgWidth - lineWidths[i]; // positive = line is short, negative = line is long
    const adjustPerGap = Math.max(-maxAdjust, Math.min(maxAdjust, diff / gaps));

    // Draw word by word with adjusted spacing
    const baseSpaceWidth = ctx.measureText(' ').width;
    const adjustedSpace = baseSpaceWidth + adjustPerGap;
    let x = textMarginLeft;
    words.forEach((word, w) => {
      ctx.fillText(word, x, startY + i * lineHeight);
      x += ctx.measureText(word).width + (w < gaps ? adjustedSpace : 0);
    });
  });

  // Bottom baseline — everything sits here
  const baseline = SIZE - 60;

  // Load images
  const loadImg = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      img.src = src;
    });

  try {
    const [logo, owl] = await Promise.all([
      loadImg('/wellth-logo.png'),
      loadImg('/owl-icon.png'),
    ]);
    // Logo lower-left (~270px wide, 35% larger), bottom-aligned to baseline
    if (logo.complete && logo.naturalWidth) {
      const lw = 270;
      const lh = lw * (logo.naturalHeight / logo.naturalWidth);
      ctx.drawImage(logo, 60 + 7, baseline - lh + 8, lw, lh);
    }
    // Owl lower-right (~312px wide, 25% larger), transparent PNG — no white bg
    if (owl.complete && owl.naturalWidth) {
      const ow = 312;
      const oh = ow * (owl.naturalHeight / owl.naturalWidth);
      ctx.drawImage(owl, SIZE - 60 - ow, baseline - oh, ow, oh);
    }
  } catch {}

  // "goodwellth.com" — nudged left 10px, up 2px
  ctx.fillStyle = '#BBAA88';
  ctx.font = '28px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('goodwellth.com', SIZE / 2 - 21, baseline - 20 - 12);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
};

const shareTip = async (tipText: string) => {
  const blob = await generateShareCard(tipText);
  const file = new File([blob], 'wellth-tip.png', { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Wellth Tip' });
      return;
    } catch {}
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wellth-tip.png';
  a.click();
  URL.revokeObjectURL(url);
};

// ── Daily Tip Card ───────────────────────────────────────
const DailyTipCard = React.memo(({ label, tips, dayIndex }: {
  label: string; tips: string[]; dayIndex: number;
}) => {
  const [tipIdx, setTipIdx] = useState(dayIndex % tips.length);
  const tip = tips[tipIdx];
  const [isSaved, setIsSaved] = useState(() => getFavorites().includes(tips[dayIndex % tips.length]));

  useEffect(() => {
    setIsSaved(getFavorites().includes(tip));
  }, [tip]);

  const handleSave = () => {
    const nowSaved = toggleFavorite(tip);
    setIsSaved(nowSaved);
  };

  const handleShare = () => {
    shareTip(tip);
  };

  const webProps: any = Platform.OS === 'web' ? { className: 'tip-card' } : {};

  return (
    <View style={styles.card} {...webProps}>
      <View style={styles.cardHeader}>
        <View style={styles.tipHeaderRow}>
          <Text style={styles.tipLabel}>Daily </Text>
          <Text style={styles.tipLabelBoldGold}>{label}</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#BBAA88', fontFamily: bodySerif }}>
          {tipIdx + 1} / {tips.length}
        </Text>
      </View>
      <Text style={styles.tipText}>{tip}</Text>
      <View style={styles.tipActions}>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.6}>
          <Text style={[styles.tipActionText, isSaved && styles.tipActionTextActive]}>
            {isSaved ? 'SAVED' : 'SAVE'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.6}>
          <Text style={styles.tipActionText}>SHARE</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tipNav}>
        <TouchableOpacity onPress={() => setTipIdx(prev => (prev - 1 + tips.length) % tips.length)} activeOpacity={0.6} style={styles.tipNavBtn}>
          <Text style={styles.tipNavArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTipIdx(prev => (prev + 1) % tips.length)} activeOpacity={0.6} style={styles.tipNavBtn}>
          <Text style={styles.tipNavArrow}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ── HomeScreen ───────────────────────────────────────────
const HomeScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const dayIndex = getDayIndex();

  const [showSetup, setShowSetup] = useState(!hasSetupDone());
  const [showSplash, setShowSplash] = useState(false); // Splash disabled — straight to dashboard
  const [showMore, setShowMore] = useState(false);
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [dayLog, setDayLog] = useState<DayLog>(getDayLog());
  const [liveTips, setLiveTips] = useState<{ wealth: string[]; wellness: string[] }>({ wealth: wealthTips, wellness: wellnessTips });
  const [showConfetti, setShowConfetti] = useState(false);

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

  useEffect(() => { initNotifications(); }, []);
  useEffect(() => { injectCSS(); }, []);

  const isSmall = width < 400;

  // Splash screen (session-based)
  if (showSplash && Platform.OS === 'web') {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  // Quick setup (first visit ever)
  if (showSetup) {
    return <QuickSetup onDone={() => setShowSetup(false)} />;
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, { maxWidth, alignSelf: 'center' as const }]} accessibilityRole="main">
      {Platform.OS === 'web' && (<a href="#main-content" className="skip-link">Skip to main content</a> as any)}
      <Confetti active={showConfetti} />

      {/* ── Logo ── */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/wellth-logo.png')}
          style={[styles.headerLogo, isSmall && { width: 209, height: 63 }]}
          resizeMode="contain"
          {...(Platform.OS === 'web' ? { className: 'wellth-header-logo' } as any : {})}
          accessibilityLabel="Wellth"
        />
      </View>

      {/* ── Owl Video ── */}
      <OwlVideoSection />

      {/* ── Greeting ── */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText} accessibilityRole="header" aria-level={1}>{getGreeting()}</Text>
      </View>
      <Text style={styles.greetingDate}>{getFormattedDate()}</Text>

      {/* ── Main Content ── */}
      <View style={{ backgroundColor: '#FFFFFF', marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28, paddingTop: 20, marginTop: 0 }}>
        {Platform.OS === 'web' && (<div id="main-content" tabIndex={-1} /> as any)}

        {/* Morning / Evening context */}
        <TimeContextBanner dayLog={dayLog} navigation={navigation} />

        {/* Real-time tap logger */}
        <TapLogger dayLog={dayLog} onUpdate={setDayLog} />

        {/* Quick Pulse mood */}
        <QuickPulse dayLog={dayLog} onUpdate={setDayLog} />

        {/* Check-in CTA (if not done) */}
        {!checkedInToday && (
          <TouchableOpacity
            style={{
              backgroundColor: '#B8963E', paddingVertical: 16, alignItems: 'center',
              marginBottom: 20, borderWidth: 1.5, borderColor: '#B8963E',
            }}
            onPress={() => navigation?.navigate('CheckIn')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Start your daily check-in"
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif, letterSpacing: 0.5 }}>
              Full Daily Check-In
            </Text>
          </TouchableOpacity>
        )}

        {/* Streak */}
        {streak > 0 && <StreakVisualization streak={streak} />}

        {/* Feature Grid */}
        <View style={[styles.featureGrid, { marginTop: 4 }]}>
          <TouchableOpacity
            style={[styles.featureBtn, checkedInToday && styles.featureBtnHighlight]}
            onPress={() => navigation?.navigate('CheckIn')}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name={checkedInToday ? 'checkedIn' : 'checkIn'} />
            <Text style={styles.featureBtnLabel}>{checkedInToday ? 'Checked In' : 'Check In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Breathing')}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="breathe" />
            <Text style={styles.featureBtnLabel}>Breathe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.featureBtn}
            onPress={() => navigation?.navigate('Journal')}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
          >
            <FeatureIcon name="journal" />
            <Text style={styles.featureBtnLabel}>Journal</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.featureGrid, { marginBottom: 20 }]}>
          <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Sleep')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
            <FeatureIcon name="report" />
            <Text style={styles.featureBtnLabel}>Sleep</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Hydration')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
            <FeatureIcon name="hydration" />
            <Text style={styles.featureBtnLabel}>Hydration</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('WeeklyReport')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
            <FeatureIcon name="report" />
            <Text style={styles.featureBtnLabel}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* More */}
        <TouchableOpacity
          style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF', marginBottom: 16 }}
          onPress={() => setShowMore(s => !s)}
          activeOpacity={0.7}
          accessibilityState={{ expanded: showMore }}
          {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8 }}>
            {showMore ? 'Less' : 'More'}
          </Text>
        </TouchableOpacity>

        {showMore && (
          <>
            <View style={styles.featureGrid}>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Gratitude')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="journal" />
                <Text style={styles.featureBtnLabel}>Gratitude</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Achievements')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="tips" />
                <Text style={styles.featureBtnLabel}>Badges</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('MyJourney')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Journey</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.featureGrid, { marginBottom: 8 }]}>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('MoodHistory')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Mood</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('ShareStreak')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('EveningReflection')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="journal" />
                <Text style={styles.featureBtnLabel}>Evening</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.featureGrid, { marginBottom: 16 }]}>
              {/* Tips button removed — save/share now on tip cards */}
              <TouchableOpacity style={styles.featureBtn} onPress={() => navigation?.navigate('Settings')} activeOpacity={0.7} {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}>
                <FeatureIcon name="report" />
                <Text style={styles.featureBtnLabel}>Settings</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>
          </>
        )}

        {/* Daily tips */}
        <DailyTipCard label="wealth tip" tips={liveTips.wealth} dayIndex={dayIndex} />
        <DailyTipCard label="wellness tip" tips={liveTips.wellness} dayIndex={dayIndex} />

        {/* Footer */}
        <View style={styles.footerDivider} />
        <Text style={styles.footer}>Grow your wellth. Nourish your wellness.</Text>
        <Text style={styles.copyright}>{'\u00A9'} {new Date().getFullYear()} Wellth</Text>
      </View>
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
  logoContainer: { alignItems: 'center', marginBottom: 0 },
  headerLogo: { width: 278, height: 84 },

  greetingRow: { marginBottom: 2, marginTop: 4 },
  greetingText: { fontSize: 24, color: '#3A3A3A', fontFamily: serif, fontWeight: '600', letterSpacing: 0.3 },
  greetingDate: { fontSize: 14, color: '#BBAA88', fontFamily: bodySerif, marginBottom: 16, letterSpacing: 0.3 },

  streakBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF9EE', padding: 16, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#D4B96A', flexWrap: 'wrap',
  },
  streakCount: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginRight: 8 },
  streakText: { fontSize: 16, color: '#8A7A5A', fontFamily: bodySerif },
  streakMilestone: { width: '100%' as any, textAlign: 'center', fontSize: 14, color: '#B8963E', fontStyle: 'italic', fontFamily: bodySerif, marginTop: 6 },

  featureGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  featureBtn: {
    flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#EDE3CC',
  },
  featureBtnHighlight: { borderColor: '#D4B96A', borderWidth: 1.5 },
  featureBtnLabel: { fontSize: 11, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 0.8 },

  card: {
    backgroundColor: '#FFFFFF', padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', flex: 1 },
  tipLabel: { fontSize: 11, color: '#8A7A5A', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5 },
  tipLabelBoldGold: { fontSize: 11, fontWeight: '700', color: '#B8963E', fontFamily: bodySerif, textTransform: 'uppercase' as any, letterSpacing: 1.5 },
  tipText: { fontSize: 18, lineHeight: 32, color: '#3A3A3A', fontFamily: serif, letterSpacing: 0.2 },

  tipActions: {
    flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 14,
  },
  tipActionText: {
    fontSize: 11, fontWeight: '600', color: '#BBAA88', fontFamily: bodySerif,
    textTransform: 'uppercase' as any, letterSpacing: 1.2,
  },
  tipActionTextActive: {
    color: '#B8963E',
  },
  tipNav: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0E8D8', gap: 24,
  },
  tipNavBtn: { paddingHorizontal: 16, paddingVertical: 4 },
  tipNavArrow: { fontSize: 24, color: '#B8963E', fontWeight: '600' },

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
