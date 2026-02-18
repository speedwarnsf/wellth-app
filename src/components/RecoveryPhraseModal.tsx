import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';

interface Props {
  phrase: string;
  onConfirm: () => void;
}

const RecoveryPhraseModal: React.FC<Props> = ({ phrase, onConfirm }) => {
  const [confirmed, setConfirmed] = useState(false);
  const words = phrase.split(' ');

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Your Recovery Phrase</Text>
          <Text style={styles.subtitle}>
            Write these 12 words down and store them somewhere safe.
            This is the ONLY way to recover your encrypted data if you
            forget your password. We cannot recover it for you.
          </Text>

          <View style={styles.wordGrid}>
            {words.map((word, i) => (
              <View key={i} style={styles.wordCell}>
                <Text style={styles.wordNumber}>{i + 1}</Text>
                <Text style={styles.word}>{word}</Text>
              </View>
            ))}
          </View>

          <View style={styles.warning}>
            <Text style={styles.warningTitle}>IMPORTANT</Text>
            <Text style={styles.warningText}>
              This phrase will NOT be shown again. If you lose it and forget
              your password, your encrypted journal entries, mood data, and
              personal information cannot be recovered — by anyone.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setConfirmed(!confirmed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkBox, confirmed && styles.checkBoxChecked]}>
              {confirmed && <Text style={styles.checkMark}>{'✓'}</Text>}
            </View>
            <Text style={styles.checkLabel}>
              I have written down my recovery phrase and stored it safely
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !confirmed && styles.buttonDisabled]}
            onPress={confirmed ? onConfirm : undefined}
            activeOpacity={confirmed ? 0.7 : 1}
          >
            <Text style={[styles.buttonText, !confirmed && styles.buttonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(30, 28, 24, 0.95)',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#2A2824',
    padding: 32,
    maxWidth: 480,
    width: '100%',
    borderWidth: 1,
    borderColor: '#B8963E',
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: 24,
    color: '#B8963E',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#C8C0B0',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  wordCell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1C18',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#3A3630',
    minWidth: 130,
  },
  wordNumber: {
    fontSize: 11,
    color: '#6A6254',
    width: 20,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  word: {
    fontSize: 15,
    color: '#F0E8D8',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontWeight: '600',
  },
  warning: {
    backgroundColor: '#1E1C18',
    borderLeftWidth: 3,
    borderLeftColor: '#B8963E',
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8963E',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#C8C0B0',
    lineHeight: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#6A6254',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxChecked: {
    borderColor: '#B8963E',
    backgroundColor: '#B8963E',
  },
  checkMark: {
    color: '#1E1C18',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: '#C8C0B0',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#B8963E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#3A3630',
  },
  buttonText: {
    color: '#1E1C18',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  buttonTextDisabled: {
    color: '#6A6254',
  },
});

export default RecoveryPhraseModal;
