import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import QuickNav from '../components/QuickNav';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const PHASES = [
  { label: 'Breathe In', duration: 4000 },
  { label: 'Hold', duration: 4000 },
  { label: 'Breathe Out', duration: 4000 },
  { label: 'Hold', duration: 4000 },
];

// ── Web Audio API chime ──────────────────────────────────
const playChime = (frequency: number = 528, duration: number = 0.4) => {
  if (Platform.OS !== 'web') return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* silently fail */ }
};

const PHASE_CUES: Record<string, string[]> = {
  'Breathe In': ['Let the air fill you slowly...', 'Draw breath deep into your belly...', 'Inhale calm, inhale peace...'],
  'Hold': ['Hold gently. No tension.', 'Be still in this fullness.', 'Rest here a moment.'],
  'Breathe Out': ['Release everything softly...', 'Let it all go...', 'Exhale slowly, completely...'],
};

const getGuidedCue = (label: string, cycle: number): string => {
  const cues = PHASE_CUES[label] || PHASE_CUES['Hold'];
  return cues[cycle % cues.length];
};

const CALM_MESSAGES = [
  "Let the calm wash over you.",
  "You are doing beautifully.",
  "Feel each breath nourish your body.",
  "Breathe with intention.",
  "Stillness is your superpower.",
  "Peace flows through you.",
  "Every breath is a fresh start.",
  "You are exactly where you need to be.",
];

const injectBreathingCSS = () => {
  if (Platform.OS !== 'web') return;
  if (document.getElementById('wellth-breathing-css')) return;
  const style = document.createElement('style');
  style.id = 'wellth-breathing-css';
  style.textContent = `
    @keyframes gentlePulse {
      0%, 100% { box-shadow: 0 0 30px rgba(184,150,62,0.15); }
      50% { box-shadow: 0 0 60px rgba(184,150,62,0.35); }
    }
    .breathing-circle {
      transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 4s ease-in-out, background-color 4s ease;
    }
    .breathing-circle.inhale { transform: scale(1.35); box-shadow: 0 0 60px rgba(184,150,62,0.35); background-color: #FFF9EE; }
    .breathing-circle.hold { transform: scale(1.35); box-shadow: 0 0 40px rgba(184,150,62,0.25); background-color: #FFF5E0; }
    .breathing-circle.exhale { transform: scale(1); box-shadow: 0 0 20px rgba(184,150,62,0.12); background-color: #FFF9EE; }
    .breathing-circle.pause { transform: scale(1); box-shadow: 0 0 10px rgba(184,150,62,0.08); background-color: #FFFDF8; }
    .breathing-message {
      transition: opacity 0.8s ease;
    }
  `;
  document.head.appendChild(style);
};

const BreathingScreen = ({ navigation }: { navigation: any }) => {
  const onBack = () => navigation.goBack();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);

  const [isActive, setIsActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);
  const [calmMsg, setCalmMsg] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevPhaseRef = useRef(0);

  useEffect(() => { injectBreathingCSS(); }, []);

  useEffect(() => {
    if (!isActive) return;

    const phase = PHASES[phaseIndex];
    setCountdown(phase.duration / 1000);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return phase.duration / 1000;
        return prev - 1;
      });
      setTotalSeconds(s => s + 1);
    }, 1000);

    const phaseTimeout = setTimeout(() => {
      const nextPhase = (phaseIndex + 1) % PHASES.length;
      setPhaseIndex(nextPhase);
      // Play chime on phase change
      if (soundEnabled) {
        const freqs = [528, 396, 440, 396]; // different tone per phase
        playChime(freqs[nextPhase], 0.5);
      }
      if (nextPhase === 0) {
        setCycleCount(c => c + 1);
        setCalmMsg(m => (m + 1) % CALM_MESSAGES.length);
      }
    }, phase.duration);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(phaseTimeout);
    };
  }, [isActive, phaseIndex]);

  const start = () => {
    setIsActive(true);
    setPhaseIndex(0);
    setCycleCount(0);
    setCountdown(4);
    setTotalSeconds(0);
  };

  const stop = () => {
    setIsActive(false);
    setPhaseIndex(0);
    setCountdown(4);
  };

  const phase = PHASES[phaseIndex];
  const phaseClass = phaseIndex === 0 ? 'inhale' : phaseIndex === 1 ? 'hold' : phaseIndex === 2 ? 'exhale' : 'pause';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={[styles.screen, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Box Breathing</Text>
      <Text style={styles.subtitle}>4 - 4 - 4 - 4</Text>

      {/* Breathing Circle */}
      <View style={styles.circleContainer}>
        {Platform.OS === 'web' ? (
          <div
            className={`breathing-circle ${isActive ? phaseClass : ''}`}
            style={{
              width: 220, height: 220, borderRadius: 0,
              backgroundColor: '#FFF9EE', border: '2px solid #D4B96A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <span style={{
              fontSize: 48, fontWeight: '700', color: '#B8963E',
              fontFamily: '"Playfair Display", Georgia, serif',
              lineHeight: 1.1,
            }}>
              {isActive ? countdown : '\u00B7'}
            </span>
            <span style={{
              fontSize: 13, color: '#8A7A5A',
              fontFamily: 'Georgia, serif',
              marginTop: 8,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              {isActive ? phase.label : 'ready'}
            </span>
          </div>
        ) : (
          <View style={styles.circle}>
            <Text style={styles.circleCount}>{isActive ? countdown : '\u00B7'}</Text>
            <Text style={styles.circleLabel}>{isActive ? phase.label : 'ready'}</Text>
          </View>
        )}
      </View>

      {/* Guided cue */}
      {isActive && (
        <View style={styles.calmMsgContainer}>
          <Text style={[styles.calmMsgText, { fontSize: 18, color: '#3A3A3A', marginBottom: 6 }]}>
            {getGuidedCue(phase.label, cycleCount)}
          </Text>
          <Text style={styles.calmMsgText}>{CALM_MESSAGES[calmMsg]}</Text>
        </View>
      )}

      {/* Session stats */}
      {isActive && (
        <View style={styles.sessionStats}>
          <Text style={styles.sessionStatText}>
            {cycleCount} {cycleCount === 1 ? 'cycle' : 'cycles'}
            {' \u00B7 '}
            {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
          </Text>
        </View>
      )}

      {/* Sound toggle */}
      <TouchableOpacity
        onPress={() => setSoundEnabled(s => !s)}
        style={styles.soundToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.soundToggleText}>
          Sound: {soundEnabled ? 'On' : 'Off'}
        </Text>
      </TouchableOpacity>

      {/* Start/Stop */}
      <TouchableOpacity
        onPress={isActive ? stop : start}
        style={[styles.actionBtn, isActive && styles.actionBtnStop]}
        activeOpacity={0.7}
      >
        <Text style={styles.actionBtnText}>{isActive ? 'End Session' : 'Begin Breathing'}</Text>
      </TouchableOpacity>

      {/* Post-session summary */}
      {!isActive && cycleCount > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Session Complete</Text>
          <Text style={styles.summaryText}>
            {cycleCount} {cycleCount === 1 ? 'cycle' : 'cycles'} completed.
            {' '}Take a moment to notice how you feel.
          </Text>
        </View>
      )}

      {/* Instructions */}
      {!isActive && cycleCount === 0 && (
        <View style={styles.instructions}>
          <Text style={styles.instructTitle}>How Box Breathing Works</Text>
          <View style={styles.instructStep}>
            <Text style={styles.instructNum}>1</Text>
            <Text style={styles.instructText}>Breathe in slowly for 4 seconds</Text>
          </View>
          <View style={styles.instructStep}>
            <Text style={styles.instructNum}>2</Text>
            <Text style={styles.instructText}>Hold your breath for 4 seconds</Text>
          </View>
          <View style={styles.instructStep}>
            <Text style={styles.instructNum}>3</Text>
            <Text style={styles.instructText}>Exhale slowly for 4 seconds</Text>
          </View>
          <View style={styles.instructStep}>
            <Text style={styles.instructNum}>4</Text>
            <Text style={styles.instructText}>Hold empty for 4 seconds</Text>
          </View>
          <View style={styles.instructDivider} />
          <Text style={styles.instructNote}>Used by Navy SEALs and yogis alike to calm the nervous system.</Text>
        </View>
      )}

      <QuickNav navigation={navigation} currentScreen="Breathing" />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAF8F3' },
  screen: {
    paddingHorizontal: 28, paddingTop: Platform.OS === 'web' ? 48 : 60,
    paddingBottom: 40, width: '100%',
  },

  backBtn: { marginBottom: 20 },
  backText: { fontSize: 15, color: '#B8963E', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, letterSpacing: 0.3 },

  title: { fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4, textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 18, color: '#8A7A5A', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, fontStyle: 'italic', marginBottom: 36, textAlign: 'center', letterSpacing: 4 },

  circleContainer: { alignItems: 'center', marginBottom: 28 },
  circle: {
    width: 220, height: 220, borderRadius: 0,
    backgroundColor: '#FFF9EE', borderWidth: 2, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center',
  },
  circleCount: { fontSize: 48, fontWeight: '700', color: '#B8963E', fontFamily: serif },
  circleLabel: { fontSize: 13, color: '#8A7A5A', fontFamily: bodySerif, marginTop: 8, textTransform: 'uppercase' as any, letterSpacing: 2 },

  calmMsgContainer: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
  calmMsgText: { fontSize: 16, color: '#8A7A5A', fontStyle: 'italic', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, textAlign: 'center', lineHeight: 26 },

  sessionStats: { alignItems: 'center', marginBottom: 20 },
  sessionStatText: { fontSize: 13, color: '#BBAA88', fontFamily: bodySerif, letterSpacing: 1 },

  soundToggle: {
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20,
    borderWidth: 1, borderColor: '#EDE3CC', backgroundColor: '#FFFFFF', marginBottom: 14,
  },
  soundToggleText: {
    fontSize: 12, fontWeight: '600', color: '#8A7A5A', fontFamily: bodySerif,
    textTransform: 'uppercase' as any, letterSpacing: 0.8,
  },

  actionBtn: {
    backgroundColor: '#B8963E', borderRadius: 0, paddingVertical: 16,
    alignItems: 'center', marginBottom: 28,
  },
  actionBtnStop: { backgroundColor: '#8A7A5A' },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, letterSpacing: 0.5 },

  summaryCard: {
    backgroundColor: '#FFF9EE', borderRadius: 0, padding: 22, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#D4B96A', alignItems: 'center',
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 8 },
  summaryText: { fontSize: 15, color: '#5A5A5A', fontFamily: bodySerif, textAlign: 'center', lineHeight: 24 },

  instructions: {
    backgroundColor: '#FFFFFF', borderRadius: 0, padding: 24,
    borderWidth: 1, borderColor: '#EDE3CC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.08)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  instructTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 18 },
  instructStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  instructNum: { fontSize: 18, fontWeight: '700', color: '#D4B96A', fontFamily: serif, width: 28 },
  instructText: { fontSize: 15, color: '#3A3A3A', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, lineHeight: 24, flex: 1 },
  instructDivider: { width: 30, height: 1, backgroundColor: '#EDE3CC', marginVertical: 14 },
  instructNote: { fontSize: 13, color: '#8A7A5A', fontStyle: 'italic', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined },
});

export default BreathingScreen;
