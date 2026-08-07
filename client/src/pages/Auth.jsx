import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, MapPin, Zap, Users } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Civic Logo Mark ─────────────────────────────────────────────────────── */
function CivicMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2L4 8v10c0 8.4 5.9 16.3 14 18 8.1-1.7 14-9.6 14-18V8L18 2z" fill="#011410" opacity="0.12" />
      <path d="M18 2L4 8v10c0 8.4 5.9 16.3 14 18 8.1-1.7 14-9.6 14-18V8L18 2z" stroke="#011410" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M18 10c-1.5 2.5-4 3.8-4 3.8s0 4.7 4 8.2c4-3.5 4-8.2 4-8.2S19.5 12.5 18 10z" fill="#011410" opacity="0.8" />
      <path d="M14 20.5c1.2.8 2.6 1.5 4 2.5" stroke="#011410" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path d="M22 20.5c-1.2.8-2.6 1.5-4 2.5" stroke="#011410" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const PERKS = [
  { icon: <Zap size={16} />, text: 'AI classifies issues in seconds' },
  { icon: <MapPin size={16} />, text: 'GPS-pinned reports on a live map' },
  { icon: <Users size={16} />, text: 'Community-driven civic action' },
];

export default function Auth() {
  const location = useLocation();
  const initialMode = location.state?.mode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const destination = profile?.role === 'official' ? '/official' : '/citizen';
      navigate(destination, { replace: true });
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in with Google!');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F5F0',
      display: 'flex',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '45%',
        minHeight: '100vh',
        background: '#011410',
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle texture pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CivicMark size={28} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '-0.2px' }}>CiviSync</span>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', marginTop: 'auto', marginBottom: 'auto', paddingTop: 48 }}>
          <h1 style={{
            fontSize: 'clamp(28px, 3vw, 38px)',
            fontWeight: 800, color: '#fff',
            lineHeight: 1.15, marginBottom: 18,
            letterSpacing: '-0.8px',
          }}>
            Civic action
            <br />
            starts here.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, maxWidth: 340, marginBottom: 40 }}>
            Report issues, track progress, and work with your community to build a better city — all in one place.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PERKS.map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#E5F2E2', flexShrink: 0,
                }}>
                  {icon}
                </div>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', fontWeight: 400 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            © 2025 CiviSync. Smart India Hackathon.
          </p>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        background: '#F7F5F0',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Back link */}
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#6B6B6B', fontSize: 13, textDecoration: 'none',
            marginBottom: 36, fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1C1C1E'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B6B6B'; }}
          >
            <ArrowLeft size={14} /> Back to home
          </a>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: '#FAFAF7',
            border: '1px solid #E8E5DE',
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
          }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 7, border: 'none',
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600, fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                  background: mode === m ? '#011410' : 'transparent',
                  color: mode === m ? '#fff' : '#6B6B6B',
                  boxShadow: mode === m ? '0 2px 8px rgba(26,58,10,0.2)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h2 style={{ fontSize: 21, fontWeight: 700, color: '#1C1C1E', marginBottom: 6, letterSpacing: '-0.3px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13.5, color: '#6B6B6B', marginBottom: 26 }}>
            {mode === 'login'
              ? 'Enter your credentials to continue'
              : 'Join thousands of citizens improving their city'}
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 18px', borderRadius: 9,
              border: '1.5px solid #E8E5DE', background: '#FAFAF7',
              cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
              fontFamily: "'Poppins', sans-serif", color: '#1C1C1E',
              transition: 'all 0.16s ease', marginBottom: 18,
              opacity: googleLoading || loading ? 0.55 : 1,
            }}
            onMouseEnter={e => { if (!googleLoading && !loading) e.currentTarget.style.borderColor = '#D4D0C8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E5DE'; }}
          >
            {googleLoading ? (
              <div style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid #E8E5DE', borderTopColor: '#011410', animation: 'spin 0.7s linear infinite' }} />
            ) : <GoogleIcon />}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: '#E8E5DE' }} />
            <span style={{ fontSize: 12, color: '#6B6B6B', fontWeight: 500 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: '#E8E5DE' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#6B6B6B',
                }} />
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 34 }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#6B6B6B',
                }} />
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 34, paddingRight: 40 }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 11, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6B6B6B', display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: 4, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px 20px',
                background: '#011410', color: '#fff',
                border: '1.5px solid #011410', borderRadius: 9,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                transition: 'all 0.16s ease',
                opacity: loading || googleLoading ? 0.6 : 1,
              }}
              disabled={loading || googleLoading}
              onMouseEnter={e => { if (!loading && !googleLoading) e.currentTarget.style.background = '#000806'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#011410'; }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6B6B6B' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => setMode('signup')} style={{ color: '#011410', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Poppins', sans-serif", fontSize: 13 }}>
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')} style={{ color: '#011410', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Poppins', sans-serif", fontSize: 13 }}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
