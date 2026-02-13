import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vqkoxfenyjomillmxawh.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tbmaJvWmkumAPUuI133fXw_JcHXJU4o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
