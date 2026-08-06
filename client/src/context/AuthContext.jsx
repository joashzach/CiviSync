import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { loginUser } from '../api/complaints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user
  const [profile, setProfile] = useState(null); // MongoDB user profile (includes role)
  const [loading, setLoading] = useState(true);

  const resolveProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      return;
    }
    setUser(firebaseUser);
    try {
      const data = await loginUser();
      setProfile(data);
    } catch (err) {
      console.warn('Backend login API call failed, using default profile:', err.message);
      setProfile({
        email: firebaseUser.email || 'citizen@civisync.demo',
        role: 'citizen',
        department: null,
      });
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

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
