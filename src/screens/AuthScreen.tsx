import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Platform,
  useWindowDimensions, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { migrateLocalToCloud, pullCloudToLocal } from '../lib/syncEngine';
import RecoveryPhraseModal from '../components/RecoveryPhraseModal';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const AuthScreen = () => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 440);
  const { signIn, signUp, continueAsGuest, recoveryPhrase, clearRecoveryPhrase } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const hasLocalData = () => {
    if (Platform.OS !== 'web') return false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wellth_checkin_') || k.startsWith('wellth_journal_') || k.startsWith('wellth_hydration_'))) {
          return true;
        }
      }
    } catch {}
    return false;
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'login') {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError(err);
        setLoading(false);
      } else {
        // After login, pull cloud data and optionally migrate local
        setSuccess('Signed in. Syncing data...');
        // Auth state change will handle the rest
      }
    } else {
      const result = await signUp(email.trim(), password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        // Recovery phrase will be shown via modal if encryption was set up
        setSuccess('Account created. Check your email to confirm, then sign in.');
        setMode('login');
        setLoading(false);
      }
    }
  };

  return (
    <>
    {recoveryPhrase && (
      <RecoveryPhraseModal
        phrase={recoveryPhrase}
        onConfirm={clearRecoveryPhrase}
      />
    )}
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFF9EE' }}
      contentContainerStyle={{ alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth, alignItems: 'center' }}>
        {/* Title */}
        <Text style={{
          fontFamily: serif,
          fontSize: 36,
          color: '#1A1A1A',
          letterSpacing: 2,
          marginBottom: 8,
          textAlign: 'center',
          ...(Platform.OS === 'web' ? { textWrap: 'balance' } as any : {}),
        }}>
          WELLTH
        </Text>
        <View style={{ width: 40, height: 1, backgroundColor: '#B8963E', marginBottom: 32 }} />

        <Text style={{
          fontFamily: bodySerif,
          fontSize: 16,
          color: '#6B6B6B',
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 40,
          ...(Platform.OS === 'web' ? { textWrap: 'balance' } as any : {}),
        }}>
          {mode === 'login'
            ? 'Sign in to sync your wellness data across devices.'
            : 'Create an account to save your progress.'}
        </Text>

        {/* Form */}
        <View style={{ width: '100%', marginBottom: 24 }}>
          <Text style={{
            fontFamily: bodySerif,
            fontSize: 13,
            color: '#999',
            letterSpacing: 1,
            marginBottom: 8,
            textTransform: 'uppercase',
          }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor="#CCC"
            style={{
              fontFamily: bodySerif,
              fontSize: 16,
              color: '#1A1A1A',
              borderWidth: 1,
              borderColor: '#D4B96A',
              borderRadius: 0,
              padding: 14,
              marginBottom: 16,
              backgroundColor: '#FFFFFF',
            }}
          />

          <Text style={{
            fontFamily: bodySerif,
            fontSize: 13,
            color: '#999',
            letterSpacing: 1,
            marginBottom: 8,
            textTransform: 'uppercase',
          }}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="At least 6 characters"
            placeholderTextColor="#CCC"
            style={{
              fontFamily: bodySerif,
              fontSize: 16,
              color: '#1A1A1A',
              borderWidth: 1,
              borderColor: '#D4B96A',
              borderRadius: 0,
              padding: 14,
              marginBottom: 8,
              backgroundColor: '#FFFFFF',
            }}
          />
        </View>

        {/* Error / Success */}
        {error ? (
          <Text style={{
            fontFamily: bodySerif,
            fontSize: 14,
            color: '#C0392B',
            textAlign: 'center',
            marginBottom: 16,
          }}>{error}</Text>
        ) : null}
        {success ? (
          <Text style={{
            fontFamily: bodySerif,
            fontSize: 14,
            color: '#27AE60',
            textAlign: 'center',
            marginBottom: 16,
          }}>{success}</Text>
        ) : null}

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#B8963E',
            paddingVertical: 16,
            alignItems: 'center',
            borderRadius: 0,
            marginBottom: 12,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF9EE" />
          ) : (
            <Text style={{
              fontFamily: serif,
              fontSize: 16,
              color: '#FFF9EE',
              letterSpacing: 1,
            }}>
              {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle mode */}
        <TouchableOpacity
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setSuccess('');
          }}
          style={{ marginBottom: 32, paddingVertical: 8 }}
        >
          <Text style={{
            fontFamily: bodySerif,
            fontSize: 14,
            color: '#B8963E',
            textAlign: 'center',
          }}>
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E0D5C0' }} />
          <Text style={{
            fontFamily: bodySerif,
            fontSize: 12,
            color: '#999',
            paddingHorizontal: 16,
            letterSpacing: 1,
          }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E0D5C0' }} />
        </View>

        {/* Guest mode */}
        <TouchableOpacity
          onPress={continueAsGuest}
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: '#D4B96A',
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 0,
          }}
        >
          <Text style={{
            fontFamily: serif,
            fontSize: 15,
            color: '#B8963E',
            letterSpacing: 1,
          }}>CONTINUE AS GUEST</Text>
        </TouchableOpacity>

        <Text style={{
          fontFamily: bodySerif,
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
          marginTop: 12,
          lineHeight: 18,
          ...(Platform.OS === 'web' ? { textWrap: 'balance' } as any : {}),
        }}>
          Guest data is stored locally and will not sync across devices.
        </Text>
      </View>
    </ScrollView>
    </>
  );
};

export default AuthScreen;
