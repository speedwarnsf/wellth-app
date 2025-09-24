// firebaseConfig.js
import firebase from 'firebase/app';
import 'firebase/firestore'; // Import Firestore service

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1xZGmRMEZ-i7f_wfMlJuI-LkADKoI4Jo",
  authDomain: "wellth-af20c.firebaseapp.com",
  projectId: "wellth-af20c",
  storageBucket: "wellth-af20c.firebasestorage.app",
  messagingSenderId: "171051029356",
  appId: "1:171051029356:web:6d3ecc068a587f3c635949",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };
