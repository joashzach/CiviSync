import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Civic Logo Mark ─────────────────────────────────────────────────────── */
function CivicMark({ size = 28 }) {
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

const navItems = [
  { to: '/official', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/official/map', label: 'Map View', icon: Map },
];

export default function OfficialLayout({ children }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const sidebarRef = useRef(null);

  const displayName = profile?.name || user?.displayName || (profile?.email ? profile.email.split('@')[0] : 'Official');
  const email = profile?.email || user?.email || '';
  const photoURL = profile?.avatar_url || user?.photoURL || null;
  const dept = profile?.department || null;
  const initials = (displayName || email || 'O')
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'O';

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="app-layout">
      {/* ── Mobile Header ──────────────────────────────────────────────────── */}
      <div className="mobile-header">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
        <div className="mobile-header-logo">
          <CivicMark size={26} />
          CiviSync
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {photoURL && !imgError ? (
            <img
              src={photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E8E5DE' }}
            />
          ) : (
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: '#F7EDE6', color: '#C17D5A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
            }}>
              {initials}
            </div>
          )}
          <button
            className="mobile-header-logout"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={14} />
            <span>Out</span>
          </button>
        </div>
      </div>

      {/* ── Sidebar Overlay (mobile) ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`} ref={sidebarRef}>
        {/* Logo section */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <CivicMark size={30} />
              <span style={{ fontWeight: 700, fontSize: 15.5, color: '#1C1C1E', letterSpacing: '-0.2px' }}>
                CiviSync
              </span>
            </div>
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              style={{ display: 'none' }}
              id="official-sidebar-close-btn"
            >
              <X size={20} />
            </button>
          </div>
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #E8E5DE',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {photoURL && !imgError ? (
              <img
                src={photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid #E8E5DE',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#F7EDE6',
                  color: '#C17D5A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  border: '1px solid rgba(193,125,90,0.2)',
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1C1C1E',
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={displayName}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontSize: 11.5,
                  color: '#6B6B6B',
                  fontWeight: 400,
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={dept ? `${dept} • ${email}` : email}
              >
                {dept || email}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px 10px', borderTop: '1px solid #E8E5DE' }}>
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ color: '#9B3B3B' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F9ECEC';
              e.currentTarget.style.color = '#9B3B3B';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#9B3B3B';
            }}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <style>{`
        @media (max-width: 768px) {
          #official-sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
