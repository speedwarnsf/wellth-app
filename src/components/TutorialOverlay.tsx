import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Animated, Easing, useWindowDimensions,
} from 'react-native';

const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;
const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;

const TUTORIAL_KEY = 'wellth_tutorial_done';

export const hasTutorialCompleted = (): boolean => {
  if (Platform.OS !== 'web') return true;
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
};

export const markTutorialDone = () => {
  if (Platform.OS === 'web') localStorage.setItem(TUTORIAL_KEY, 'true');
};

const STEPS = [
  {
    title: 'This is your daily check-in',
    body: 'Tap here each day to log your mood, sleep, and wellness. Consistency builds your streak.',
    icon: '/icons/checkin.png?v=6',
    accent: '#B8963E',
  },
  {
    title: 'Track your hydration',
    body: 'Log your water intake throughout the day. Staying hydrated is the foundation of wellness.',
    icon: '/icons/hydration.png?v=6',
    accent: '#4A90D9',
  },
  {
    title: 'Practice breathing',
    body: 'Use the breathing square for guided exercises. Just a few minutes can reset your entire day.',
    icon: '/icons/breathe.png?v=6',
    accent: '#8BC34A',
  },
  {
    title: 'Journal your thoughts',
    body: 'Write freely. Reflection is where growth happens. Your entries stay private, always.',
    icon: '/icons/journal.png?v=6',
    accent: '#D4B96A',
  },
];

const TutorialOverlay = ({ onComplete }: { onComplete: () => void }) => {
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const overlayFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.timing(overlayFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    animateIn();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 350,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [step]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    iconScale.setValue(0.5);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.spring(iconScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (step < STEPS.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setStep(s => s + 1);
        animateIn();
      });
    } else {
      finish();
    }
  };

  const finish = () => {
    markTutorialDone();
    Animated.timing(overlayFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      onComplete();
    });
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const maxWidth = Math.min(width - 48, 420);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (Platform.OS !== 'web') return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayFade }]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: current.accent }]} />
      </View>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip Tutorial</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], maxWidth }]}>  
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { borderColor: current.accent, transform: [{ scale: iconScale }] }]}>
          {(
            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={current.icon} width="48" height="48" alt="" style={{ opacity: 0.9 }} />
            </div>
          ) as any}
        </Animated.View>

        {/* Step count */}
        <Text style={[styles.stepCount, { color: current.accent }]}>
          {step + 1} of {STEPS.length}
        </Text>

        {/* Title */}
        <Text style={styles.title}>{current.title}</Text>

        {/* Body */}
        <Text style={styles.body}>{current.body}</Text>

        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[
              styles.dot,
              i === step && { backgroundColor: current.accent, width: 24 },
              i < step && { backgroundColor: current.accent, opacity: 0.4 },
            ]} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: current.accent }]}
          onPress={goNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { position: 'fixed' } as any : {}),
  },
  progressBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: 3,
  },
  skipBtn: {
    position: 'absolute', top: 48, right: 36, zIndex: 10,
  },
  skipText: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: bodySerif,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 80, height: 80,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#FFF9EE',
  },
  stepCount: {
    fontSize: 11, fontWeight: '600', letterSpacing: 2,
    textTransform: 'uppercase' as any, marginBottom: 12, fontFamily: bodySerif,
  },
  title: {
    fontSize: 24, fontWeight: '700', color: '#3A3A3A', fontFamily: serif,
    textAlign: 'center', marginBottom: 12,
  },
  body: {
    fontSize: 15, lineHeight: 24, color: '#5A5A5A', fontFamily: bodySerif,
    textAlign: 'center', maxWidth: 300, marginBottom: 28,
  },
  dots: {
    flexDirection: 'row', gap: 8, marginBottom: 28,
  },
  dot: {
    width: 8, height: 8, backgroundColor: '#EDE3CC',
  },
  nextBtn: {
    paddingVertical: 14, paddingHorizontal: 48,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(0,0,0,0.2)' } as any : {}),
  },
  nextText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif,
  },
});

export default TutorialOverlay;
