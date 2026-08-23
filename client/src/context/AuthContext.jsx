import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { loginUser } from '../api/complaints';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user
  const [profile, setProfile] = useState(null); // MongoDB user profile (includes role)
  const [loading, setLoading] = useState(true);
  const prevUidRef = useRef(null);

  const resolveProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      prevUidRef.current = null;
      return;
    }
    setUser(firebaseUser);
    try {
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
    }
  };

  useEffect(() => {
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

  /** Sign in with Google OAuth popup */
  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

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
