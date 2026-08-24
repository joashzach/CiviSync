import { useState, useEffect, Component } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { ThumbsUp, LocateFixed, AlertCircle } from 'lucide-react';
import { getAllForMap } from '../../api/complaints';
import { getMarkerColor, getStatusBadgeClass, truncate } from '../../lib/utils';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import {
  getCurrentUserLocation,
  getCachedLocation,
  subscribeToLocationUpdates,
  DEFAULT_CENTER,
} from '../../lib/location';

/** Error boundary — prevents a Leaflet crash from blanking the whole page */
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 40,
            background: '#FEF2F2',
            borderRadius: 18,
            border: '1px solid #FECACA',
            minHeight: 300,
          }}
        >
          <AlertCircle size={32} color="#DC2626" />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#991B1B' }}>Map failed to load</p>
          <p style={{ fontSize: 13, color: '#B91C1C' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 18px',
              background: '#011410',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** True when the device has a coarse primary pointer (touch screen) */
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

/** Smoothly pans the map when user location is resolved */
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.flyTo(position, 14, { animate: true, duration: 1.2 });
    }
  }, [position, map]);
  return null;
}

export default function NearbyMap() {
  const [complaints, setComplaints] = useState([]);
  const [center, setCenter]         = useState(() => {
    const c = getCachedLocation();
    return c?.lat && c?.lng ? [c.lat, c.lng] : DEFAULT_CENTER;
  });
  const [userLoc, setUserLoc]       = useState(() => getCachedLocation());
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [locating, setLocating]     = useState(false);

  useEffect(() => {
    getAllForMap().then(setComplaints).catch(() => {});

    // Listen to live location updates across components
    const unsubscribe = subscribeToLocationUpdates((loc) => {
      if (loc?.lat && loc?.lng) {
        setUserLoc(loc);
        setCenter([loc.lat, loc.lng]);
      }
    });

    // Detect actual location on mount
    detectLoc(false);

    return () => unsubscribe();
  }, []);

  const detectLoc = async (force = false) => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation({ forceGPS: force });
      if (loc?.lat && loc?.lng) {
        setUserLoc(loc);
        setCenter([loc.lat, loc.lng]);
      }
    } catch (_) {}
    finally {
      setLocating(false);
    }
  };

  return (
    <MapErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }} className="animate-fade-in">
        <div className="page-header" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 className="page-title">Live City Map</h1>
              <p className="page-subtitle">
                {complaints.length} civic reports recorded. Click any marker for details.
              </p>
            </div>
          </div>
        </div>

        {/* Legend & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {STATUS_LEGEND.map(({ status, color }) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#374151', fontWeight: 500 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                {status}
              </div>
            ))}
          </div>
          <button
            onClick={() => detectLoc(true)}
            disabled={locating}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              borderColor: '#E5EFEB',
              borderRadius: 100,
              padding: '5px 14px',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <LocateFixed size={14} color="#5A8F8B" />
            {locating ? 'Locating...' : 'My Location'}
          </button>
        </div>

        {/* Map */}
        <div className="map-full" style={{ height: 520, borderRadius: 18, overflow: 'hidden', border: '1px solid #E5EFEB', position: 'relative', zIndex: 0, boxShadow: '0 4px 20px -2px rgba(28, 48, 44, 0.06)' }}>
          <MapContainer
            center={center}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={!isTouch()}
            preferCanvas
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo position={center} />

            {/* User's current location marker with pulsing aura */}
            {userLoc?.lat && userLoc?.lng && (
              <>
                <CircleMarker
                  center={[userLoc.lat, userLoc.lng]}
                  radius={16}
                  pathOptions={{
                    color: '#3B82F6',
                    weight: 1.5,
                    fillColor: '#60A5FA',
                    fillOpacity: 0.25,
                  }}
                />
                <CircleMarker
                  center={[userLoc.lat, userLoc.lng]}
                  radius={7}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 2.5,
                    fillColor: '#2563EB',
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12.5, fontWeight: 600, color: '#1E293B' }}>
                      📍 Your Current Location
                    </div>
                  </Popup>
                </CircleMarker>
              </>
            )}

            {/* Complaint markers */}
            {complaints.map((c) => (
              <CircleMarker
                key={c._id}
                center={[c.latitude, c.longitude]}
                radius={9}
                pathOptions={{
                  color: '#fff',
                  weight: 2.5,
                  fillColor: getMarkerColor(c.status),
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "'Poppins', sans-serif", minWidth: 190 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#1C1C1E', letterSpacing: '-0.1px' }}>
                      {truncate(c.title, 50)}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span className={getStatusBadgeClass(c.status)}>
                        {c.status}
                      </span>
                      <span style={{ fontSize: 11, color: '#6B6B6B', alignSelf: 'center' }}>{c.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6B6B6B', marginBottom: 10 }}>
                      <ThumbsUp size={11} /> {c.support_count} supporters
                    </div>
                    <button
                      onClick={() => setDrawerOpen(c._id)}
                      style={{
                        background: '#011410', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '7px 12px', fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', width: '100%',
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {drawerOpen && (
          <ComplaintDrawer
            complaintId={drawerOpen}
            onClose={() => setDrawerOpen(null)}
          />
        )}
      </div>
    </MapErrorBoundary>
  );
}

const STATUS_LEGEND = [
  { status: 'Pending',      color: '#D97706' },
  { status: 'Assigned',    color: '#2563EB' },
  { status: 'In Progress', color: '#7C3AED' },
  { status: 'Resolved',    color: '#16A34A' },
];
