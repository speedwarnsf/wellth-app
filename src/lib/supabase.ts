import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqkoxfenyjomillmxawh.supabase.co';
const supabaseAnonKey = 'sb_publishable_tbmaJvWmkumAPUuI133fXw_JcHXJU4o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'wellth-auth',
  },
});
