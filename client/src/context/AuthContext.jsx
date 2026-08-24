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

// ── Firebase error mapper ────────────────────────────────────────────────────
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
  // Exposed in context so auth handlers can await it and navigate explicitly.
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
  // CRITICAL ORDER:
  //   1. Register onAuthStateChanged SYNCHRONOUSLY (no await before it).
  //      On mobile, Firebase may emit state before an async-gated listener is
  //      attached — registering first guarantees we never miss the initial event.
  //   2. Await getRedirectResult in a separate async IIFE running concurrently.
  //      If it finds a redirect user, set redirectHandledRef so onAuthStateChanged skips.
  useEffect(() => {
    let isMounted = true;

    // ── 1. Register session observer immediately (no async gap) ──────────
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
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

    // ── 2. Resolve any pending OAuth redirect result concurrently ────────
    (async () => {
      try {
        const redirectResult = await getRedirectResult(auth);

        if (redirectResult?.user && isMounted) {
          let savedMode = 'login';
          try {
            savedMode = sessionStorage.getItem('civisync_auth_redirect_mode') || 'login';
            sessionStorage.removeItem('civisync_auth_redirect_mode');
          } catch (_) {}

          // Enforce signup-only restriction for returning users
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
              }
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
    })();

    return () => { isMounted = false; unsubAuth(); };
  }, [fetchProfile]);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  // Both desktop and mobile use popup-first. If the popup is blocked or killed
  // (the normal mobile browser behaviour), automatically fall back to redirect.
  const signInWithGoogle = async (rememberMe = true, expectedMode = null) => {
    // Set persistence asynchronously to keep the first call synchronously chained
    // from the user's click gesture. Awaiting here causes mobile browsers to block the popup.
    safeSetPersistence(rememberMe).catch((err) => console.warn('[Auth] safeSetPersistence error:', err));
    try { sessionStorage.setItem('civisync_auth_redirect_mode', expectedMode || 'login'); } catch (_) {}

    // All codes that mean "popup could not open or was dismissed"
    const popupFallbackCodes = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
      'auth/web-storage-unsupported',
    ];

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
      if (
        popupFallbackCodes.includes(err?.code) ||
        err?.message?.toLowerCase().includes('popup')
      ) {
        console.info('[Auth] Popup blocked/killed, falling back to redirect:', err?.code);
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
    // Set pendingNameRef BEFORE creating the user so onAuthStateChanged -> fetchProfile
    // sees the name immediately when it fires.
    if (name) {
      pendingNameRef.current = name;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name && result?.user) {
        try { await updateProfile(result.user, { displayName: name }); }
        catch (err) { console.warn('[Auth] updateProfile failed:', err.message); }
      }
      return result;
    } catch (err) {
      pendingNameRef.current = null;
      throw err;
    }
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
      fetchProfile,
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
