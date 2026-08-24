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

// ── Mobile Device Detector ──────────────────────────────────────────────────
export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(ua);
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth <= 800;
  return isMobileUA || (isTouchDevice && isSmallScreen);
}

// ── Firebase error mapper ───────────────────────────────────────────────────
const FIREBASE_ERROR_MAP = {
  'auth/email-already-in-use':        'An account with this email already exists. Try signing in instead.',
  'auth/account-already-registered':  'This account is already registered. Please sign in instead.',
  'auth/account-not-registered':      'No account found with this Google email. Please register first.',
  'auth/invalid-email':               'Please enter a valid email address.',
  'auth/user-not-found':              'No account found with this email address.',
  'auth/wrong-password':              'Incorrect password. Please try again.',
  'auth/invalid-credential':          'Invalid email or password. Please check and try again.',
  'auth/weak-password':               'Password must be at least 8 characters long.',
  'auth/too-many-requests':           'Too many failed attempts. Please try again later or reset your password.',
  'auth/network-request-failed':      'Network error. Please check your connection and try again.',
  'auth/popup-blocked':               null,
  'auth/popup-closed-by-user':        null,
  'auth/cancelled-popup-request':     null,
  'auth/user-disabled':               'This account has been disabled. Please contact support.',
  'auth/operation-not-allowed':       'This sign-in method is not currently enabled.',
  'auth/requires-recent-login':       'For security, please sign in again to continue.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
};

export function getFirebaseErrorMessage(err) {
  if (!err?.code) return err?.message || 'Authentication failed. Please try again.';
  const mapped = FIREBASE_ERROR_MAP[err.code];
  if (mapped === null) return null;
  return mapped ?? 'Authentication failed. Please try again.';
}

// ── AuthProvider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [redirectError, setRedirectError] = useState(null);

  // Name captured during signUpWithEmail before onAuthStateChanged fires
  const pendingNameRef = useRef(null);
  // Guard: prevents two concurrent fetchProfile calls
  const fetchingRef = useRef(false);
  // Flag: redirect result already resolved user — onAuthStateChanged should skip re-fetch
  const redirectHandledRef = useRef(false);

  // ── Safe persistence ──────────────────────────────────────────────────────
  const safeSetPersistence = useCallback(async (rememberMe = true) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    } catch (err) {
      console.warn('[Auth] setPersistence unsupported:', err.message);
    }
  }, []);

  // ── fetchProfile ──────────────────────────────────────────────────────────
  // Fetches (or creates) backend profile for a Firebase user. Never throws.
  const fetchProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      fetchingRef.current = false;
      return null;
    }

    // If already in-flight, wait for completion rather than duplicating work
    if (fetchingRef.current) {
      return new Promise((resolve) => {
        const poll = setInterval(() => {
          if (!fetchingRef.current) { clearInterval(poll); resolve(null); }
        }, 50);
      });
    }
    fetchingRef.current = true;
    setUser(firebaseUser);

    const name      = pendingNameRef.current || firebaseUser.displayName || null;
    const avatarUrl = firebaseUser.photoURL || null;

    try {
      await firebaseUser.getIdToken(true);
      const data = await loginUser({ name, avatar_url: avatarUrl });
      const resolved = {
        ...data,
        name:       data?.name       || name      || null,
        avatar_url: data?.avatar_url || avatarUrl || null,
      };
      setProfile(resolved);
      return resolved;
    } catch (err) {
      console.warn('[Auth] Profile fetch failed, using fallback:', err.message);
      const fallback = {
        email:      firebaseUser.email,
        name:       name      || null,
        avatar_url: avatarUrl || null,
        role:       'citizen',
        department: null,
      };
      setProfile(fallback);
      return fallback;
    } finally {
      pendingNameRef.current = null;
      fetchingRef.current    = false;
    }
  }, []);

  // ── Auth initialisation ───────────────────────────────────────────────────
  // Order of operations:
  //   1. getRedirectResult — catches returning OAuth redirect (mobile / popup fallback)
  //   2. onAuthStateChanged — handles all other session changes
  //
  // KEY: if redirect result handles the user first, onAuthStateChanged is told to
  // skip re-fetching via redirectHandledRef to avoid the race condition where
  // profile ends up null because fetchingRef was locked by the redirect fetch.
  useEffect(() => {
    let isMounted = true;
    let unsubAuth = null;

    async function init() {
      // ── 1. Redirect result ──────────────────────────────────────────────
      try {
        const redirectResult = await getRedirectResult(auth);

        if (redirectResult?.user && isMounted) {
          let savedMode = 'login';
          try {
            savedMode = sessionStorage.getItem('civisync_auth_redirect_mode') || 'login';
            sessionStorage.removeItem('civisync_auth_redirect_mode');
          } catch (_) {}

          // Enforce signup-only restriction for new users
          if (savedMode === 'signup') {
            const info = getAdditionalUserInfo(redirectResult);
            if (!(info?.isNewUser ?? false)) {
              await firebaseSignOut(auth);
              if (isMounted) {
                setUser(null);
                setProfile(null);
                const e = new Error('This account is already registered. Please sign in instead.');
                e.code = 'auth/account-already-registered';
                setRedirectError(e);
                setLoading(false);
              }
              unsubAuth = onAuthStateChanged(auth, () => { if (isMounted) setLoading(false); });
              return;
            }
          }

          // Profile fetched by redirect result — mark so onAuthStateChanged skips
          redirectHandledRef.current = true;
          await fetchProfile(redirectResult.user);
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        const silent = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!silent.includes(err?.code)) {
          console.warn('[Auth] getRedirectResult error:', err?.code, err?.message);
        }
      }

      // ── 2. Ongoing session observer ─────────────────────────────────────
      unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        try {
          if (firebaseUser) {
            if (redirectHandledRef.current) {
              // Redirect path already set user + profile; just clear the flag & loading
              redirectHandledRef.current = false;
              if (isMounted) setLoading(false);
              return;
            }
            await fetchProfile(firebaseUser);
          } else {
            redirectHandledRef.current = false;
            setUser(null);
            setProfile(null);
          }
        } catch (err) {
          console.warn('[Auth] onAuthStateChanged error:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      });
    }

    init();
    return () => { isMounted = false; if (unsubAuth) unsubAuth(); };
  }, [fetchProfile]);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const signInWithGoogle = async (rememberMe = true, expectedMode = null) => {
    await safeSetPersistence(rememberMe);
    try { sessionStorage.setItem('civisync_auth_redirect_mode', expectedMode || 'login'); } catch (_) {}

    // Mobile always uses redirect — popups are blocked/killed by mobile browsers
    if (isMobileDevice()) {
      return signInWithRedirect(auth, googleProvider);
    }

    // Desktop: popup with automatic redirect fallback
    try {
      const result = await signInWithPopup(auth, googleProvider);

      if (result && expectedMode === 'signup') {
        const info = getAdditionalUserInfo(result);
        if (!(info?.isNewUser ?? false)) {
          await firebaseSignOut(auth);
          setUser(null);
          setProfile(null);
          const e = new Error('This account is already registered. Please sign in instead.');
          e.code = 'auth/account-already-registered';
          throw e;
        }
      }

      try { sessionStorage.removeItem('civisync_auth_redirect_mode'); } catch (_) {}
      return result;
    } catch (err) {
      const fallbackCodes = [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/internal-error',
      ];
      if (fallbackCodes.includes(err.code) || err.message?.toLowerCase().includes('popup')) {
        console.info('[Auth] Popup blocked, falling back to redirect:', err.code);
        return signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }
  };

  // ── Email sign-in ─────────────────────────────────────────────────────────
  const signInWithEmail = async (email, password, rememberMe = true) => {
    await safeSetPersistence(rememberMe);
    return signInWithEmailAndPassword(auth, email, password);
  };

  // ── Email sign-up ─────────────────────────────────────────────────────────
  const signUpWithEmail = async (email, password, name) => {
    await safeSetPersistence(true);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name && result?.user) {
      pendingNameRef.current = name;
      try { await updateProfile(result.user, { displayName: name }); }
      catch (err) { console.warn('[Auth] updateProfile failed:', err.message); }
    }
    return result;
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    pendingNameRef.current     = null;
    fetchingRef.current        = false;
    redirectHandledRef.current = false;
    try { sessionStorage.removeItem('civisync_auth_redirect_mode'); } catch (_) {}
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      redirectError,
      setRedirectError,
      signOut,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
