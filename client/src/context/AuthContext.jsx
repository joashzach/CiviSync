import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { loginUser } from '../api/complaints';
import toast from 'react-hot-toast';

/** Session-restore flag: true only during initial hydration from persisted auth */
let _isRestoringSession = true;

const AuthContext = createContext(null);

/** Detect mobile/tablet to use redirect instead of popup (popup is blocked on mobile) */
const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth < 768;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user
  const [profile, setProfile] = useState(null); // MongoDB user profile (includes role, name, avatar_url)
  const [loading, setLoading] = useState(true);
  // freshSignIn = true only when the user explicitly just signed in (not a page-reload restore)
  const [freshSignIn, setFreshSignIn] = useState(false);
  const prevUidRef = useRef(null);
  const profileLoadingRef = useRef(false);      // Prevent duplicate backend calls

  const resolveProfile = async (firebaseUser, extraData = {}) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      prevUidRef.current = null;
      return;
    }

    setUser(firebaseUser);

    // Avoid duplicate in-flight calls (e.g. onAuthStateChanged fires multiple times)
    if (profileLoadingRef.current) return;
    profileLoadingRef.current = true;

    // Is this a brand-new explicit sign-in, or just restoring from a persisted session?
    const isNewSignIn = !_isRestoringSession || prevUidRef.current !== firebaseUser.uid;
    const name = extraData.name || firebaseUser.displayName || null;
    const avatarUrl = extraData.avatar_url || firebaseUser.photoURL || null;

    try {
      // Force a fresh token so the axios interceptor definitely has it before
      // the POST /api/auth/login fires (prevents race where token isn't ready yet)
      await firebaseUser.getIdToken(/* forceRefresh= */ true);

      const data = await loginUser({ name, avatar_url: avatarUrl });
      const combinedProfile = {
        ...data,
        name: data?.name || name || firebaseUser.displayName || null,
        avatar_url: data?.avatar_url || avatarUrl || firebaseUser.photoURL || null,
      };
      setProfile(combinedProfile);

      // Show welcome toast only on a new sign-in (not on page reload / token refresh)
      if (isNewSignIn) {
        const greetingName = combinedProfile.name || (data?.email ? data.email.split('@')[0] : '');
        toast.success(`Welcome${greetingName ? `, ${greetingName}` : ''}!`);
        setFreshSignIn(true);
      }
    } catch (err) {
      console.warn('Backend login API call failed, using default profile:', err.message);
      const fallbackProfile = {
        email: firebaseUser.email || 'citizen@civisync.demo',
        name: name || firebaseUser.displayName || null,
        avatar_url: avatarUrl || firebaseUser.photoURL || null,
        role: 'citizen',
        department: null,
      };
      setProfile(fallbackProfile);
      if (isNewSignIn) {
        const greetingName = fallbackProfile.name || (fallbackProfile.email ? fallbackProfile.email.split('@')[0] : '');
        toast.success(`Welcome${greetingName ? `, ${greetingName}` : ''}!`);
        setFreshSignIn(true);
      }
    } finally {
      prevUidRef.current = firebaseUser.uid;
      profileLoadingRef.current = false;
    }
  };

  useEffect(() => {
    let unsubscribe;

    const init = async () => {
      // Handle redirect-based OAuth result (fires after mobile Google redirect returns)
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('OAuth redirect sign-in completed for:', result.user.email);
        }
      } catch (err) {
        // Only report non-cancellation errors
        const ignored = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!ignored.includes(err.code)) {
          console.warn('getRedirectResult error:', err.message);
          toast.error('Google sign-in failed. Please try again.');
        }
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          await resolveProfile(firebaseUser);
        } catch (err) {
          console.warn('Auth state change error:', err);
        } finally {
          setLoading(false);
          // After the first auth state resolution, we are no longer restoring a session
          _isRestoringSession = false;
        }
      });
    };

    init();
    return () => unsubscribe?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Sign in with Google.
   * Uses signInWithRedirect on mobile (popups are blocked) and
   * signInWithPopup on desktop for a better UX.
   */
  const signInWithGoogle = async () => {
    if (isMobileDevice()) {
      return signInWithRedirect(auth, googleProvider);
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (result?.user) {
      await resolveProfile(result.user);
    }
    return result;
  };

  /** Sign in with email + password */
  const signInWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (result?.user) {
      await resolveProfile(result.user);
    }
    return result;
  };

  /** Register a new account with email + password and optional display name */
  const signUpWithEmail = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name && result?.user) {
      try {
        await updateProfile(result.user, { displayName: name });
      } catch (err) {
        console.warn('Failed to update displayName on user:', err.message);
      }
    }
    if (result?.user) {
      await resolveProfile(result.user, { name });
    }
    return result;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setFreshSignIn(false);
    prevUidRef.current = null;
    profileLoadingRef.current = false;
    _isRestoringSession = false;
  };

  /**
   * Sign out silently without redirecting — used by the Auth page on mount to
   * clear any persisted session so the user must explicitly choose an account.
   */
  const signOutSilently = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (_) { /* ignore */ }
    setUser(null);
    setProfile(null);
    setFreshSignIn(false);
    prevUidRef.current = null;
    profileLoadingRef.current = false;
    _isRestoringSession = false;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, freshSignIn, signOut, signOutSilently, signInWithGoogle, signInWithEmail, signUpWithEmail }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
