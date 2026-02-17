import { Platform } from 'react-native';
import { supabase } from './supabase';

// Maps localStorage key prefixes to Supabase tables and column mappings
const TABLE_MAP: Record<string, { table: string; dateField: boolean; columns?: string[] }> = {
  'wellth_checkin_': { table: 'wellth_checkins', dateField: true },
  'wellth_journal_': { table: 'wellth_journal', dateField: true },
  'wellth_hydration_': { table: 'wellth_hydration', dateField: true },
  'wellth_breathing_': { table: 'wellth_breathing', dateField: true },
  'wellth_gratitude_': { table: 'wellth_gratitude', dateField: true },
  'wellth_sleep_': { table: 'wellth_sleep', dateField: true },
  'wellth_evening_': { table: 'wellth_evening_reflections', dateField: true },
  'wellth_pulse_': { table: 'wellth_pulse', dateField: true },
};

// Column mapping from localStorage JSON keys to Supabase columns
const COLUMN_MAP: Record<string, Record<string, string>> = {
  wellth_checkins: { mood: 'mood', water: 'water', sleep: 'sleep', exercise: 'exercise' },
  wellth_journal: { text: 'text', tags: 'tags', moodTag: 'mood_tag', wordCount: 'word_count' },
  wellth_hydration: { glasses: 'glasses', timestamps: 'timestamps' },
  wellth_breathing: { durationSeconds: 'duration_seconds', cycles: 'cycles', duration: 'duration_seconds' },
  wellth_gratitude: { items: 'items', freeform: 'freeform', prompt: 'prompt' },
  wellth_sleep: { hours: 'hours', quality: 'quality' },
  wellth_evening_reflections: { dayRating: 'day_rating', prompt: 'prompt', response: 'response', gratitude: 'gratitude' },
  wellth_pulse: { mood: 'mood', note: 'note' },
};

function mapToDbColumns(table: string, data: any): Record<string, any> {
  const mapping = COLUMN_MAP[table] || {};
  const result: Record<string, any> = {};
  for (const [jsKey, value] of Object.entries(data)) {
    const dbCol = mapping[jsKey] || jsKey;
    // Skip non-db fields
    if (['date', 'timestamp', 'moodTag', 'wordCount', 'dayRating', 'durationSeconds'].includes(jsKey)) {
      result[mapping[jsKey] || dbCol] = value;
    } else {
      result[dbCol] = value;
    }
  }
  return result;
}

// Sync a single localStorage entry to Supabase
async function syncEntry(key: string, userId: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;

  let matchedPrefix = '';
  let matchedConfig: { table: string; dateField: boolean } | null = null;

  for (const [prefix, config] of Object.entries(TABLE_MAP)) {
    if (key.startsWith(prefix)) {
      matchedPrefix = prefix;
      matchedConfig = config;
      break;
    }
  }

  if (!matchedConfig) return false;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const date = key.slice(matchedPrefix.length);
    const mapping = COLUMN_MAP[matchedConfig.table] || {};

    // Build the row
    const row: Record<string, any> = { user_id: userId };
    if (matchedConfig.dateField) row.date = date;

    for (const [jsKey, value] of Object.entries(data)) {
      if (jsKey === 'date' || jsKey === 'timestamp') continue;
      const dbCol = mapping[jsKey] || jsKey;
      row[dbCol] = value;
    }

    // Upsert (for tables with unique constraint on user_id + date)
    const { error } = await supabase
      .from(matchedConfig.table)
      .upsert(row, { onConflict: matchedConfig.dateField ? 'user_id,date' : 'user_id' });

    if (error) {
      console.warn(`Sync error for ${key}:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Sync parse error for ${key}:`, e);
    return false;
  }
}

// Sync settings
async function syncSettings(userId: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    const raw = localStorage.getItem('wellth_settings');
    if (!raw) return false;
    const settings = JSON.parse(raw);
    const { error } = await supabase
      .from('wellth_settings')
      .upsert({ user_id: userId, settings }, { onConflict: 'user_id' });
    if (error) {
      console.warn('Settings sync error:', error.message);
      return false;
    }
    return true;
  } catch { return false; }
}

// Sync favorites
async function syncFavorites(userId: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    const raw = localStorage.getItem('wellth_favorites');
    if (!raw) return false;
    const favs: string[] = JSON.parse(raw);
    for (const tipId of favs) {
      await supabase
        .from('wellth_favorites')
        .upsert({ user_id: userId, tip_id: tipId }, { onConflict: 'user_id,tip_id' });
    }
    return true;
  } catch { return false; }
}

// Full migration: push all localStorage data to Supabase
export async function migrateLocalToCloud(userId: string): Promise<{ synced: number; errors: number }> {
  if (Platform.OS !== 'web') return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Check if this key matches any wellth prefix
    let isWellthKey = false;
    for (const prefix of Object.keys(TABLE_MAP)) {
      if (key.startsWith(prefix)) {
        isWellthKey = true;
        break;
      }
    }

    if (isWellthKey) {
      const ok = await syncEntry(key, userId);
      if (ok) synced++;
      else errors++;
    }
  }

  // Sync settings and favorites separately
  await syncSettings(userId);
  await syncFavorites(userId);

  return { synced, errors };
}

// Pull cloud data to localStorage
export async function pullCloudToLocal(userId: string): Promise<number> {
  if (Platform.OS !== 'web') return 0;

  let pulled = 0;

  for (const [prefix, config] of Object.entries(TABLE_MAP)) {
    try {
      const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .eq('user_id', userId);

      if (error || !data) continue;

      const reverseMapping = COLUMN_MAP[config.table] || {};
      const reverseMap: Record<string, string> = {};
      for (const [jsKey, dbCol] of Object.entries(reverseMapping)) {
        reverseMap[dbCol] = jsKey;
      }

      for (const row of data) {
        const date = row.date || '';
        const key = `${prefix}${date}`;

        // Convert DB columns back to JS format
        const obj: Record<string, any> = {};
        for (const [col, val] of Object.entries(row)) {
          if (['id', 'user_id', 'created_at', 'date'].includes(col)) continue;
          const jsKey = reverseMap[col] || col;
          obj[jsKey] = val;
        }
        obj.date = date;
        obj.timestamp = new Date(row.created_at).getTime();

        localStorage.setItem(key, JSON.stringify(obj));
        pulled++;
      }
    } catch (e) {
      console.warn(`Pull error for ${config.table}:`, e);
    }
  }

  // Pull settings
  try {
    const { data } = await supabase
      .from('wellth_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    if (data?.settings) {
      localStorage.setItem('wellth_settings', JSON.stringify(data.settings));
      pulled++;
    }
  } catch {}

  // Pull favorites
  try {
    const { data } = await supabase
      .from('wellth_favorites')
      .select('tip_id')
      .eq('user_id', userId);
    if (data && data.length > 0) {
      const favs = data.map(d => d.tip_id).filter(Boolean);
      localStorage.setItem('wellth_favorites', JSON.stringify(favs));
      pulled++;
    }
  } catch {}

  return pulled;
}

// Background sync: call after any storage.setJSON to push to cloud
export async function syncKey(key: string, userId: string): Promise<void> {
  // Settings
  if (key === 'wellth_settings') {
    await syncSettings(userId);
    return;
  }
  if (key === 'wellth_favorites') {
    await syncFavorites(userId);
    return;
  }
  // Date-keyed entries
  await syncEntry(key, userId);
}
