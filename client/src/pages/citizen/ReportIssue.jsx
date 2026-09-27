import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import ImageUpload from '../../components/ImageUpload';
import DuplicateModal from '../../components/DuplicateModal';
import { analyzeImage } from '../../api/ai';
import { createComplaint, checkDuplicates } from '../../api/complaints';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUserLocation,
  getCachedLocation,
  subscribeToLocationUpdates,
  DEFAULT_LOC,
} from '../../lib/location';

const CATEGORIES = [
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
];
const SEVERITIES = ['Low', 'Medium', 'High'];

const DEFAULT_FORM = {
  title: '', description: '', category: '', severity: 'Medium',
};

/** Custom pin icon for location marker */
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#161E1D;border:3px solid #FFFFFF;
    box-shadow:0 2px 10px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Click anywhere on the map to reposition the marker */
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Fly to new location when detected after mount */
function FlyTo({ position }) {
  const map = useMap();
  const lastPos = useRef(null);
  useEffect(() => {
    if (!position) return;
    const key = `${position.lat},${position.lng}`;
    if (key !== lastPos.current) {
      lastPos.current = key;
      map.flyTo([position.lat, position.lng], 15, { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
}

/** Draggable location marker */
function LocationMarker({ position, onChange }) {
  const markerRef = useRef(null);
  if (!position) return null;
  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const { lat, lng } = m.getLatLng();
            onChange({ lat, lng });
          }
        },
      }}
    />
  );
}

export default function ReportIssue() {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl]     = useState('');
  const [analyzing, setAnalyzing]   = useState(false);
  const [form, setForm]             = useState(DEFAULT_FORM);
  const [location, setLocation]     = useState(() => getCachedLocation() || DEFAULT_LOC);
  const [locating, setLocating]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate]   = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [address, setAddress]       = useState({ primary: '' });
  const userAdjustedRef = useRef(false);

  useEffect(() => {
    detectLocation(false);

    const unsubscribe = subscribeToLocationUpdates((loc) => {
      if (loc?.lat && loc?.lng && !userAdjustedRef.current) {
        setLocation(loc);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;
    let active = true;
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`);
        const data = await res.json();
        if (active && data?.address) {
          const a = data.address;
          const primary = [a.suburb || a.neighbourhood || a.locality || a.city_district || a.road, a.city || a.town || a.county].filter(Boolean).join(', ') || 'Selected Location';
          setAddress({ primary });
        }
      } catch (_) {
        if (active) {
          setAddress({
            primary: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
          });
        }
      }
    };
    fetchAddress();
    return () => { active = false; };
  }, [location?.lat, location?.lng]);

  const detectLocation = async (force = false) => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation({ forceGPS: force });
      if (loc?.lat && loc?.lng) {
        userAdjustedRef.current = false;
        setLocation(loc);
        if (force) toast.success('Location updated');
      }
    } catch {
      setLocation(getCachedLocation() || DEFAULT_LOC);
      if (force) toast.error('Could not detect current location');
    } finally {
      setLocating(false);
    }
  };

  const handleLocationChange = (newLoc) => {
    userAdjustedRef.current = true;
    setLocation(newLoc);
  };

  const runAIAnalysis = async (url) => {
    if (!url) {
      toast.error('Please upload an issue photo first');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeImage(url);
      let sev = result.severity || 'Medium';
      if (sev === 'Critical') sev = 'High';
      if (!SEVERITIES.includes(sev)) sev = 'Medium';
      setForm({
        title: result.title || '',
        description: result.description || '',
        category: result.category || '',
        severity: sev,
      });
      toast.success('Form filled with AI!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI analysis failed. Please fill in the form manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const submitComplaint = async () => {
    setSubmitting(true);
    try {
      await createComplaint({
        ...form,
        department: form.category,
        image_url: imageUrl,
        latitude: location.lat,
        longitude: location.lng,
      });
      toast.success('Complaint submitted successfully!');
      navigate('/citizen/complaints');
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrl)  { toast.error('Please upload an image'); return; }
    if (!location)  { toast.error('Location not detected'); return; }
    if (!form.title || !form.category || !form.severity) {
      toast.error('Please fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      const duplicates = await checkDuplicates(form.category, location.lat, location.lng);
      if (duplicates?.length > 0) {
        setDuplicate(duplicates[0]);
        setShowDuplicateModal(true);
        setSubmitting(false);
        return;
      }
    } catch { /* proceed */ }
    await submitComplaint();
  };

  const handleReportAnyway    = () => { setShowDuplicateModal(false); setDuplicate(null); submitComplaint(); };
  const handleDuplicateSupported = () => { setShowDuplicateModal(false); setDuplicate(null); toast.success('Thank you for supporting the existing complaint!'); navigate('/citizen'); };
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="report-layout animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="report-header">
        <span className="report-eyebrow">NEW COMPLAINT</span>
        <h1 className="report-title">Report an issue</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Card 1: Issue Photo ───────────────────────────────── */}
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Issue photo</h3>
          </div>
          <ImageUpload
            onUploaded={(url) => setImageUrl(url)}
            onClear={() => setImageUrl('')}
          />
        </div>

        {/* ── Card 2: Issue Location (Second) ───────────────────── */}
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Issue location</h3>
            <button
              type="button"
              className="btn-header-action"
              onClick={() => detectLocation(true)}
              disabled={locating}
            >
              {locating ? (
                <>
                  <div className="btn-spinner" />
                  <span>Locating...</span>
                </>
              ) : (
                <span>My location</span>
              )}
            </button>
          </div>

          <div style={{ height: 210, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', zIndex: 0 }}>
            {location ? (
              <MapContainer
                center={[location.lat, location.lng]}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom
                preferCanvas
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FlyTo position={location} />
                <ClickHandler onMapClick={handleLocationChange} />
                <LocationMarker position={location} onChange={handleLocationChange} />
              </MapContainer>
            ) : (
              <div style={{
                height: '100%', background: '#F4F8F7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {locating ? 'Detecting location...' : 'Location not available'}
                </p>
              </div>
            )}
          </div>

          {address.primary && (
            <div className="location-address-box">
              <span className="location-address-label">DETECTED LOCATION</span>
              <p className="location-primary-text">{address.primary}</p>
            </div>
          )}
        </div>

        {/* ── Card 3: Complaint Details (Third) ─────────────────── */}
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Complaint details</h3>
            <button
              type="button"
              className="btn-header-action"
              onClick={() => runAIAnalysis(imageUrl)}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <div className="btn-spinner" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Fill with AI</span>
              )}
            </button>
          </div>

          {/* Title */}
          <div className="report-field">
            <label className="report-label">TITLE</label>
            <input
              className="report-input"
              placeholder="Brief description of the issue"
              value={form.title}
              onChange={update('title')}
              required
            />
          </div>

          {/* Category */}
          <div className="report-field">
            <label className="report-label">CATEGORY</label>
            <select className="report-input" value={form.category} onChange={update('category')} required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Severity (Segmented Buttons) */}
          <div className="report-field">
            <label className="report-label">SEVERITY</label>
            <div className="severity-group">
              {SEVERITIES.map((s) => {
                const isSelected = form.severity === s;
                const activeClass = isSelected ? `active-${s.toLowerCase()}` : '';
                return (
                  <button
                    key={s}
                    type="button"
                    className={`severity-btn ${activeClass}`}
                    onClick={() => setForm((prev) => ({ ...prev, severity: s }))}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="report-field">
            <label className="report-label">DESCRIPTION</label>
            <textarea
              className="report-input"
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={update('description')}
              required
              rows={4}
            />
          </div>

          {/* Submit Complaint CTA */}
          <div className="report-submit-row">
            <button
              type="submit"
              className="btn-submit-complaint"
              disabled={submitting || !imageUrl || !location}
            >
              {submitting ? (
                <>
                  <div className="btn-spinner" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit complaint</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {showDuplicateModal && duplicate && (
        <DuplicateModal
          duplicate={duplicate}
          onSupported={handleDuplicateSupported}
          onReportAnyway={handleReportAnyway}
          onClose={() => { setShowDuplicateModal(false); setDuplicate(null); }}
        />
      )}
    </div>
  );
}
