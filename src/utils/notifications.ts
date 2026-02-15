import { Platform } from 'react-native';
import { wealthTips, wellnessTips, getWealthTips, getWellnessTips } from '../data/tipData';

const NOTIF_PREF_KEY = 'wellth_notifications_enabled';
const NOTIF_SCHEDULED_KEY = 'wellth_notif_scheduled';

export const isNotificationsSupported = (): boolean => {
  return Platform.OS === 'web' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const getNotificationPermission = (): string => {
  if (!isNotificationsSupported()) return 'unsupported';
  return Notification.permission;
};

export const isNotificationsEnabled = (): boolean => {
  if (Platform.OS !== 'web') return false;
  return localStorage.getItem(NOTIF_PREF_KEY) === 'true';
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isNotificationsSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationsSupported()) return false;
  
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    localStorage.setItem(NOTIF_PREF_KEY, 'true');
    await registerServiceWorker();
    scheduleDailyTip();
    return true;
  }
  return false;
};

export const disableNotifications = () => {
  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_PREF_KEY, 'false');
    const timerId = localStorage.getItem(NOTIF_SCHEDULED_KEY);
    if (timerId) {
      clearTimeout(Number(timerId));
      localStorage.removeItem(NOTIF_SCHEDULED_KEY);
    }
  }
};

const getDailyTip = (): { title: string; body: string } => {
  const dayIndex = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
  const isWealth = dayIndex % 2 === 0;
  const tips = isWealth ? getWealthTips() : getWellnessTips();
  const tip = tips[dayIndex % tips.length];
  return {
    title: isWealth ? 'Wellth — Daily Wellth Tip' : 'Wellth — Daily Wellness Tip',
    body: tip.length > 140 ? tip.slice(0, 137) + '...' : tip,
  };
};

export const sendTestNotification = async () => {
  if (!isNotificationsSupported() || Notification.permission !== 'granted') return;
  
  const reg = await navigator.serviceWorker.ready;
  const { title, body } = getDailyTip();
  reg.showNotification(title, {
    body,
    icon: '/icons/tips.png',
    badge: '/icons/tips.png',
    tag: 'wellth-daily-tip',
  });
};

export const scheduleDailyTip = () => {
  if (!isNotificationsSupported() || !isNotificationsEnabled()) return;
  if (Notification.permission !== 'granted') return;

  // Schedule for 8:00 AM local time
  const now = new Date();
  const target = new Date(now);
  target.setHours(8, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const delay = target.getTime() - now.getTime();
  
  const timerId = setTimeout(async () => {
    await sendTestNotification();
    // Reschedule for tomorrow
    scheduleDailyTip();
  }, delay);

  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_SCHEDULED_KEY, String(timerId));
  }
};

// Initialize on load
export const initNotifications = async () => {
  if (!isNotificationsSupported()) return;
  
  await registerServiceWorker();
  
  if (isNotificationsEnabled() && Notification.permission === 'granted') {
    scheduleDailyTip();
  }
};
