import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCevS9XHmrIR9rsC9nPr_BK9pGfAJiL5wo",
  authDomain: "dispcirclesapp.firebaseapp.com",
  projectId: "dispcirclesapp",
  storageBucket: "dispcirclesapp.firebasestorage.app",
  messagingSenderId: "593945469472",
  appId: "1:593945469472:web:55d63daaa9acac15ef5245",
  measurementId: "G-84DYDLFL3F",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
