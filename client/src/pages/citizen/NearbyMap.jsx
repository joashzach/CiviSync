import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, ThumbsUp } from 'lucide-react';
import { getAllForMap } from '../../api/complaints';
import { getMarkerColor, truncate, getStatusBadgeClass } from '../../lib/utils';
import ComplaintDrawer from '../../components/ComplaintDrawer';

import { getCurrentUserLocation } from '../../lib/location';

const BENGALURU = { lat: 12.9716, lng: 77.5946 };

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
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <MapPin size={32} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading map...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }} className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Nearby Map</h1>
        <p className="page-subtitle">
          {complaints.length} active complaints in your city. Click a marker for details.
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { status: 'Pending', color: '#D97706' },
          { status: 'Assigned', color: '#2563EB' },
          { status: 'In Progress', color: '#7C3AED' },
          { status: 'Resolved', color: '#16A34A' },
        ].map(({ status, color }) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
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
            <Marker
              key={c._id}
              position={{ lat: c.latitude, lng: c.longitude }}
              onClick={() => setSelected(c)}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: getMarkerColor(c.status),
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
                scale: hoverId === c._id ? 13 : 9,
              }}
              onMouseOver={() => setHoverId(c._id)}
              onMouseOut={() => setHoverId(null)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div style={{ maxWidth: 220, fontFamily: 'Poppins, sans-serif' }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#0F172A' }}>
                  {truncate(selected.title, 50)}
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: '#EFF6FF', color: '#2563EB', fontWeight: 500,
                  }}>
                    {selected.status}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{selected.category}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                  <ThumbsUp size={11} /> {selected.support_count} supporters
                </div>
                <button
                  onClick={() => { setDrawerOpen(selected._id); setSelected(null); }}
                  style={{
                    background: '#2563EB', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '6px 12px', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', width: '100%',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  View Details
                </button>
              </div>
            </InfoWindow>
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
