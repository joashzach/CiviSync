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

// ── Mobile Device Detector ───────────────────────────────────────────────────
export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(ua);
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth <= 800;
  return isMobileUA || (isTouchDevice && isSmallScreen);
}

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
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [redirectError, setRedirectError] = useState(null);

  // Stores the display name captured during signUpWithEmail so the
  // onAuthStateChanged listener can use it before the Firebase profile syncs.
  const pendingNameRef = useRef(null);

  // Prevents concurrent or duplicate backend profile fetches.
  const fetchingRef = useRef(false);

  // Safe persistence configuration (resilient to Safari Private Browsing / restricted WebViews)
  const safeSetPersistence = async (rememberMe = true) => {
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
    } catch (err) {
      console.warn('[Auth] Persistence not supported in this environment, using default:', err.message);
    }
  };

  // ── Fetch backend profile for an authenticated Firebase user ─────────────
  const fetchProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      fetchingRef.current = false;
      return null;
    }

    if (fetchingRef.current) return null; // Already in-flight
    fetchingRef.current = true;

    setUser(firebaseUser);

    // Prefer a pending name (from signUpWithEmail) over the Firebase display name.
    const name      = pendingNameRef.current || firebaseUser.displayName || null;
    const avatarUrl = firebaseUser.photoURL || null;

    try {
      // Force-refresh the token so the backend always receives a non-expired JWT.
      await firebaseUser.getIdToken(/* forceRefresh= */ true);
      const data = await loginUser({ name, avatar_url: avatarUrl });
      const fullProfile = {
        ...data,
        name:       data?.name       || name      || null,
        avatar_url: data?.avatar_url || avatarUrl || null,
      };
      setProfile(fullProfile);
      return fullProfile;
    } catch (err) {
      // Backend is unreachable — use a minimal in-memory profile.
      // The app still works; the role defaults to 'citizen'.
      console.warn('[Auth] Backend profile fetch failed, using fallback:', err.message);
      const fallbackProfile = {
        email:      firebaseUser.email,
        name:       name      || null,
        avatar_url: avatarUrl || null,
        role:       'citizen',
        department: null,
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    } finally {
      pendingNameRef.current = null;
      fetchingRef.current    = false;
    }
  }, []);

  // ── Single source of truth: onAuthStateChanged & getRedirectResult ───────
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Process redirect result for mobile devices or redirect OAuth flows
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && isMounted) {
          let savedMode = null;
          try {
            savedMode = sessionStorage.getItem('civisync_auth_redirect_mode');
            sessionStorage.removeItem('civisync_auth_redirect_mode');
          } catch (_) {}

          if (savedMode === 'signup') {
            const additionalInfo = getAdditionalUserInfo(redirectResult);
            const isNewUser = additionalInfo?.isNewUser ?? false;

            if (!isNewUser) {
              await firebaseSignOut(auth);
              if (isMounted) {
                setUser(null);
                setProfile(null);
                const err = new Error('This account is already registered. Please sign in instead.');
                err.code = 'auth/account-already-registered';
                setRedirectError(err);
              }
              return;
            }
          }

          if (isMounted) {
            await fetchProfile(redirectResult.user);
          }
        }
      } catch (err) {
        const silent = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!silent.includes(err.code)) {
          console.warn('[Auth] Redirect result processing:', err);
          if (isMounted) setRedirectError(err);
        }
      }

      // 2. onAuthStateChanged is authoritative for user session state
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        try {
          if (firebaseUser) {
            await fetchProfile(firebaseUser);
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (err) {
          console.warn('[Auth] onAuthStateChanged error:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      });

      return unsubscribe;
    };

    const unsubPromise = initAuth();

    return () => {
      isMounted = false;
      unsubPromise.then((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [fetchProfile]);

  // ── Google OAuth (Mobile-optimized with automatic Redirect / Popup) ────────
  const signInWithGoogle = async (rememberMe = true, expectedMode = null) => {
    await safeSetPersistence(rememberMe);

    try {
      sessionStorage.setItem('civisync_auth_redirect_mode', expectedMode || 'login');
    } catch (_) {}

    // On mobile devices (iOS Safari, Android Chrome, WebViews), always use redirect
    // to bypass popup blockers, cross-origin iframe security, and tab death.
    if (isMobileDevice()) {
      return signInWithRedirect(auth, googleProvider);
    }

    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // If popup was blocked or failed, seamlessly fallback to redirect
      const fallbackCodes = [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/internal-error',
      ];
      if (fallbackCodes.includes(err.code) || err.message?.includes('popup')) {
        console.info('[Auth] Popup failed, falling back to redirect:', err.code || err.message);
        return signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }

    if (result && expectedMode === 'signup') {
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser ?? false;

      if (!isNewUser) {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
        const err = new Error('This account is already registered. Please sign in instead.');
        err.code = 'auth/account-already-registered';
        throw err;
      }
    }

    try {
      sessionStorage.removeItem('civisync_auth_redirect_mode');
    } catch (_) {}

    return result;
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
      try {
        await updateProfile(result.user, { displayName: name });
      } catch (err) {
        console.warn('[Auth] Failed to set displayName:', err.message);
      }
    }

    return result;
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    pendingNameRef.current = null;
    fetchingRef.current    = false;
    try {
      sessionStorage.removeItem('civisync_auth_redirect_mode');
    } catch (_) {}
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
        redirectError,
        setRedirectError,
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

