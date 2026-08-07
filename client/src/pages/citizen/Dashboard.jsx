import { useState, useEffect } from 'react';
import {
  FileText, Clock, Zap, CheckCircle2, MapPin, ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyStats } from '../../api/stats';
import { getNearbyComplaints } from '../../api/complaints';
import StatCard from '../../components/StatCard';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import { getStatusBadgeClass, getSeverityBadgeClass, formatDistanceKm, truncate } from '../../lib/utils';
import { getCurrentUserLocation } from '../../lib/location';

export default function CitizenDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    getMyStats().then(setStats).catch(() => {});

    getCurrentUserLocation().then((loc) => {
      setLocation(loc);
      getNearbyComplaints(loc.lat, loc.lng, 10)
        .then(setNearby)
        .catch(() => {})
        .finally(() => setLoadingNearby(false));
    });
  }, []);

  const firstName = profile?.email?.split('@')[0] ?? 'there';

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className="page-header">
        <h1 className="page-title">Welcome back, {firstName} 👋</h1>
        <p className="page-subtitle">
          Help improve your city by reporting and supporting civic issues.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
        <StatCard icon={<FileText size={19} />} value={stats?.total}      label="My Complaints" color="#011410" bgColor="#DFF0D8" />
        <StatCard icon={<Clock size={19} />}    value={stats?.pending}    label="Pending"       color="#D97706" bgColor="#FEF3C7" />
        <StatCard icon={<Zap size={19} />}      value={stats?.inProgress} label="In Progress"   color="#7C3AED" bgColor="#EDE9FE" />
        <StatCard icon={<CheckCircle2 size={19} />} value={stats?.resolved} label="Resolved"   color="#16A34A" bgColor="#DCFCE7" />
      </div>

      {/* Nearby Complaints */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 15.5, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.2px' }}>
              Nearby Active Complaints
            </h2>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginTop: 3 }}>
              Issues reported near your location
            </p>
          </div>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4A7A44', fontWeight: 500 }}>
              <MapPin size={12} /> Location detected
            </div>
          )}
        </div>

        {loadingNearby ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />
            ))}
          </div>
        ) : nearby.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#DFF0D8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <MapPin size={22} color="#011410" />
            </div>
            <p style={{ color: '#3A3A3C', fontSize: 14, fontWeight: 600 }}>No nearby complaints found</p>
            <p style={{ color: '#6B6B6B', fontSize: 13, marginTop: 5 }}>
              Be the first to report an issue in your area!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {nearby.map((c) => (
              <div
                key={c._id}
                className="card card-hover"
                style={{ padding: '16px 18px', cursor: 'pointer' }}
                onClick={() => setSelectedId(c._id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                  <span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span>
                </div>

                <h3 style={{ fontSize: 13.5, fontWeight: 600, color: '#1C1C1E', marginBottom: 5, letterSpacing: '-0.1px' }}>
                  {truncate(c.title, 55)}
                </h3>

                <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 2 }}>{c.category}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 13, paddingTop: 12, borderTop: '1px solid #E8E5DE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B6B6B' }}>
                    <MapPin size={11} />
                    {typeof c.distanceKm === 'number' ? formatDistanceKm(c.distanceKm) : 'Nearby'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B6B6B' }}>
                    <ThumbsUp size={11} /> {c.support_count} supporters
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <ComplaintDrawer
          complaintId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => {
            if (location) {
              getNearbyComplaints(location.lat, location.lng, 10).then(setNearby).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
