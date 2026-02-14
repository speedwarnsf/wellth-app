import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import {
  isNotificationsSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from '../utils/notifications';

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
    title: 'Welcome to Wellth',
    body: 'Where wealth meets wellness. A daily companion for growing both your financial health and personal well-being.',
    video: '/videos/owl-emerging.mp4',
    accent: '#B8963E',
  },
  {
    title: 'Daily Wisdom',
    body: 'Each day brings a fresh Wellth tip and wellness tip — curated insights to help you make better decisions, one day at a time.',
    video: '/videos/owl-looking.mp4',
    accent: '#D4B96A',
  },
  {
    title: 'Track Your Journey',
    body: 'Check in daily, journal your thoughts, track hydration, and practice breathing exercises. Small habits compound into extraordinary change.',
    video: '/videos/owl-maturing.mp4',
    accent: '#B8963E',
  },
  {
    title: 'Stay Connected',
    body: 'Enable daily notifications and never miss your morning tip. Build your streak, earn milestones, and watch your wellth grow.',
    video: null,
    accent: '#D4B96A',
    isNotificationStep: true,
  },
];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { width, height } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const [step, setStep] = useState(0);
  const [notifStatus, setNotifStatus] = useState<string>('default');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Initial entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  // Progress bar animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [step]);

  useEffect(() => {
    if (isNotificationsSupported()) {
      setNotifStatus(getNotificationPermission());
    }
  }, []);

  const animateTransition = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
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

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifStatus(granted ? 'granted' : 'denied');
    // Auto-advance after a beat
    setTimeout(() => handleNext(), 800);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isNotifStep = !!(current as any).isNotificationStep;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { maxWidth, alignSelf: 'center' as const }]}>
      {/* Progress bar at top */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth as any }]} />
      </View>

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Video for steps that have one */}
        {Platform.OS === 'web' && current.video ? (
          <div style={{
            marginLeft: -36, marginRight: -36,
            overflow: 'hidden', marginBottom: 20,
            position: 'relative',
          } as any}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#FFFFFF', zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: '#FFFFFF', zIndex: 2 }} />
            <video
              key={step}
              ref={(el: HTMLVideoElement | null) => { if (el) el.play().catch(() => {}); }}
              src={current.video}
              autoPlay
              muted
              playsInline
              loop
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        ) as any : null}

        {/* Notification step icon */}
        {isNotifStep && Platform.OS === 'web' && (
          <div style={{
            width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px', backgroundColor: '#FFFFFF',
          }}>
            <img src="/icons/tips.png" width="64" height="64" alt="notifications" />
          </div>
        ) as any}

        {/* Step indicator */}
        <Text style={[styles.stepIndicator, { color: current.accent }]}>
          {step + 1} of {STEPS.length}
        </Text>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        {/* Notification CTA */}
        {isNotifStep && isNotificationsSupported() && notifStatus !== 'granted' && (
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={handleEnableNotifications}
            activeOpacity={0.8}
          >
            <Text style={styles.notifBtnText}>Enable Daily Tips</Text>
          </TouchableOpacity>
        )}

        {isNotifStep && notifStatus === 'granted' && (
          <Text style={styles.notifEnabled}>Notifications enabled — you are all set.</Text>
        )}
      </Animated.View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotComplete]} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextText}>
            {isLast ? 'Begin Your Journey' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {isLast && isNotifStep && notifStatus !== 'granted' && (
          <TouchableOpacity onPress={handleNext} style={styles.skipNotifBtn} activeOpacity={0.7}>
            <Text style={styles.skipNotifText}>Maybe later</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 36, paddingTop: 60, paddingBottom: 40, width: '100%',
  },
  progressBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: '#EDE3CC',
  },
  progressFill: {
    height: 3, backgroundColor: '#B8963E',
  },
  skipBtn: { position: 'absolute', top: Platform.OS === 'web' ? 48 : 60, right: 28 },
  skipText: { fontSize: 16, color: '#BBAA88', fontFamily: bodySerif },
  content: { alignItems: 'center', paddingBottom: 20 },
  stepIndicator: {
    fontSize: 13, fontWeight: '600', letterSpacing: 2,
    textTransform: 'uppercase' as any, marginBottom: 12, fontFamily: bodySerif,
  },
  title: {
    fontSize: 28, fontWeight: '700', color: '#B8963E', fontFamily: serif,
    textAlign: 'center', marginBottom: 12,
    ...(Platform.OS === 'web' ? { textWrap: 'balance' } as any : {}),
  },
  body: {
    fontSize: 15, lineHeight: 24, color: '#5A5A5A', fontFamily: bodySerif,
    textAlign: 'center', maxWidth: 320,
  },
  notifBtn: {
    backgroundColor: '#D4B96A', borderRadius: 0, paddingVertical: 14, paddingHorizontal: 36,
    marginTop: 24,
  },
  notifBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif },
  notifEnabled: {
    fontSize: 15, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic',
    marginTop: 20, textAlign: 'center',
  },
  bottomSection: { marginTop: 'auto' as any, alignItems: 'center', paddingTop: 20 },
  dots: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 0, backgroundColor: '#EDE3CC' },
  dotActive: { backgroundColor: '#B8963E', width: 28 },
  dotComplete: { backgroundColor: '#D4B96A' },
  nextBtn: {
    backgroundColor: '#B8963E', borderRadius: 0, paddingVertical: 16, paddingHorizontal: 48,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(184,150,62,0.3)' } as any
      : { shadowColor: '#B8963E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 }),
  },
  nextText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: bodySerif },
  skipNotifBtn: { marginTop: 16 },
  skipNotifText: { fontSize: 14, color: '#BBAA88', fontFamily: bodySerif, fontStyle: 'italic' },
});

export default OnboardingScreen;
