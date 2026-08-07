import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { MapPin, ThumbsUp } from 'lucide-react';
import { getAllForMap } from '../../api/complaints';
import { getMarkerColor, truncate, getStatusBadgeClass } from '../../lib/utils';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import { getCurrentUserLocation } from '../../lib/location';

const BENGALURU = { lat: 12.9716, lng: 77.5946 };

const STATUS_LEGEND = [
  { status: 'Pending',     color: '#D97706' },
  { status: 'Assigned',   color: '#2563EB' },
  { status: 'In Progress', color: '#7C3AED' },
  { status: 'Resolved',   color: '#16A34A' },
];

export default function NearbyMap() {
  const [complaints, setComplaints] = useState([]);
  const [center, setCenter] = useState(BENGALURU);
  const [selected, setSelected] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    getAllForMap().then(setComplaints).catch(() => {});
    getCurrentUserLocation().then(setCenter);
  }, []);

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#DFF0D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin size={22} color="#011410" />
        </div>
        <p style={{ color: '#6B6B6B', fontSize: 14, fontWeight: 500 }}>Loading map...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }} className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: 14 }}>
        <h1 className="page-title">Nearby Map</h1>
        <p className="page-subtitle">
          {complaints.length} active complaints in your city. Click a marker for details.
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
      <div className="map-container" style={{ flex: 1 }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={12}
          options={{ disableDefaultUI: false, zoomControl: true, streetViewControl: false }}
        >
          {complaints.map((c) => (
            <MarkerF
              key={c._id}
              position={{ lat: c.latitude, lng: c.longitude }}
              onClick={() => setSelected(c)}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: getMarkerColor(c.status),
                fillOpacity: 1,
                strokeColor: '#FAFAF7',
                strokeWeight: 2.5,
                scale: hoverId === c._id ? 13 : 9,
              }}
              onMouseOver={() => setHoverId(c._id)}
              onMouseOut={() => setHoverId(null)}
            />
          ))}

          {selected && (
            <InfoWindowF
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div style={{ maxWidth: 220, fontFamily: "'Poppins', sans-serif", padding: '2px 0' }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 7, color: '#1C1C1E', letterSpacing: '-0.1px' }}>
                  {truncate(selected.title, 50)}
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: '#DFF0D8', color: '#011410', fontWeight: 600,
                    border: '1px solid rgba(26,58,10,0.2)',
                  }}>
                    {selected.status}
                  </span>
                  <span style={{ fontSize: 11, color: '#6B6B6B', alignSelf: 'center' }}>{selected.category}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6B6B6B', marginBottom: 10 }}>
                  <ThumbsUp size={11} /> {selected.support_count} supporters
                </div>
                <button
                  onClick={() => { setDrawerOpen(selected._id); setSelected(null); }}
                  style={{
                    background: '#011410', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '7px 12px', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', width: '100%',
                    fontFamily: "'Poppins', sans-serif",
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#000806'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#011410'; }}
                >
                  View Details
                </button>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>

      {drawerOpen && (
        <ComplaintDrawer
          complaintId={drawerOpen}
          onClose={() => setDrawerOpen(null)}
        />
      )}
    </div>
  );
}
