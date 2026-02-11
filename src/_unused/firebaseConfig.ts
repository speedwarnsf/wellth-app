import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1XzGmRMEZ-irf_wfMIJt-LkADKoIAJo",
  authDomain: "wellth-af20c.firebaseapp.com",
  projectId: "wellth-af20c",
  storageBucket: "wellth-af20c.appspot.com",
  messagingSenderId: "171051029356",
  appId: "1:171051029356:web:6d3ecc068a587f36c635949"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
