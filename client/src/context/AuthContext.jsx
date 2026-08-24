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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileLoadingRef = useRef(false);

  const resolveProfile = async (firebaseUser, extraData = {}) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      profileLoadingRef.current = false;
      return;
    }

    setUser(firebaseUser);

    if (profileLoadingRef.current) return;
    profileLoadingRef.current = true;

    const name = extraData.name || firebaseUser.displayName || null;
    const avatarUrl = extraData.avatar_url || firebaseUser.photoURL || null;

    try {
      await firebaseUser.getIdToken(true);
      const data = await loginUser({ name, avatar_url: avatarUrl });
      const combinedProfile = {
        ...data,
        name: data?.name || name || firebaseUser.displayName || null,
        avatar_url: data?.avatar_url || avatarUrl || firebaseUser.photoURL || null,
      };
      setProfile(combinedProfile);
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
    } finally {
      profileLoadingRef.current = false;
    }
  };

  useEffect(() => {
    // Process redirect result if returning from a mobile OAuth redirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await resolveProfile(result.user);
        }
      })
      .catch((err) => {
        const ignored = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
        if (!ignored.includes(err.code)) {
          console.warn('Redirect auth error:', err);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        await resolveProfile(firebaseUser);
      } catch (err) {
        console.warn('Auth state change error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        await resolveProfile(result.user);
      }
      return result;
    } catch (err) {
      // If popup is blocked by browser policy on mobile, fallback to redirect
      if (err.code === 'auth/popup-blocked') {
        return await signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }
  };

  const signInWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (result?.user) {
      await resolveProfile(result.user);
    }
    return result;
  };

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
    profileLoadingRef.current = false;
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
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
