import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const PHASES = [
  { label: 'Breathe In', duration: 4000, emoji: '🌬️' },
  { label: 'Hold', duration: 4000, emoji: '✨' },
  { label: 'Breathe Out', duration: 4000, emoji: '🍃' },
  { label: 'Hold', duration: 4000, emoji: '🦉' },
];

const OWL_MESSAGES = [
  "Let the calm wash over you...",
  "You're doing beautifully.",
  "Feel each breath nourish your body.",
  "The owl breathes with you.",
  "Stillness is your superpower.",
  "Peace flows through you.",
  "Every breath is a fresh start.",
  "You are exactly where you need to be.",
];

// Inject CSS for breathing animation
const injectBreathingCSS = () => {
  if (Platform.OS !== 'web') return;
  if (document.getElementById('wellth-breathing-css')) return;
  const style = document.createElement('style');
  style.id = 'wellth-breathing-css';
  style.textContent = `
    @keyframes breatheIn {
      from { transform: scale(1); }
      to { transform: scale(1.4); }
    }
    @keyframes breatheOut {
      from { transform: scale(1.4); }
      to { transform: scale(1); }
    }
    @keyframes holdBreath {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
    @keyframes gentlePulse {
      0%, 100% { box-shadow: 0 0 30px rgba(184,150,62,0.2); }
      50% { box-shadow: 0 0 60px rgba(184,150,62,0.4); }
    }
    .breathing-circle {
      transition: transform 4s ease-in-out;
      animation: gentlePulse 4s ease-in-out infinite;
    }
    .breathing-circle.inhale { transform: scale(1.4); }
    .breathing-circle.hold { transform: scale(1.4); }
    .breathing-circle.exhale { transform: scale(1); }
    .breathing-circle.pause { transform: scale(1); }
    .breathing-owl {
      transition: transform 4s ease-in-out, opacity 0.5s ease;
    }
    .breathing-owl.inhale { transform: scale(1.1) translateY(-5px); }
    .breathing-owl.exhale { transform: scale(1) translateY(0); }
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
  const [owlMsg, setOwlMsg] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { injectBreathingCSS(); }, []);

  useEffect(() => {
    if (!isActive) return;

    const phase = PHASES[phaseIndex];
    setCountdown(phase.duration / 1000);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return phase.duration / 1000;
        return prev - 1;
      });
    }, 1000);

    // Phase transition
    const phaseTimeout = setTimeout(() => {
      const nextPhase = (phaseIndex + 1) % PHASES.length;
      setPhaseIndex(nextPhase);
      if (nextPhase === 0) {
        setCycleCount(c => c + 1);
        setOwlMsg(m => (m + 1) % OWL_MESSAGES.length);
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
  };

  const stop = () => {
    setIsActive(false);
    setPhaseIndex(0);
    setCountdown(4);
  };

  const phase = PHASES[phaseIndex];
  const phaseClass = phaseIndex === 0 ? 'inhale' : phaseIndex === 1 ? 'hold' : phaseIndex === 2 ? 'exhale' : 'pause';

  return (
    <View style={[styles.screen, { maxWidth, alignSelf: 'center' as any }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Box Breathing</Text>
      <Text style={styles.subtitle}>4-4-4-4 guided by your owl 🦉</Text>

      {/* Breathing Circle */}
      <View style={styles.circleContainer}>
        {Platform.OS === 'web' ? (
          <div
            className={`breathing-circle ${isActive ? phaseClass : ''}`}
            style={{
              width: 200, height: 200, borderRadius: '50%',
              backgroundColor: '#FFF9EE', border: '3px solid #D4B96A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: 40 }}>{isActive ? phase.emoji : '🦉'}</span>
            <span style={{
              fontSize: 36, fontWeight: '700', color: '#B8963E',
              fontFamily: '"Playfair Display", Georgia, serif',
              marginTop: 4,
            }}>
              {isActive ? countdown : '4'}
            </span>
          </div>
        ) : (
          <View style={styles.circle}>
            <Text style={{ fontSize: 40 }}>{isActive ? phase.emoji : '🦉'}</Text>
            <Text style={styles.circleCount}>{isActive ? countdown : '4'}</Text>
          </View>
        )}
      </View>

      {/* Phase label */}
      <Text style={styles.phaseLabel}>
        {isActive ? phase.label : 'Ready when you are'}
      </Text>

      {/* Owl message */}
      {isActive && (
        <View style={styles.owlMsgContainer}>
          <Text style={{ fontSize: 48, textAlign: 'center' as const, marginBottom: 4 }}
            {...(Platform.OS === 'web' ? { className: `breathing-owl ${phaseClass}` } as any : {})}
          >🦉</Text>
          <Text style={styles.owlMsgText}>{OWL_MESSAGES[owlMsg]}</Text>
        </View>
      )}

      {/* Cycle count */}
      {cycleCount > 0 && (
        <Text style={styles.cycleText}>{cycleCount} cycle{cycleCount !== 1 ? 's' : ''} completed</Text>
      )}

      {/* Start/Stop */}
      <TouchableOpacity
        onPress={isActive ? stop : start}
        style={[styles.actionBtn, isActive && styles.actionBtnStop]}
        activeOpacity={0.7}
      >
        <Text style={styles.actionBtnText}>{isActive ? 'Stop' : 'Begin Breathing'}</Text>
      </TouchableOpacity>

      {/* Instructions */}
      {!isActive && (
        <View style={styles.instructions}>
          <Text style={styles.instructTitle}>How Box Breathing Works</Text>
          <Text style={styles.instructText}>🌬️ Breathe in slowly for 4 seconds</Text>
          <Text style={styles.instructText}>✨ Hold your breath for 4 seconds</Text>
          <Text style={styles.instructText}>🍃 Exhale slowly for 4 seconds</Text>
          <Text style={styles.instructText}>🦉 Hold empty for 4 seconds</Text>
          <Text style={styles.instructNote}>Used by Navy SEALs and yogis alike to calm the nervous system.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: '#FAF8F3',
    paddingHorizontal: 28, paddingTop: Platform.OS === 'web' ? 48 : 60,
    width: '100%',
  },

  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#B8963E', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined },

  title: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8A7A5A', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, fontStyle: 'italic', marginBottom: 32, textAlign: 'center' },

  circleContainer: { alignItems: 'center', marginBottom: 24 },
  circle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#FFF9EE', borderWidth: 3, borderColor: '#D4B96A',
    alignItems: 'center', justifyContent: 'center',
  },
  circleCount: { fontSize: 36, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginTop: 4 },

  phaseLabel: { fontSize: 22, fontWeight: '600', color: '#3A3A3A', textAlign: 'center', fontFamily: serif, marginBottom: 20 },

  owlMsgContainer: { alignItems: 'center', marginBottom: 20 },
  owlSmall: { width: 80, height: 80, marginBottom: 8 },
  owlMsgText: { fontSize: 15, color: '#8A7A5A', fontStyle: 'italic', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, textAlign: 'center' },

  cycleText: { fontSize: 14, color: '#B8963E', textAlign: 'center', marginBottom: 16, fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined },

  actionBtn: {
    backgroundColor: '#B8963E', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 24,
  },
  actionBtnStop: { backgroundColor: '#8A7A5A' },
  actionBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined },

  instructions: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(184,150,62,0.10)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 }),
  },
  instructTitle: { fontSize: 18, fontWeight: '700', color: '#B8963E', fontFamily: serif, marginBottom: 12 },
  instructText: { fontSize: 15, color: '#3A3A3A', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, marginBottom: 8, lineHeight: 24 },
  instructNote: { fontSize: 13, color: '#8A7A5A', fontStyle: 'italic', fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, marginTop: 8 },
});

export default BreathingScreen;
