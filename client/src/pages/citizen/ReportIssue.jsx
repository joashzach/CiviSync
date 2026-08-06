import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Sparkles, CheckCircle2, AlertCircle, ChevronRight, LocateFixed,
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import ImageUpload from '../../components/ImageUpload';
import DuplicateModal from '../../components/DuplicateModal';
import { analyzeImage } from '../../api/ai';
import { createComplaint, checkDuplicates } from '../../api/complaints';
import { getMarkerColor } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserLocation } from '../../lib/location';

const DEPARTMENTS = [
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
];
const CATEGORIES = DEPARTMENTS;
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const DEFAULT_FORM = {
  title: '', description: '', category: '', department: '', severity: '',
};

export default function ReportIssue() {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Auto-trigger AI analysis when image is uploaded
  useEffect(() => {
    if (imageUrl) {
      runAIAnalysis(imageUrl);
    }
  }, [imageUrl]);

  const detectLocation = async () => {
    setLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      setLocation(loc);
    } catch (err) {
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
        department: result.department || '',
        severity: result.severity || '',
      });
      setAiDone(true);
      toast.success('AI analysis complete! Review and submit.');
    } catch (err) {
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
        image_url: imageUrl,
        latitude: location.lat,
        longitude: location.lng,
      });
      toast.success('Complaint submitted successfully!');
      navigate('/citizen/complaints');
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrl) { toast.error('Please upload an image'); return; }
    if (!location) { toast.error('Location not detected'); return; }
    if (!form.title || !form.category || !form.department || !form.severity) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for nearby duplicates before submitting
    setSubmitting(true);
    try {
      const duplicates = await checkDuplicates(form.category, location.lat, location.lng);
      if (duplicates && duplicates.length > 0) {
        setDuplicate(duplicates[0]);
        setShowDuplicateModal(true);
        setSubmitting(false);
        return;
      }
    } catch {
      // If check fails, proceed with normal submission
    }

    await submitComplaint();
  };

  const handleReportAnyway = () => {
    setShowDuplicateModal(false);
    setDuplicate(null);
    submitComplaint();
  };

  const handleDuplicateSupported = () => {
    setShowDuplicateModal(false);
    setDuplicate(null);
    toast.success('Thank you for supporting the existing complaint!');
    navigate('/citizen');
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleMapClick = (e) => {
    if (e && e.latLng) {
      setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  const handleMarkerDragEnd = (e) => {
    if (e && e.latLng) {
      setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Report an Issue</h1>
        <p className="page-subtitle">
          Upload a photo — our AI will auto-fill the details for you.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* ── Left Column ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Image Upload */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>
                Issue Photo
              </h3>
              <ImageUpload
                onUploaded={(url) => setImageUrl(url)}
                onClear={() => { setImageUrl(''); setAiDone(false); setForm(DEFAULT_FORM); }}
              />
            </div>

            {/* AI Status */}
            {imageUrl && (
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {analyzing ? (
                    <>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2.5px solid #E2E8F0', borderTopColor: 'var(--primary)',
                        animation: 'spin 0.7s linear infinite', flexShrink: 0,
                      }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          Analyzing with Gemini AI...
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Detecting category, department & severity
                        </p>
                      </div>
                    </>
                  ) : aiDone ? (
                    <>
                      <CheckCircle2 size={20} color="var(--success)" style={{ flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                          AI Analysis Complete
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Form auto-filled. Review before submitting.
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Map Preview */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Issue Location
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Default is your current location. Click map to change.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={detectLocation}
                  disabled={locating}
                >
                  <LocateFixed size={13} />
                  {locating ? 'Locating...' : 'My Location'}
                </button>
              </div>

              <div className="map-container" style={{ height: 210, borderRadius: 12, overflow: 'hidden' }}>
                {isLoaded && location ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={location}
                    zoom={15}
                    onClick={handleMapClick}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                  >
                    <Marker
                      position={location}
                      draggable={true}
                      onDragEnd={handleMarkerDragEnd}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#2563EB',
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 3,
                        scale: 10,
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <div style={{
                    height: '100%', background: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 8,
                  }}>
                    <MapPin size={24} color="var(--text-muted)" />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {locating ? 'Detecting location...' : 'Location not available'}
                    </p>
                  </div>
                )}
              </div>

              {location && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  📍 Pin: {location.lat.toFixed(4)}, {location.lng.toFixed(4)} (Click map or drag pin to adjust)
                </p>
              )}
            </div>
          </div>

          {/* ── Right Column ─────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Sparkles size={16} color="var(--primary)" />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Complaint Details
              </h3>
              {aiDone && (
                <span style={{
                  fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)',
                  padding: '2px 8px', borderRadius: 100, fontWeight: 500,
                }}>
                  AI Filled
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

              {/* Category & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

              {/* Department */}
              <div>
                <label className="label">Responsible Department *</label>
                <select className="input" value={form.department} onChange={update('department')} required>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
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
                style={{ width: '100%', marginTop: 4 }}
                disabled={submitting || !imageUrl || !location}
              >
                {submitting ? 'Submitting...' : 'Submit Complaint'}
                {!submitting && <ChevronRight size={16} />}
              </button>

              {!imageUrl && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
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
