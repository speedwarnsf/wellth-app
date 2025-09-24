// App.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import TipDisplay from './components/TipDisplay';
import { firebase } from './firebaseConfig'; // Import the initialized firebase instance

// Replace with your actual image paths in a real app
const logo = require('./assets/wellth-logo.png'); // Assuming you save the logo as wellth-logo.png in an assets folder
const owlMascot = require('./assets/owl-mascot.png'); // Assuming you save the owl as owl-mascot.png in an assets folder

export default function App() {
  const [currentTip, setCurrentTip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to fetch a random tip from Firestore
  const fetchRandomTip = async () => {
    setLoading(true);
    setError(null);
    try {
      const db = firebase.firestore();
      const tipsCollection = await db.collection('tips').get();

      if (tipsCollection.empty) {
        throw new Error('No tips found in the "tips" collection.');
      }

      const tips = tipsCollection.docs.map(doc => doc.data());
      const randomIndex = Math.floor(Math.random() * tips.length);
      setCurrentTip(tips[randomIndex]);
    } catch (err) {
      console.error("Error fetching tip:", err);
      setError("Failed to load tip. Please check your internet or Firebase setup.");
      setCurrentTip({ text: "Oops! Couldn't load a tip right now. Please try again later." }); // Fallback message
    } finally {
      setLoading(false);
    }
  };

  // Fetch a tip when the app starts
  useEffect(() => {
    fetchRandomTip();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Your Daily Dose of Inspiration</Text>
        </View>

        {loading && <Text style={styles.loadingText}>Loading tip...</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {currentTip && (
          <TipDisplay
            tipText={currentTip.text}
            mascotImage={owlMascot}
          />
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={fetchRandomTip}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Fetching...' : 'GET NEW TIP'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#C5E0FB', // Light blue background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes content to top and button to bottom
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 180, // Adjust width as needed
    height: 60,  // Adjust height as needed
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Avenir', // Example font, use one available or link custom
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#4A90E2', // A pleasant blue
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 30,
    width: '80%', // Make button take up a good portion of the width
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Avenir-Heavy', // Example font
  },
});