import { useState, useEffect } from 'react';
import {
  FileText, Clock, Zap, CheckCircle2, MapPin, ThumbsUp, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyStats, getStats } from '../../api/stats';
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
        <h1 className="page-title">Welcome back, {firstName}! 👋</h1>
        <p className="page-subtitle">
          Help improve your city by reporting and supporting civic issues.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<FileText size={20} />}
          value={stats?.total}
          label="My Complaints"
          color="#2563EB" bgColor="#EFF6FF"
        />
        <StatCard
          icon={<Clock size={20} />}
          value={stats?.pending}
          label="Pending"
          color="#D97706" bgColor="#FFFBEB"
        />
        <StatCard
          icon={<Zap size={20} />}
          value={stats?.inProgress}
          label="In Progress"
          color="#7C3AED" bgColor="#F5F3FF"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          value={stats?.resolved}
          label="Resolved"
          color="#16A34A" bgColor="#F0FDF4"
        />
      </div>

      {/* Nearby Complaints */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Nearby Active Complaints
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Issues reported near your location
            </p>
          </div>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
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
            <MapPin size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No nearby complaints found</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
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

                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {truncate(c.title, 55)}
                </h3>

                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{c.category}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <MapPin size={12} />
                    {typeof c.distanceKm === 'number' ? formatDistanceKm(c.distanceKm) : 'Nearby'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <ThumbsUp size={12} /> {c.support_count} supporters
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
            // Refresh nearby list
            if (location) {
              getNearbyComplaints(location.lat, location.lng, 10).then(setNearby).catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
