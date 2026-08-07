import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, LogOut } from 'lucide-react';
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
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo section */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <CivicMark size={30} />
            <span style={{ fontWeight: 700, fontSize: 15.5, color: '#1C1C1E', letterSpacing: '-0.2px' }}>
              CiviSync
            </span>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E8E5DE' }}>
            <p style={{
              fontSize: 9.5, color: '#C17D5A', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3,
            }}>Official</p>
            <p style={{
              fontSize: 12, color: '#3A3A3C', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {profile?.department || profile?.email}
            </p>
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
    </div>
  );
}
