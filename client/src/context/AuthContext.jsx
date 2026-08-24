import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from '../lib/firebase';
import { loginUser } from '../api/complaints';

const AuthContext = createContext(null);

// ── Friendly Firebase error message mapper ────────────────────────────────────
// Maps Firebase error codes to human-readable messages.
// A value of `null` means the error should be silently ignored (user-initiated).
const FIREBASE_ERROR_MAP = {
  'auth/email-already-in-use':        'An account with this email already exists. Try signing in instead.',
  'auth/account-already-registered':  'This account is already registered. Please sign in instead.',
  'auth/account-not-registered':      'No account found with this Google email. Please register first.',
  'auth/invalid-email':               'Please enter a valid email address.',
  'auth/user-not-found':              'No account found with this email address.',
  'auth/wrong-password':              'Incorrect password. Please try again.',
  'auth/invalid-credential':          'Invalid email or password. Please check and try again.',
  'auth/weak-password':               'Password must be at least 8 characters long.',
  'auth/too-many-requests':           'Too many failed attempts. Your account is temporarily locked. Please try again later or reset your password.',
  'auth/network-request-failed':      'Network error. Please check your connection and try again.',
  'auth/popup-blocked':               null, // Handled internally — fallback to redirect
  'auth/popup-closed-by-user':        null, // User dismissed — silent
  'auth/cancelled-popup-request':     null, // Race condition cancel — silent
  'auth/user-disabled':               'This account has been disabled. Please contact support.',
  'auth/operation-not-allowed':       'This sign-in method is not currently enabled.',
  'auth/requires-recent-login':       'For security, please sign in again to continue.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
};

export function getFirebaseErrorMessage(err) {
  if (!err?.code) return err?.message || 'Authentication failed. Please try again.';
  const mapped = FIREBASE_ERROR_MAP[err.code];
  if (mapped === null) return null; // Intentionally silent
  return mapped ?? 'Authentication failed. Please try again.';
}

// ── AuthProvider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stores the display name captured during signUpWithEmail so the
  // onAuthStateChanged listener can use it before the Firebase profile syncs.
  const pendingNameRef = useRef(null);

  // Prevents concurrent or duplicate backend profile fetches.
  const fetchingRef = useRef(false);

  // ── Fetch backend profile for an authenticated Firebase user ─────────────
  const fetchProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      fetchingRef.current = false;
      return;
    }

    if (fetchingRef.current) return; // Already in-flight
    fetchingRef.current = true;

    setUser(firebaseUser);

    // Prefer a pending name (from signUpWithEmail) over the Firebase display name.
    const name      = pendingNameRef.current || firebaseUser.displayName || null;
    const avatarUrl = firebaseUser.photoURL || null;

    try {
      // Force-refresh the token so the backend always receives a non-expired JWT.
      await firebaseUser.getIdToken(/* forceRefresh= */ true);
      const data = await loginUser({ name, avatar_url: avatarUrl });
      setProfile({
        ...data,
        name:       data?.name      || name      || null,
        avatar_url: data?.avatar_url || avatarUrl || null,
      });
    } catch (err) {
      // Backend is unreachable — use a minimal in-memory profile.
      // The app still works; the role defaults to 'citizen'.
      console.warn('[Auth] Backend profile fetch failed, using fallback:', err.message);
      setProfile({
        email:      firebaseUser.email,
        name:       name      || null,
        avatar_url: avatarUrl || null,
        role:       'citizen',
        department: null,
      });
    } finally {
      pendingNameRef.current = null;
      fetchingRef.current    = false;
    }
  }, []);

  // ── Single source of truth: onAuthStateChanged ───────────────────────────
  useEffect(() => {
    // On page load, check if we're returning from a redirect-based OAuth flow.
    // This covers mobile browsers that block popups.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) await fetchProfile(result.user);
      })
      .catch((err) => {
        const silent = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!silent.includes(err.code)) console.warn('[Auth] Redirect result error:', err);
      });

    // onAuthStateChanged is the authoritative trigger for all profile fetching.
    // Sign-in / sign-up methods intentionally do NOT call fetchProfile directly.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        await fetchProfile(firebaseUser);
      } catch (err) {
        console.warn('[Auth] onAuthStateChanged error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  // ── Google OAuth (Popup) ──────────────────────────────────────────────────
  const signInWithGoogle = async (rememberMe = true, expectedMode = null) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        return signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }

    if (result && expectedMode === 'signup') {
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser ?? false;

      // Disallow registration for already-registered OAuth accounts
      if (!isNewUser) {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
        const err = new Error('This account is already registered. Please sign in instead.');
        err.code = 'auth/account-already-registered';
        throw err;
      }
    }

    return result;
  };

  // ── Email sign-in ─────────────────────────────────────────────────────────
  const signInWithEmail = async (email, password, rememberMe = true) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    // onAuthStateChanged fires after this resolves and handles profile fetching.
    return signInWithEmailAndPassword(auth, email, password);
  };

  // ── Email sign-up ─────────────────────────────────────────────────────────
  const signUpWithEmail = async (email, password, name) => {
    // New accounts always use local persistence (stay logged in)
    await setPersistence(auth, browserLocalPersistence);

    const result = await createUserWithEmailAndPassword(auth, email, password);

    if (name && result?.user) {
      // Store the name so fetchProfile (triggered by onAuthStateChanged) can use it.
      pendingNameRef.current = name;
      try {
        await updateProfile(result.user, { displayName: name });
      } catch (err) {
        console.warn('[Auth] Failed to set displayName:', err.message);
      }
    }

    // onAuthStateChanged fires automatically after account creation.
    return result;
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    pendingNameRef.current = null;
    fetchingRef.current    = false;
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
