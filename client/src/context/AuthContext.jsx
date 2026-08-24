import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { loginUser } from '../api/complaints';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

/** Detect mobile/tablet to use redirect instead of popup (popup is blocked on mobile) */
const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth < 768;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user
  const [profile, setProfile] = useState(null); // MongoDB user profile (includes role)
  const [loading, setLoading] = useState(true);
  const prevUidRef = useRef(null);
  const profileLoadingRef = useRef(false);      // Prevent duplicate backend calls

  const resolveProfile = async (firebaseUser) => {
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

    try {
      // Force a fresh token so the axios interceptor definitely has it before
      // the POST /api/auth/login fires (prevents race where token isn't ready yet)
      await firebaseUser.getIdToken(/* forceRefresh= */ true);

      const data = await loginUser();
      setProfile(data);

      // Show welcome toast only on a new sign-in (not on page reload / token refresh)
      if (prevUidRef.current !== firebaseUser.uid) {
        toast.success(`Welcome${data?.email ? `, ${data.email.split('@')[0]}` : ''}!`);
      }
    } catch (err) {
      console.warn('Backend login API call failed, using default profile:', err.message);
      setProfile({
        email: firebaseUser.email || 'citizen@civisync.demo',
        role: 'citizen',
        department: null,
      });
      if (prevUidRef.current !== firebaseUser.uid) {
        toast.success('Signed in!');
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
          // onAuthStateChanged will also fire and call resolveProfile — no need to call
          // it here, but we log for debugging
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
      // Redirect flow: page will navigate away, then return.
      // The result is captured by getRedirectResult in the useEffect above.
      return signInWithRedirect(auth, googleProvider);
    }
    return signInWithPopup(auth, googleProvider);
  };

  /** Sign in with email + password */
  const signInWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  /** Register a new account with email + password */
  const signUpWithEmail = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    prevUidRef.current = null;
    profileLoadingRef.current = false;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, signInWithGoogle, signInWithEmail, signUpWithEmail }}
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
