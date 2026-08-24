import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getFirebaseErrorMessage } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, MapPin, Zap, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS   = 5;      // Lock the form after this many consecutive failures
const LOCKOUT_SEC    = 60;     // Lockout duration in seconds
const MIN_PW_LENGTH  = 8;
const EXACT_AUTH_GREEN = '#011410'; // EXACT green of the /auth left bar

// ── Password strength scorer ──────────────────────────────────────────────────
function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= MIN_PW_LENGTH)  score++;
  if (pw.length >= 12)             score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;

  const levels = [
    { label: 'Too short',  color: '#DC2626' },
    { label: 'Weak',       color: '#EA580C' },
    { label: 'Fair',       color: '#D97706' },
    { label: 'Good',       color: '#16A34A' },
    { label: 'Strong',     color: '#15803D' },
    { label: 'Very strong',color: '#166534' },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
}

/* ── Civic Logo Mark ─────────────────────────────────────────────────────── */
function CivicMark({ size = 36, stroke = EXACT_AUTH_GREEN }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2L4 8v10c0 8.4 5.9 16.3 14 18 8.1-1.7 14-9.6 14-18V8L18 2z" fill={stroke} opacity="0.12" />
      <path d="M18 2L4 8v10c0 8.4 5.9 16.3 14 18 8.1-1.7 14-9.6 14-18V8L18 2z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M18 10c-1.5 2.5-4 3.8-4 3.8s0 4.7 4 8.2c4-3.5 4-8.2 4-8.2S19.5 12.5 18 10z" fill={stroke} opacity="0.8" />
      <path d="M14 20.5c1.2.8 2.6 1.5 4 2.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path d="M22 20.5c-1.2.8-2.6 1.5-4 2.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
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
  { icon: <Zap size={15} />,    text: 'AI classifies issues in seconds' },
  { icon: <MapPin size={15} />, text: 'GPS-pinned reports on a live map' },
  { icon: <Users size={15} />,  text: 'Community-driven civic action' },
];

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 15, light = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${light ? 'rgba(255,255,255,0.3)' : '#E8E5DE'}`,
      borderTopColor: light ? '#fff' : EXACT_AUTH_GREEN,
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// ── Password strength bar ─────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const { score, label, color } = scorePassword(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 4,
            background: i <= score ? color : '#E8E5DE',
            transition: 'background 0.2s ease',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── Lockout countdown ─────────────────────────────────────────────────────────
function LockoutBanner({ secondsLeft }) {
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 8, padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12,
    }}>
      <Lock size={13} color="#DC2626" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.4 }}>
        Too many attempts. Wait <strong>{secondsLeft}s</strong> to retry.
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Auth() {
  const location    = useLocation();
  const initialMode = location.state?.mode === 'signup' ? 'signup' : 'login';

  const [mode,         setMode]         = useState(initialMode);
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(true);
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);

  // ── Brute-force protection state ──────────────────────────────────────────
  const [attempts,     setAttempts]     = useState(0);
  const [lockedUntil,  setLockedUntil]  = useState(null);
  const [secondsLeft,  setSecondsLeft]  = useState(0);
  const lockTimerRef = useRef(null);

  const { user, profile, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  // ── Redirect on auth ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      navigate(profile?.role === 'official' ? '/official' : '/citizen', { replace: true });
    }
  }, [user, profile, navigate]);

  // ── Lockout countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setSecondsLeft(0);
        clearInterval(lockTimerRef.current);
      } else {
        setSecondsLeft(remaining);
      }
    };
    tick();
    lockTimerRef.current = setInterval(tick, 1000);
    return () => clearInterval(lockTimerRef.current);
  }, [lockedUntil]);

  const isLocked    = !!lockedUntil && Date.now() < lockedUntil;
  const isAnyLoading = loading || googleLoading;

  // ── Mode switch ───────────────────────────────────────────────────────────
  const switchMode = (m) => {
    setMode(m);
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  // ── Client-side validation ────────────────────────────────────────────────
  const validate = () => {
    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your full name'); return false;
    }
    if (!email) {
      toast.error('Please enter your email address'); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address'); return false;
    }
    if (!password) {
      toast.error('Please enter a password'); return false;
    }
    if (password.length < MIN_PW_LENGTH) {
      toast.error(`Password must be at least ${MIN_PW_LENGTH} characters`); return false;
    }
    if (mode === 'signup') {
      const { score } = scorePassword(password);
      if (score < 2) {
        toast.error('Please choose a stronger password');
        return false;
      }
    }
    return true;
  };

  // ── Record a failed attempt / trigger lockout ────────────────────────────
  const recordFailure = () => {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCKOUT_SEC * 1000);
      toast.error(`Account temporarily locked for ${LOCKOUT_SEC} seconds.`);
    } else {
      const remaining = MAX_ATTEMPTS - next;
      if (remaining <= 2) {
        toast.error(`${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      }
    }
  };

  // ── Email / Password submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked || isAnyLoading) return;
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name.trim());
        toast.success(`Welcome, ${name.trim()}!`);
        setAttempts(0);
      } else {
        await signInWithEmail(email, password, rememberMe);
        toast.success('Signed in successfully!');
        setAttempts(0);
      }
    } catch (err) {
      const msg = getFirebaseErrorMessage(err);
      if (msg) {
        toast.error(msg);
        if (err.code === 'auth/email-already-in-use') {
          switchMode('login');
        } else if (mode === 'login') {
          recordFailure();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-in (Popup) ────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (isLocked || isAnyLoading) return;
    setGoogleLoading(true);

    const onWindowRefocus = () => {
      setTimeout(() => {
        setGoogleLoading(false);
      }, 400);
    };
    window.addEventListener('focus', onWindowRefocus, { once: true });

    try {
      await signInWithGoogle(rememberMe, mode);
    } catch (err) {
      const msg = getFirebaseErrorMessage(err);
      if (msg) {
        toast.error(msg);
        if (err.code === 'auth/account-already-registered') {
          switchMode('login');
        }
      }
    } finally {
      window.removeEventListener('focus', onWindowRefocus);
      setGoogleLoading(false);
    }
  };

  if (user) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#F7F5F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Poppins', sans-serif",
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="auth-root-container" style={{
      height: '100vh',
      width: '100vw',
      background: '#F7F5F0',
      display: 'flex',
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden',
    }}>
      {/* ── Left branding panel (100% Static on both Sign In & Register) ──── */}
      <div className="auth-left-panel" style={{
        width: '45%',
        height: '100vh',
        background: EXACT_AUTH_GREEN,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(32px, 4vw, 48px)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Subtle texture pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        {/* Top: Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CivicMark size={26} stroke="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '-0.2px' }}>CiviSync</span>
        </div>

        {/* Middle: Static Hero Content */}
        <div style={{ position: 'relative', padding: '24px 0' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 2.6vw, 34px)',
            fontWeight: 800, color: '#fff',
            lineHeight: 1.15, marginBottom: 14,
            letterSpacing: '-0.8px',
          }}>
            Civic action<br />starts here.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, maxWidth: 330, marginBottom: 28 }}>
            Report issues, track progress, and work with your community to build a better city.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PERKS.map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#E5F2E2', flexShrink: 0,
                }}>{icon}</div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom space placeholder to keep static alignment */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Right form panel (Fixed viewport, zero scroll on desktop) ────── */}
      <div className="auth-right-panel" style={{
        flex: 1,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px clamp(16px, 4vw, 40px)',
        background: '#F7F5F0',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Back link */}
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#6B6B6B', fontSize: 12.5, textDecoration: 'none',
            marginBottom: 20, fontWeight: 500, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = EXACT_AUTH_GREEN; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B6B6B'; }}>
            <ArrowLeft size={13} /> Back to home
          </a>

          {/* Mobile logo (hidden on desktop) */}
          <div className="auth-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 9, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: EXACT_AUTH_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CivicMark size={20} stroke="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1C1C1E', letterSpacing: '-0.2px' }}>CiviSync</span>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: '#FAFAF7',
            border: '1px solid #E8E5DE', borderRadius: 9,
            padding: 3, marginBottom: 18,
          }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} disabled={isAnyLoading} style={{
                flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
                fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13,
                cursor: isAnyLoading ? 'default' : 'pointer',
                transition: 'opacity 0.16s ease',
                background: mode === m ? EXACT_AUTH_GREEN : 'transparent',
                color: mode === m ? '#fff' : '#6B6B6B',
                boxShadow: mode === m ? '0 2px 8px rgba(1, 20, 16, 0.25)' : 'none',
              }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1C1C1E', marginBottom: 4, letterSpacing: '-0.3px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 16 }}>
            {mode === 'login' ? 'Enter your credentials to continue' : 'Join thousands of citizens improving their city'}
          </p>

          {/* Lockout banner */}
          {isLocked && <LockoutBanner secondsLeft={secondsLeft} />}

          {/* Google OAuth */}
          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={isAnyLoading || isLocked}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              padding: '9px 16px', borderRadius: 8,
              border: '1.5px solid #E8E5DE', background: '#FAFAF7',
              cursor: (isAnyLoading || isLocked) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500,
              fontFamily: "'Poppins', sans-serif", color: '#1C1C1E',
              transition: 'border-color 0.16s ease', marginBottom: 14,
              opacity: (isAnyLoading || isLocked) ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!isAnyLoading && !isLocked) e.currentTarget.style.borderColor = EXACT_AUTH_GREEN; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E5DE'; }}
          >
            {googleLoading ? <Spinner size={16} /> : <GoogleIcon />}
            {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: '#E8E5DE' }} />
            <span style={{ fontSize: 11.5, color: '#6B6B6B', fontWeight: 500 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: '#E8E5DE' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>

            {/* Name — signup only */}
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="auth-name" style={{ fontSize: 12, marginBottom: 4 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B6B6B' }} />
                  <input
                    id="auth-name"
                    className="input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ paddingLeft: 32, paddingBottom: 7, paddingTop: 7, fontSize: 13 }}
                    disabled={isAnyLoading || isLocked}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label" htmlFor="auth-email" style={{ fontSize: 12, marginBottom: 4 }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B6B6B' }} />
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 32, paddingBottom: 7, paddingTop: 7, fontSize: 13 }}
                  disabled={isAnyLoading || isLocked}
                  autoComplete="email"
                  autoFocus={mode === 'login'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="auth-password" style={{ fontSize: 12, marginBottom: 4 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B6B6B' }} />
                <input
                  id="auth-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 32, paddingRight: 36, paddingBottom: 7, paddingTop: 7, fontSize: 13 }}
                  minLength={MIN_PW_LENGTH}
                  disabled={isAnyLoading || isLocked}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B6B', display: 'flex',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {mode === 'signup' && <StrengthBar password={password} />}
            </div>

            {/* Remember me — login only */}
            {mode === 'login' && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7,
                cursor: 'pointer', userSelect: 'none', marginTop: -2,
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: EXACT_AUTH_GREEN, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12.5, color: '#6B6B6B' }}>Keep me signed in</span>
              </label>
            )}

            {/* Submit — EXACT #011410 green throughout with NO color change on hover */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isAnyLoading || isLocked}
              style={{
                marginTop: 2, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '10px 18px',
                background: EXACT_AUTH_GREEN, color: '#fff',
                border: `1.5px solid ${EXACT_AUTH_GREEN}`, borderRadius: 8,
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600, fontSize: 13.5,
                cursor: (isAnyLoading || isLocked) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.16s ease, transform 0.16s ease',
                boxShadow: '0 2px 10px rgba(1, 20, 16, 0.28)',
                opacity: (isAnyLoading || isLocked) ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!isAnyLoading && !isLocked) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? (
                <>
                  <Spinner size={14} light />
                  {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Attempts warning (non-locked) */}
          {!isLocked && attempts > 0 && attempts < MAX_ATTEMPTS && (
            <p style={{ marginTop: 8, textAlign: 'center', fontSize: 11.5, color: '#DC2626' }}>
              {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining
            </p>
          )}

          {/* Switch mode */}
          <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, color: '#6B6B6B' }}>
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button id="switch-to-signup" onClick={() => switchMode('signup')} style={{ color: EXACT_AUTH_GREEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Poppins', sans-serif", fontSize: 12.5 }}>
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button id="switch-to-login" onClick={() => switchMode('login')} style={{ color: EXACT_AUTH_GREEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Poppins', sans-serif", fontSize: 12.5 }}>
                  Sign in
                </button>
              </>
            )}
          </p>

        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel  { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
          .auth-root-container { overflow-y: auto !important; height: auto !important; min-height: 100vh !important; }
          .auth-right-panel { height: auto !important; min-height: 100vh !important; padding: 32px 20px !important; }
        }
      `}</style>
    </div>
  );
}
