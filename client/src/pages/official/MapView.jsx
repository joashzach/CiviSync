import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { MapPin, ThumbsUp } from 'lucide-react';
import { getAllForMap } from '../../api/complaints';
import { getMarkerColor, truncate } from '../../lib/utils';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import { getCurrentUserLocation } from '../../lib/location';
import { useAuth } from '../../context/AuthContext';

/** True when the device has a coarse primary pointer (touch screen) */
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

const DEFAULT_CENTER = [12.9716, 77.5946];

const STATUS_LEGEND = [
  { status: 'Pending',      color: '#D97706' },
  { status: 'Assigned',    color: '#2563EB' },
  { status: 'In Progress', color: '#7C3AED' },
  { status: 'Resolved',    color: '#16A34A' },
];

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { animate: true, duration: 1.2 });
  }, [position, map]);
  return null;
}

export default function OfficialMapView() {
  const { profile } = useAuth();
  const assignedDept = profile?.department || null;

  const [complaints, setComplaints] = useState([]);
  const [center, setCenter]         = useState(DEFAULT_CENTER);
  const [drawerOpen, setDrawerOpen] = useState(null);

  const fetchComplaints = () => {
    getAllForMap({}).then(setComplaints).catch(() => {});
  };

  useEffect(() => {
    fetchComplaints();
    getCurrentUserLocation()
      .then(loc => { if (loc?.lat && loc?.lng) setCenter([loc.lat, loc.lng]); })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }} className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">Map View</h1>
          {assignedDept && (
            <span style={{
              background: '#F7EDE6', color: '#C17D5A',
              fontSize: 12, fontWeight: 600, padding: '4px 12px',
              borderRadius: 100, border: '1px solid rgba(193,125,90,0.25)',
            }}>
              {assignedDept}
            </span>
          )}
        </div>
        <p className="page-subtitle">
          {complaints.length} complaints on the map{assignedDept ? ` for ${assignedDept}` : ''}
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_LEGEND.map(({ status, color }) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#3A3A3C', fontWeight: 500 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
            {status}
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="map-full" style={{ height: 520, borderRadius: 14, overflow: 'hidden', border: '1px solid #E8E5DE', position: 'relative', zIndex: 0 }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={!isTouch()}
          preferCanvas
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo position={center} />

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
                <div style={{ fontFamily: "'Poppins', sans-serif", minWidth: 200 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#1C1C1E', letterSpacing: '-0.1px' }}>
                    {truncate(c.title, 50)}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 100,
                      background: '#DFF0D8', color: '#011410', fontWeight: 600,
                      border: '1px solid rgba(26,58,10,0.2)',
                    }}>
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
                      background: '#1C1C1E', color: '#fff', border: 'none',
                      borderRadius: 7, padding: '7px 12px', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', width: '100%',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Open &amp; Update Status
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
          onUpdated={fetchComplaints}
        />
      )}
    </div>
  );
}
