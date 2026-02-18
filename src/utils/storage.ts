import { Platform } from 'react-native';
import { syncKey, setActiveDEK } from '../lib/syncEngine';

// Active user ID for cloud sync (set by AuthContext)
let _activeUserId: string | null = null;

export const setActiveUserId = (id: string | null) => {
  _activeUserId = id;
};

export const setActiveDEKFromAuth = (dek: CryptoKey | null) => {
  setActiveDEK(dek);
};

export const getActiveUserId = () => _activeUserId;

// localStorage wrapper for web, with background Supabase sync
const storage = {
  get(key: string): string | null {
    if (Platform.OS !== 'web') return null;
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      // Background sync to cloud if authenticated
      if (_activeUserId) {
        syncKey(key, _activeUserId).catch(() => {});
      }
    }
  },
  getJSON<T>(key: string, fallback: T): T {
    const raw = storage.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  setJSON(key: string, value: any) {
    storage.set(key, JSON.stringify(value));
  },
};

export default storage;

// Date helpers
export const todayKey = () => new Date().toISOString().slice(0, 10);

export const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

// Check-in data
export interface CheckInData {
  mood: number; // 1-5
  water: number; // glasses
  sleep: number; // hours
  exercise: boolean;
}

const CHECKIN_PREFIX = 'wellth_checkin_';
const STREAK_KEY = 'wellth_streak';

export const saveCheckIn = (date: string, data: CheckInData) => {
  storage.setJSON(`${CHECKIN_PREFIX}${date}`, data);
  updateStreak();
};

export const getCheckIn = (date: string): CheckInData | null => {
  return storage.getJSON<CheckInData | null>(`${CHECKIN_PREFIX}${date}`, null);
};

export const getStreak = (): number => {
  return storage.getJSON<number>(STREAK_KEY, 0);
};

export const updateStreak = () => {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (getCheckIn(key)) {
      streak++;
    } else {
      break;
    }
  }
  storage.setJSON(STREAK_KEY, streak);
  return streak;
};

export const getStreakMilestone = (streak: number): string | null => {
  if (streak === 7) return 'One week streak -- well done.';
  if (streak === 14) return 'Two weeks strong. The habit is forming.';
  if (streak === 21) return 'Three weeks -- this is who you are now.';
  if (streak === 30) return '30 days of consistency. Remarkable.';
  if (streak === 60) return '60 days. Unstoppable.';
  if (streak === 90) return '90 days. You are legendary.';
  if (streak === 365) return 'One full year. Incredible dedication.';
  return null;
};
