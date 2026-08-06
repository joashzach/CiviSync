import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, MapPin, Zap, Users, BarChart3, CheckCircle2,
  ArrowRight, FileText, Clock, Star,
} from 'lucide-react';
import { getStats } from '../api/stats';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

// Bengaluru sample marker positions for the landing map
const SAMPLE_MARKERS = [
  { lat: 12.9716, lng: 77.5946, status: 'Pending' },
  { lat: 12.9616, lng: 77.6046, status: 'In Progress' },
  { lat: 12.9816, lng: 77.5846, status: 'Resolved' },
  { lat: 12.9516, lng: 77.5746, status: 'Assigned' },
  { lat: 12.9916, lng: 77.6146, status: 'Pending' },
  { lat: 12.9416, lng: 77.6246, status: 'In Progress' },
];

const STATUS_COLORS = {
  Pending: '#D97706', Assigned: '#2563EB',
  'In Progress': '#7C3AED', Resolved: '#16A34A',
};

const FEATURES = [
  {
    icon: <Zap size={20} />, color: '#7C3AED', bg: '#F5F3FF',
    title: 'AI-Powered Analysis',
    desc: 'Upload a photo and let Gemini AI auto-classify the issue, assign departments, and estimate severity.',
  },
  {
    icon: <MapPin size={20} />, color: '#2563EB', bg: '#EFF6FF',
    title: 'Location-Aware Reporting',
    desc: 'GPS auto-detection pins your complaint precisely on the map for officials to find and fix.',
  },
  {
    icon: <Users size={20} />, color: '#16A34A', bg: '#F0FDF4',
    title: 'Crowdsourced Support',
    desc: 'Neighbours can support existing complaints to amplify priority and accelerate resolution.',
  },
  {
    icon: <BarChart3 size={20} />, color: '#D97706', bg: '#FFFBEB',
    title: 'Full Transparency',
    desc: 'Track every complaint through Pending → Assigned → In Progress → Resolved lifecycle.',
  },
  {
    icon: <CheckCircle2 size={20} />, color: '#DC2626', bg: '#FEF2F2',
    title: 'Official Dashboard',
    desc: 'Municipal officials get a dedicated dashboard with map view, filters, and inline status updates.',
  },
  {
    icon: <Star size={20} />, color: '#0F172A', bg: '#F1F5F9',
    title: 'Under 60 Seconds',
    desc: 'Report a civic issue in under one minute — no lengthy forms, no manual categorization.',
  },
];

export default function Landing() {
  const [stats, setStats] = useState(null);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(15,23,42,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>CiviSync</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            AI-Powered Civic Reporting
          </span>
          <Link to="/auth" className="btn btn-primary btn-sm">
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1a2f6e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 32px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />

        <div style={{ position: 'relative', maxWidth: 720 }} className="animate-slide-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.4)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 24,
          }}>
            <Zap size={13} color="#60A5FA" />
            <span style={{ fontSize: 12, color: '#93C5FD', fontWeight: 500 }}>
              Powered by Gemini AI + Google Maps
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 700, color: '#fff',
            lineHeight: 1.15, marginBottom: 20,
            letterSpacing: '-0.5px',
          }}>
            Report Civic Issues
            <br />
            <span style={{ color: '#60A5FA' }}>in Under 60 Seconds</span>
          </h1>

          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px',
          }}>
            Upload a photo, let AI classify the issue, tag your GPS location, and submit.
            Municipal officials receive it instantly and track resolution in real time.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/auth" className="btn btn-primary btn-lg">
              Report an Issue <ArrowRight size={16} />
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
              How it Works
            </a>
          </div>
        </div>
      </section>

      {/* ─── Live Stats ─────────────────────────────────────────────────────── */}
      <section style={{
        background: '#0F172A',
        padding: '28px 32px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center',
          maxWidth: 900,
        }}>
          {[
            { label: 'Total Complaints', value: stats?.total ?? '—', color: '#60A5FA' },
            { label: 'Pending', value: stats?.pending ?? '—', color: '#FBBF24' },
            { label: 'In Progress', value: stats?.inProgress ?? '—', color: '#A78BFA' },
            { label: 'Resolved', value: stats?.resolved ?? '—', color: '#34D399' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color, letterSpacing: '-0.5px' }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Map Preview ────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            See Issues Near You
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
            An interactive city-wide map shows every reported complaint — color-coded by status.
          </p>
        </div>

        <div className="map-container" style={{ height: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: 12.9716, lng: 77.5946 }}
              zoom={12}
              options={{ disableDefaultUI: true, zoomControl: true }}
            >
              {SAMPLE_MARKERS.map((m, i) => (
                <Marker
                  key={i}
                  position={{ lat: m.lat, lng: m.lng }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: STATUS_COLORS[m.status],
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    scale: 10,
                  }}
                />
              ))}
            </GoogleMap>
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#F1F5F9', flexDirection: 'column', gap: 10,
            }}>
              <MapPin size={32} color="var(--text-muted)" />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Map requires Google Maps API key
              </p>
            </div>
          )}
        </div>

        {/* Map Legend */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '72px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              Everything You Need
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
              Built for Smart India Hackathon — a complete civic platform from report to resolution.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map(({ icon, color, bg, title, desc }) => (
              <div key={title} className="card card-hover" style={{ padding: '22px 24px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14, color,
                }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1E40AF, #1d4ed8)',
        padding: '72px 32px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
          Ready to Improve Your City?
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>
          Join your community in reporting and resolving civic issues.
        </p>
        <Link to="/auth" className="btn btn-lg" style={{
          background: '#fff', color: 'var(--primary)', fontWeight: 600,
        }}>
          Start Reporting Free <ArrowRight size={16} />
        </Link>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#0F172A',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>CiviSync</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          © 2025 CiviSync. Built for Smart India Hackathon.
        </p>
      </footer>
    </div>
  );
}
