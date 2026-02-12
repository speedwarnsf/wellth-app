import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  useWindowDimensions, Image, Animated, Easing,
} from 'react-native';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const ONBOARDING_KEY = 'wellth_onboarded';

export const hasOnboarded = (): boolean => {
  if (Platform.OS !== 'web') return true;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
};

export const markOnboarded = () => {
  if (Platform.OS === 'web') localStorage.setItem(ONBOARDING_KEY, 'true');
};

const STEPS = [
  {
    emoji: '🦉',
    title: 'Welcome to Wellth',
    body: 'Where wealth meets wellness. A daily companion for growing both your financial health and personal well-being.',
  },
  {
    emoji: '💡',
    title: 'Daily Wisdom',
    body: 'Each day brings a fresh wealth tip and wellness tip — curated insights to help you make better decisions, one day at a time.',
  },
  {
    emoji: '📝',
    title: 'Track Your Journey',
    body: 'Check in daily, journal your thoughts, track hydration, and practice breathing exercises. Small habits compound into extraordinary change.',
  },
  {
    emoji: '🔥',
    title: 'Build Your Streak',
    body: 'Consistency is everything. Check in each day to build your streak, earn milestones, and watch your wellth grow.',
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      animateTransition(step + 1);
    } else {
      markOnboarded();
      onComplete();
    }
  };

  const handleSkip = () => {
    markOnboarded();
    onComplete();
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <View style={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
        <Text style={styles.nextText}>{isLast ? 'Begin Your Journey' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FAF8F3', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 36, width: '100%',
  },
  skipBtn: { position: 'absolute', top: Platform.OS === 'web' ? 48 : 60, right: 28 },
  skipText: { fontSize: 16, color: '#BBAA88', fontFamily: bodySerif },
  content: { alignItems: 'center', paddingBottom: 40 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#B8963E', fontFamily: serif, textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 17, lineHeight: 28, color: '#5A5A5A', fontFamily: bodySerif, textAlign: 'center', maxWidth: 360 },
  dots: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EDE3CC' },
  dotActive: { backgroundColor: '#B8963E', width: 28 },
  nextBtn: {
    backgroundColor: '#B8963E', borderRadius: 28, paddingVertical: 16, paddingHorizontal: 48,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(184,150,62,0.3)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 }),
  },
  nextText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif },
});

export default OnboardingScreen;
