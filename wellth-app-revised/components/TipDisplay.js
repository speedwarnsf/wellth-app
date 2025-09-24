// components/TipDisplay.js
import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

const TipDisplay = ({ tipText, mascotImage }) => {
  return (
    <View style={styles.card}>
      {mascotImage && (
        <Image source={mascotImage} style={styles.mascot} resizeMode="contain" />
      )}
      <Text style={styles.tipText}>{tipText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    width: '90%',
    minHeight: 250, // Ensure a minimum height for consistent look
  },
  mascot: {
    width: 120,
    height: 120,
    borderRadius: 60, // Makes it circular
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#eee', // Subtle border for the mascot
  },
  tipText: {
    fontSize: 19,
    fontFamily: 'Georgia', // A more classic font for tips
    color: '#333',
    textAlign: 'center',
    lineHeight: 28, // Improve readability
  },
});

export default TipDisplay;