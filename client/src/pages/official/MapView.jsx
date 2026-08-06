import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, ThumbsUp } from 'lucide-react';
import { getAllForMap } from '../../api/complaints';
import { getMarkerColor, truncate } from '../../lib/utils';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import { getCurrentUserLocation } from '../../lib/location';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

const DEPARTMENTS = [
  '',
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
];
const CATEGORIES = DEPARTMENTS;

export default function OfficialMapView() {
  const { profile } = useAuth();
  const assignedDept = profile?.department || null;

  const [complaints, setComplaints] = useState([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    getCurrentUserLocation().then((loc) => {
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        setCenter(loc);
      }
    }).catch(() => {});
  }, []);

  const fetchComplaints = () => {
    const params = {};
    if (categoryFilter) params.category = categoryFilter;
    if (departmentFilter) params.department = departmentFilter;
    // Backend enforces department scoping for officials automatically
    getAllForMap(params).then(setComplaints).catch(() => {});
  };

  useEffect(() => { fetchComplaints(); }, [categoryFilter, departmentFilter]);

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <MapPin size={32} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading map...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }} className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">Map View</h1>
          {assignedDept && (
            <span style={{
              background: '#EFF6FF', color: '#2563EB',
              fontSize: 12, fontWeight: 600, padding: '4px 12px',
              borderRadius: 100, border: '1px solid #BFDBFE',
            }}>
              {assignedDept}
            </span>
          )}
        </div>
        <p className="page-subtitle">
          {complaints.length} complaints on the map
          {assignedDept ? ` for ${assignedDept}` : ''}
        </p>
      </div>

      {/* Filter / Legend Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
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
              <div style={{ maxWidth: 240, fontFamily: 'Poppins, sans-serif' }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#0F172A' }}>
                  {truncate(selected.title, 50)}
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 100,
                    background: '#EFF6FF', color: '#2563EB', fontWeight: 500,
                  }}>{selected.status}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{selected.category}</span>
                </div>
                <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                  {selected.department}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748B', marginBottom: 10 }}>
                  <ThumbsUp size={11} /> {selected.support_count} supporters
                </div>
                <button
                  onClick={() => { setDrawerOpen(selected._id); setSelected(null); }}
                  style={{
                    background: '#0F172A', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '7px 12px', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', width: '100%',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Open & Update Status
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
          onUpdated={fetchComplaints}
        />
      )}
    </div>
  );
}
