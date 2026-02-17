import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqkoxfenyjomillmxawh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxa294ZmVueWpvbWlsbG14YXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NjEyMjgsImV4cCI6MjA1MzUzNzIyOH0.tbmaJvWmkumAPUuI133fXw_JcHXJU4o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'wellth-auth',
  },
});
