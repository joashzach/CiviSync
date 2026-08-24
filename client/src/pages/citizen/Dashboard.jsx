import { useState, useEffect } from 'react';
import {
  Inbox, Clock, RotateCw, ShieldCheck, MapPin, ThumbsUp, Sparkles, Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getMyStats } from '../../api/stats';
import { getNearbyComplaints } from '../../api/complaints';
import StatCard from '../../components/StatCard';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import { getStatusBadgeClass, getSeverityBadgeClass, formatDistanceKm, truncate } from '../../lib/utils';
import { getCurrentUserLocation, getCachedLocation, subscribeToLocationUpdates } from '../../lib/location';

export default function CitizenDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [location, setLocation] = useState(() => getCachedLocation());

  useEffect(() => {
    getMyStats().then(setStats).catch(() => {});

    const loadNearby = (loc) => {
      if (!loc?.lat || !loc?.lng) return;
      setLocation(loc);
      getNearbyComplaints(loc.lat, loc.lng, 10)
        .then(setNearby)
        .catch(() => {})
        .finally(() => setLoadingNearby(false));
    };

    // Load from cache first if available
    const cached = getCachedLocation();
    if (cached) {
      loadNearby(cached);
    }

    // Request actual high-accuracy location
    getCurrentUserLocation().then((loc) => {
      if (loc) loadNearby(loc);
    });

    // Subscribe to live location updates across tabs/components
    const unsubscribe = subscribeToLocationUpdates((loc) => {
      if (loc) loadNearby(loc);
    });

    return () => unsubscribe();
  }, []);

  const displayName = profile?.name || user?.displayName || (profile?.email ? profile.email.split('@')[0] : 'there');

  return (
    <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
      {/* Top Stat Cards matching reference design */}
      <div
        className="stat-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}
      >
        <StatCard
          icon={<Inbox size={22} />}
          value={stats?.total ?? 0}
          label="My Filed Reports"
          color="#3B6B99"
          bgColor="#EAF1F8"
        />
        <StatCard
          icon={<Clock size={22} />}
          value={stats?.pending ?? 0}
          label="Awaiting Review"
          color="#C2923A"
          bgColor="#FBF4E4"
        />
        <StatCard
          icon={<RotateCw size={22} />}
          value={stats?.inProgress ?? 0}
          label="Actively in Progress"
          color="#DA6E35"
          bgColor="#FDF0E7"
        />
        <StatCard
          icon={<ShieldCheck size={22} />}
          value={stats?.resolved ?? 0}
          label="Successfully Resolved"
          color="#2E9952"
          bgColor="#EAF6EE"
        />
      </div>

      {/* Nearby Active Reports Section */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px', margin: 0 }}>
              Nearby Active Reports
            </h2>
            <p style={{ fontSize: 13.5, color: '#64748B', marginTop: 4, margin: '4px 0 0' }}>
              Browse recently reported civic issues in your area.
            </p>
          </div>
        </div>

        {loadingNearby ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
            ))}
          </div>
        ) : nearby.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', borderRadius: 18 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: '#EAF1F8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Sparkles size={24} color="#3B6B99" />
            </div>
            <p style={{ color: '#1E293B', fontSize: 15, fontWeight: 600 }}>No active issues reported nearby</p>
            <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
              Your neighborhood is in great shape! Report any new issues whenever you spot them.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
            {nearby.map((c) => (
              <div
                key={c._id}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 18,
                  background: '#FFFFFF',
                  border: '1px solid #E5EFEB',
                }}
                onClick={() => setSelectedId(c._id)}
              >
                {/* Image Thumbnail */}
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.title}
                    style={{ width: '100%', height: 210, objectFit: 'cover', borderBottom: '1px solid #E5EFEB' }}
                  />
                ) : (
                  <div style={{
                    height: 180,
                    background: '#E8F2EF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #E5EFEB',
                  }}>
                    <ImageIcon size={32} color="#5A8F8B" />
                  </div>
                )}

                <div style={{ padding: '16px 18px' }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                    <span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#111827', marginBottom: 4, letterSpacing: '-0.2px' }}>
                    {truncate(c.title, 45)}
                  </h3>

                  {/* Category / Department */}
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#4B5563', marginBottom: 10 }}>
                    {c.category || c.department || 'Civic Issue'}
                  </p>

                  {/* Footer metadata */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 10,
                    borderTop: '1px solid #F0F4F2',
                    fontSize: 11.5,
                    color: '#64748B',
                  }}>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: 0, whiteSpace: 'nowrap' }}>
                      {c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy') : 'Recent'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                        <MapPin size={11} color="#5A8F8B" />
                        {typeof c.distanceKm === 'number' ? formatDistanceKm(c.distanceKm) : '0m away'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3.5, whiteSpace: 'nowrap' }}>
                        <ThumbsUp size={11} color="#5A8F8B" />
                        {c.support_count || 0}
                      </span>
                    </div>
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
