import { useCallback, useEffect, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../logic/firebase.js";

// Friendly copy for the auth failures a real user can actually hit
const AUTH_ERRORS = {
  "auth/popup-blocked":
    "Your browser blocked the sign-in window. Allow pop-ups and try again.",
  "auth/operation-not-allowed":
    "Google sign-in isn't switched on for this project yet.",
  "auth/unauthorized-domain": "This site isn't authorized for sign-in yet.",
  "auth/network-request-failed":
    "Network error — check your connection and try again.",
};

// Cancelling the popup is a normal action, not an error worth showing
const SILENT = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

function toProfile(u) {
  if (!u) return null;
  return {
    uid: u.uid,
    name: u.displayName || u.email || "Wizard",
    email: u.email,
    photo: u.photoURL,
  };
}

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Persist the session across reloads/tabs (this is the default, but be
    // explicit so a signed-in user stays signed in)
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        setUser(toProfile(u));
        setReady(true);
      },
      () => setReady(true)
    );
    return unsub;
  }, []);

  const signInGoogle = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const code = e?.code ?? "";
      if (!SILENT.has(code)) {
        setError(AUTH_ERRORS[code] ?? "Sign-in failed — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch {
      /* already signed out */
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { user, ready, busy, error, signInGoogle, logout, clearError };
}
