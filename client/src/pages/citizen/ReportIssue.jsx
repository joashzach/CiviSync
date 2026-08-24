import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Sparkles, CheckCircle2, LocateFixed,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import ImageUpload from '../../components/ImageUpload';
import DuplicateModal from '../../components/DuplicateModal';
import { analyzeImage } from '../../api/ai';
import { createComplaint, checkDuplicates } from '../../api/complaints';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserLocation } from '../../lib/location';

const CATEGORIES = [
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const DEFAULT_FORM = {
  title: '', description: '', category: '', severity: '',
};

/** Custom pin icon for location marker */
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#011410;border:3px solid #FAFAF7;
    box-shadow:0 2px 10px rgba(0,0,0,0.35);
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
  const [aiDone, setAiDone]         = useState(false);
  const [form, setForm]             = useState(DEFAULT_FORM);
  const [location, setLocation]     = useState(null);
  const [locating, setLocating]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate]   = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => { detectLocation(); }, []);
  useEffect(() => { if (imageUrl) runAIAnalysis(imageUrl); }, [imageUrl]);

  const detectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      setLocation(loc);
    } catch {
      setLocation({ lat: 12.9716, lng: 77.5946 });
    } finally {
      setLocating(false);
    }
  };

  const runAIAnalysis = async (url) => {
    setAnalyzing(true);
    setAiDone(false);
    try {
      const result = await analyzeImage(url);
      setForm({
        title: result.title || '',
        description: result.description || '',
        category: result.category || '',
        severity: result.severity || '',
      });
      setAiDone(true);
      toast.success('AI analysis complete! Review and submit.');
    } catch {
      toast.error('AI analysis failed. Please fill in the form manually.');
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
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Report an Issue</h1>
        <p className="page-subtitle">
          Upload a photo — our AI will auto-fill the details for you.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="report-issue-grid">
          {/* ── Left Column ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Image Upload */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: '#1C1C1E', letterSpacing: '-0.1px' }}>
                Issue Photo
              </h3>
              <ImageUpload
                onUploaded={(url) => setImageUrl(url)}
                onClear={() => { setImageUrl(''); setAiDone(false); setForm(DEFAULT_FORM); }}
              />
            </div>

            {/* AI Status */}
            {imageUrl && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {analyzing ? (
                    <>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2.5px solid #E8E5DE', borderTopColor: '#011410',
                        animation: 'spin 0.7s linear infinite', flexShrink: 0,
                      }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>Analysing with AI...</p>
                        <p style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>Detecting category &amp; severity</p>
                      </div>
                    </>
                  ) : aiDone ? (
                    <>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DFF0D8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={17} color="#011410" />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#011410' }}>AI Analysis Complete</p>
                        <p style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>Form auto-filled. Review before submitting.</p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Map — Location Picker */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1C1E' }}>Issue Location</h3>
                  <p style={{ fontSize: 11.5, color: '#6B6B6B', marginTop: 2 }}>
                    Default is your current location. Click map or drag pin to change.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={detectLocation}
                  disabled={locating}
                >
                  <LocateFixed size={12} />
                  {locating ? 'Locating...' : 'My Location'}
                </button>
              </div>

              <div style={{ height: 'clamp(180px, 35vw, 240px)', borderRadius: 10, overflow: 'hidden', border: '1px solid #E8E5DE', zIndex: 0 }}>
                {location ? (
                  <MapContainer
                    center={[location.lat, location.lng]}
                    zoom={15}
                    style={{ width: '100%', height: '100%' }}
                    scrollWheelZoom
                    preferCanvas
                    attributionControl={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FlyTo position={location} />
                    <ClickHandler onMapClick={setLocation} />
                    <LocationMarker position={location} onChange={setLocation} />
                  </MapContainer>
                ) : (
                  <div style={{
                    height: '100%', background: '#DFF0D8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 8,
                  }}>
                    <MapPin size={22} color="#4A7A44" />
                    <p style={{ fontSize: 13, color: '#6B6B6B' }}>
                      {locating ? 'Detecting location...' : 'Location not available'}
                    </p>
                  </div>
                )}
              </div>

              {location && (
                <p style={{ fontSize: 11.5, color: '#6B6B6B', marginTop: 8 }}>
                  📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)} — Click map or drag pin to adjust
                </p>
              )}
            </div>
          </div>

          {/* ── Right Column ──────────────────────────────────────────────── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#DFF0D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={15} color="#011410" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.1px' }}>
                Complaint Details
              </h3>
              {aiDone && (
                <span style={{
                  fontSize: 11, background: '#DFF0D8', color: '#011410',
                  padding: '2px 9px', borderRadius: 100, fontWeight: 600,
                  border: '1px solid rgba(26,58,10,0.2)',
                }}>
                  AI Filled
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {/* Title */}
              <div>
                <label className="label">Complaint Title *</label>
                <input
                  className="input"
                  placeholder="Brief description of the issue"
                  value={form.title}
                  onChange={update('title')}
                  required
                />
              </div>

              {/* Category & Severity */}
              <div className="report-issue-form-row">
                <div>
                  <label className="label">Category *</label>
                  <select className="input" value={form.category} onChange={update('category')} required>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Severity *</label>
                  <select className="input" value={form.severity} onChange={update('severity')} required>
                    <option value="">Select severity</option>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description *</label>
                <textarea
                  className="input"
                  placeholder="Describe the issue in detail..."
                  value={form.description}
                  onChange={update('description')}
                  required
                  rows={5}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 6 }}
                disabled={submitting || !imageUrl || !location}
              >
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>

              {!imageUrl && (
                <p style={{ fontSize: 12, color: '#6B6B6B', textAlign: 'center' }}>
                  Upload an image to enable submission
                </p>
              )}
            </div>
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
