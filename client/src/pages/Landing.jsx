import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Zap, Users, BarChart3, CheckCircle2,
  FileText, Clock, Menu, X,
} from 'lucide-react';
import { getStats } from '../api/stats';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';

/* ── Civic Logo Mark ─────────────────────────────────────────────────────── */
function CivicMark({ size = 32, light = false }) {
  const fill = light ? '#FFFFFF' : '#011410';
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 2L4 8v10c0 8.4 5.9 16.3 14 18 8.1-1.7 14-9.6 14-18V8L18 2z"
        fill={fill}
        opacity={light ? '0.2' : '0.12'}
      />
      <path
        d="M18 2L4 8v10c0 8.4 5.9 16.3 14 18 8.1-1.7 14-9.6 14-18V8L18 2z"
        stroke={fill}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M18 10c-1.5 2.5-4 3.8-4 3.8s0 4.7 4 8.2c4-3.5 4-8.2 4-8.2S19.5 12.5 18 10z"
        fill={fill}
        opacity={light ? '0.9' : '0.8'}
      />
      <path d="M14 20.5c1.2.8 2.6 1.5 4 2.5" stroke={fill} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path d="M22 20.5c-1.2.8-2.6 1.5-4 2.5" stroke={fill} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ── Sample map data ─────────────────────────────────────────────────────── */
const SAMPLE_MARKERS = [
  { lat: 12.9716, lng: 77.5946, status: 'Pending' },
  { lat: 12.9616, lng: 77.6046, status: 'In Progress' },
  { lat: 12.9816, lng: 77.5846, status: 'Resolved' },
  { lat: 12.9516, lng: 77.5746, status: 'Assigned' },
  { lat: 12.9916, lng: 77.6146, status: 'Pending' },
  { lat: 12.9416, lng: 77.6246, status: 'In Progress' },
];

const STATUS_COLORS = {
  Pending:     '#D97706',
  Assigned:    '#2563EB',
  'In Progress': '#7C3AED',
  Resolved:    '#16A34A',
};

const FEATURES = [
  {
    icon: <Zap size={19} />, color: '#4A5A30', bg: '#E8EDDA',
    title: 'AI-Powered Analysis',
    desc: 'Upload a photo and let AI auto-classify the issue, assign departments, and estimate severity instantly.',
  },
  {
    icon: <MapPin size={19} />, color: '#011410', bg: '#DFF0D8',
    title: 'Location-Aware Reporting',
    desc: 'GPS auto-detection pins your complaint precisely on the map for officials to locate and fix.',
  },
  {
    icon: <Users size={19} />, color: '#4A7A44', bg: '#E5F2E2',
    title: 'Crowdsourced Support',
    desc: 'Neighbours can support existing complaints to amplify priority and accelerate resolution.',
  },
  {
    icon: <BarChart3 size={19} />, color: '#C17D5A', bg: '#F7EDE6',
    title: 'Full Transparency',
    desc: 'Track every complaint through Pending → Assigned → In Progress → Resolved lifecycle.',
  },
  {
    icon: <CheckCircle2 size={19} />, color: '#011410', bg: '#DFF0D8',
    title: 'Official Dashboard',
    desc: 'Municipal officials get a dedicated dashboard with map view, filters, and inline status updates.',
  },
  {
    icon: <Clock size={19} />, color: '#3A3A3C', bg: '#F7F5F0',
    title: 'Under 60 Seconds',
    desc: 'Report a civic issue in under one minute — no lengthy forms, no manual categorisation.',
  },
];

export default function Landing() {
  const [stats, setStats] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div style={{ background: '#F7F5F0', minHeight: '100vh', fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(247,245,240,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E8E5DE',
        zIndex: 100,
      }}>
        <div style={{
          padding: '0 clamp(16px, 4vw, 40px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CivicMark size={34} />
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1C1C1E', letterSpacing: '-0.2px' }}>
              CiviSync
            </span>
          </div>

          {/* Nav center tag — hidden on mobile */}
          <span style={{
            fontSize: 12.5, color: '#6B6B6B', fontWeight: 500, letterSpacing: '0.01em',
            display: 'var(--landing-tag-display, block)',
          }}
            className="landing-nav-tag"
          >
            Civic Issue Reporting Platform
          </span>

          {/* Desktop CTAs */}
          <div className="landing-nav-ctas" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/auth" state={{ mode: 'login' }} className="landing-nav-btn-signin">
              Sign In
            </Link>
            <Link to="/auth" state={{ mode: 'signup' }} className="landing-nav-btn-register">
              Register
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ display: 'none' }}
            id="landing-menu-btn"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div style={{
            borderTop: '1px solid #E8E5DE',
            background: '#FAFAF7',
            padding: '16px clamp(16px, 4vw, 40px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <Link
              to="/auth"
              state={{ mode: 'login' }}
              className="landing-nav-btn-signin"
              style={{ justifyContent: 'center' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              state={{ mode: 'signup' }}
              className="landing-nav-btn-register"
              style={{ justifyContent: 'center' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Register
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{
        paddingTop: 'clamp(80px, 12vw, 120px)',
        paddingBottom: 'clamp(40px, 6vw, 60px)',
        paddingLeft: 'clamp(16px, 4vw, 40px)',
        paddingRight: 'clamp(16px, 4vw, 40px)',
        maxWidth: 1140,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 'clamp(28px, 5vw, 52px)',
          alignItems: 'center',
          minHeight: 'clamp(auto, 70vh, 80vh)',
        }}>
          {/* Left: Text */}
          <div className="animate-slide-up">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: '#DFF0D8', border: '1px solid rgba(26,58,10,0.2)',
              borderRadius: 100, padding: '5px 14px', marginBottom: 22,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#011410' }} />
              <span style={{ fontSize: 12, color: '#011410', fontWeight: 600, letterSpacing: '0.03em' }}>
                Smart Civic Reporting
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 52px)',
              fontWeight: 800,
              color: '#1C1C1E',
              lineHeight: 1.12,
              marginBottom: 20,
              letterSpacing: '-1px',
            }}>
              Report Civic Issues
              <br />
              <span style={{ color: '#011410' }}>in Under 60 Seconds</span>
            </h1>

            <p style={{
              fontSize: 'clamp(14px, 2vw, 16px)', color: '#6B6B6B',
              lineHeight: 1.75, maxWidth: 440, marginBottom: 0,
            }}>
              Upload a photo, let AI classify the issue, tag your GPS location,
              and submit. Municipal officials receive it instantly and track
              resolution in real time.
            </p>
          </div>

          {/* Right: City Image + floating card */}
          <div style={{ position: 'relative', animationDelay: '0.1s' }} className="animate-slide-up">
            <div style={{
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid #E8E5DE',
              boxShadow: '0 8px 40px rgba(28,28,30,0.10)',
              aspectRatio: '4/3',
              background: '#E8E5DE',
            }}>
              <img
                src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80"
                alt="City aerial view"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.style.background = '#DFF0D8';
                }}
              />
            </div>

            {/* Floating card */}
            <div style={{
              position: 'absolute', bottom: 20, right: 20,
              background: '#FAFAF7',
              border: '1px solid #E8E5DE',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 8px 28px rgba(28,28,30,0.12)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#DFF0D8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <MapPin size={18} color="#011410" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', margin: 0 }}>Smart reporting.</p>
                <p style={{ fontSize: 12, color: '#6B6B6B', margin: 0 }}>Stronger communities.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <section style={{
        background: '#FAFAF7',
        borderTop: '1px solid #E8E5DE',
        borderBottom: '1px solid #E8E5DE',
        padding: '0 clamp(16px, 4vw, 40px)',
      }}>
        <div style={{
          maxWidth: 1140, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}>
          {[
            { label: 'Total Reports',  value: stats?.total ?? '—',      icon: <FileText size={20} />,      iconBg: '#DFF0D8', iconColor: '#011410' },
            { label: 'Pending',        value: stats?.pending ?? '—',    icon: <Clock size={20} />,         iconBg: '#FEF3C7', iconColor: '#D97706' },
            { label: 'In Progress',    value: stats?.inProgress ?? '—', icon: <Zap size={20} />,           iconBg: '#EDE9FE', iconColor: '#7C3AED' },
            { label: 'Resolved',       value: stats?.resolved ?? '—',   icon: <CheckCircle2 size={20} />,  iconBg: '#DCFCE7', iconColor: '#16A34A' },
          ].map(({ label, value, icon, iconBg, iconColor }) => (
            <div key={label} style={{
              padding: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)',
              borderRight: '1px solid #E8E5DE',
              borderBottom: '1px solid #E8E5DE',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: iconColor, flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: '#1C1C1E', lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 4, fontWeight: 500 }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Map Section ────────────────────────────────────────────────────── */}
      {/*
        The map is wrapped in a positioned container with explicit z-index: 0
        so Leaflet's internal z-index stack doesn't bleed upward into the navbar.
        The section itself uses position: relative + isolation: isolate.
      */}
      <section style={{
        padding: 'clamp(48px, 8vw, 88px) clamp(16px, 4vw, 40px)',
        maxWidth: 1140,
        margin: '0 auto',
        position: 'relative',
        isolation: 'isolate',
      }}>
        <div style={{ marginBottom: 44 }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#4A7A44', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Live Map
          </p>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#1C1C1E', marginBottom: 12, letterSpacing: '-0.5px' }}>
            See Issues Near You
          </h2>
          <p style={{ fontSize: 15, color: '#6B6B6B', maxWidth: 520, lineHeight: 1.7 }}>
            An interactive city-wide map shows every reported complaint — colour-coded by status so you always know what&apos;s being handled.
          </p>
        </div>

        {/* Map wrapper: explicit stacking context keeps Leaflet layers from escaping */}
        <div style={{
          position: 'relative',
          zIndex: 0,
          height: 'clamp(280px, 45vw, 420px)',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #E8E5DE',
          boxShadow: '0 4px 24px rgba(28,28,30,0.08)',
        }}>
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={false}
            preferCanvas
            zoomControl
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {SAMPLE_MARKERS.map((m, i) => (
              <CircleMarker
                key={i}
                center={[m.lat, m.lng]}
                radius={10}
                pathOptions={{
                  color: '#fff',
                  weight: 2.5,
                  fillColor: STATUS_COLORS[m.status],
                  fillOpacity: 1,
                }}
              />
            ))}
          </MapContainer>
        </div>

        {/* Map Legend */}
        <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
              <span style={{ fontSize: 13, color: '#6B6B6B', fontWeight: 500 }}>{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{
        padding: 'clamp(48px, 8vw, 88px) clamp(16px, 4vw, 40px)',
        background: '#FAFAF7',
        borderTop: '1px solid #E8E5DE',
        borderBottom: '1px solid #E8E5DE',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ marginBottom: 52 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#4A7A44', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Platform
            </p>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#1C1C1E', marginBottom: 12, letterSpacing: '-0.5px' }}>
              Everything You Need
            </h2>
            <p style={{ fontSize: 15, color: '#6B6B6B', maxWidth: 520, lineHeight: 1.7 }}>
              A complete civic platform from report to resolution — built for citizens and municipal officials alike.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map(({ icon, color, bg, title, desc }) => (
              <div key={title} className="feature-card">
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16, color,
                }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#1C1C1E', marginBottom: 9, letterSpacing: '-0.1px' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13.5, color: '#6B6B6B', lineHeight: 1.7 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#011410',
        padding: 'clamp(48px, 8vw, 88px) clamp(16px, 4vw, 40px)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.5px' }}>
            Ready to Improve Your City?
          </h2>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.7 }}>
            Join your community in reporting and resolving civic issues. It takes under 60 seconds.
          </p>
        </div>
      </footer>

      {/* Inline responsive styles for landing-page-specific elements */}
      <style>{`
        @media (max-width: 640px) {
          #landing-menu-btn { display: flex !important; }
          .landing-nav-ctas { display: none !important; }
          .landing-nav-tag { display: none !important; }
          .hero-cta-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
