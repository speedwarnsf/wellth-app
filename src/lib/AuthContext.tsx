import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import {
  deriveKeyFromPassword,
  deriveKeyFromRecovery,
  generateDEK,
  generateSalt,
  wrapDEK,
  unwrapDEK,
  generateRecoveryPhrase,
} from './crypto';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  dek: CryptoKey | null;
  recoveryPhrase: string | null;
  clearRecoveryPhrase: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; recoveryPhrase?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  recoverWithPhrase: (phrase: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  isGuest: false,
  dek: null,
  recoveryPhrase: null,
  clearRecoveryPhrase: () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  continueAsGuest: () => {},
  recoverWithPhrase: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

const GUEST_KEY = 'wellth_guest_mode';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s && Platform.OS === 'web') {
        try {
          const guest = localStorage.getItem(GUEST_KEY);
          if (guest === 'true') setIsGuest(true);
        } catch {}
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s) {
        setIsGuest(false);
        if (Platform.OS === 'web') {
          try { localStorage.removeItem(GUEST_KEY); } catch {}
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Fetch and unwrap DEK ---
  const loadDEK = useCallback(async (userId: string, password: string): Promise<CryptoKey | null> => {
    try {
      const { data, error } = await supabase
        .from('wellth_encryption_keys')
        .select('wrapped_key, salt')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        // No encryption keys yet — user signed up before E2E was added
        // They'll get keys on next signUp or migration
        console.log('[E2E] No encryption keys found for user — unencrypted mode');
        return null;
      }

      const wrappingKey = await deriveKeyFromPassword(password, data.salt);
      return await unwrapDEK(data.wrapped_key, wrappingKey);
    } catch (e) {
      console.warn('[E2E] Failed to unwrap DEK:', e);
      return null;
    }
  }, []);

  // --- Sign In ---
  const signIn = useCallback(async (email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Try to load DEK
    if (authData.user) {
      const key = await loadDEK(authData.user.id, password);
      setDek(key);
    }

    return { error: null };
  }, [loadDEK]);

  // --- Sign Up (generates DEK + recovery phrase) ---
  const signUp = useCallback(async (email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!authData.user) return { error: 'Account created. Check email to confirm.' };

    try {
      // Generate encryption keys
      const newDek = await generateDEK();
      const salt = generateSalt();
      const phrase = generateRecoveryPhrase();

      // Wrap DEK with password and recovery phrase
      const passwordKey = await deriveKeyFromPassword(password, salt);
      const recoveryKey = await deriveKeyFromRecovery(phrase, salt);
      const wrappedByPassword = await wrapDEK(newDek, passwordKey);
      const wrappedByRecovery = await wrapDEK(newDek, recoveryKey);

      // Store wrapped keys in Supabase
      const { error: insertError } = await supabase
        .from('wellth_encryption_keys')
        .insert({
          user_id: authData.user.id,
          wrapped_key: wrappedByPassword,
          recovery_wrapped_key: wrappedByRecovery,
          salt,
        });

      if (insertError) {
        console.warn('[E2E] Failed to store encryption keys:', insertError.message);
        return { error: null }; // Auth succeeded, encryption setup failed silently
      }

      setDek(newDek);
      setRecoveryPhrase(phrase);
      return { error: null, recoveryPhrase: phrase };
    } catch (e) {
      console.warn('[E2E] Encryption setup failed:', e);
      return { error: null }; // Auth succeeded
    }
  }, []);

  // --- Sign Out ---
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDek(null);
    setRecoveryPhrase(null);
  }, []);

  // --- Recovery ---
  const recoverWithPhrase = useCallback(async (phrase: string, newPassword: string) => {
    try {
      // User must be authenticated (via Supabase password reset email flow)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return { error: 'Not authenticated. Please use the password reset email first.' };

      // Fetch recovery wrapped key
      const { data, error } = await supabase
        .from('wellth_encryption_keys')
        .select('recovery_wrapped_key, salt')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error || !data) return { error: 'No encryption keys found.' };

      // Unwrap DEK with recovery phrase
      const recoveryKey = await deriveKeyFromRecovery(phrase, data.salt);
      let recoveredDek: CryptoKey;
      try {
        recoveredDek = await unwrapDEK(data.recovery_wrapped_key, recoveryKey);
      } catch {
        return { error: 'Invalid recovery phrase.' };
      }

      // Re-wrap DEK with new password
      const passwordKey = await deriveKeyFromPassword(newPassword, data.salt);
      const newWrapped = await wrapDEK(recoveredDek, passwordKey);

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('wellth_encryption_keys')
        .update({ wrapped_key: newWrapped })
        .eq('user_id', currentUser.id);

      if (updateError) return { error: 'Failed to update encryption keys.' };

      // Update Supabase auth password
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) return { error: 'Keys updated but password change failed: ' + pwError.message };

      setDek(recoveredDek);
      return { error: null };
    } catch (e: any) {
      return { error: e?.message || 'Recovery failed.' };
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    if (Platform.OS === 'web') {
      try { localStorage.setItem(GUEST_KEY, 'true'); } catch {}
    }
  }, []);

  const clearRecoveryPhrase = useCallback(() => setRecoveryPhrase(null), []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, isGuest, dek, recoveryPhrase, clearRecoveryPhrase,
      signIn, signUp, signOut, continueAsGuest, recoverWithPhrase,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
