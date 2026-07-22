import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// NOTE: A Firebase web config is meant to live in client code — the apiKey
// identifies the project, it is not a secret. Access is gated by Firebase
// Authentication's authorized domains and Security Rules, not by hiding this.
const firebaseConfig = {
  apiKey: "AIzaSyDjTsEa2UkfpiqLcXKbr3DMeTjsy_yca1A",
  authDomain: "spellcaster-bce5b.firebaseapp.com",
  projectId: "spellcaster-bce5b",
  storageBucket: "spellcaster-bce5b.firebasestorage.app",
  messagingSenderId: "713697594815",
  appId: "1:713697594815:web:492192d2bc4b8e0c6b650a",
  measurementId: "G-0KN7R957PK",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Always prompt for account choice so switching users is easy
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Analytics only works in supported browser contexts (needs cookies, a real
// window, etc). Never let it throw and take the app down with it.
isSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {
    /* analytics unavailable — ignore */
  });
