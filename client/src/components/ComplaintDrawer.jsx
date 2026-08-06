import { useEffect, useState } from 'react';
import {
  X, MapPin, Tag, Building2, AlertTriangle, Calendar,
  ThumbsUp, User, ExternalLink, ChevronDown, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { getComplaint, toggleSupport, updateComplaintStatus, deleteComplaint } from '../api/complaints';
import { getStatusBadgeClass, getSeverityBadgeClass, getMarkerColor } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved'];

export default function ComplaintDrawer({ complaintId, onClose, onUpdated }) {
  const { profile } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supporting, setSupporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    if (!complaintId) return;
    setLoading(true);
    getComplaint(complaintId)
      .then(setComplaint)
      .catch(() => toast.error('Failed to load complaint'))
      .finally(() => setLoading(false));
  }, [complaintId]);

  const handleSupport = async () => {
    if (supporting) return;
    setSupporting(true);
    try {
      const res = await toggleSupport(complaintId);
      setComplaint((c) => ({ ...c, support_count: res.support_count }));
      toast.success(res.supported ? 'Support added!' : 'Support removed');
      onUpdated?.();
    } catch {
      toast.error('Failed to update support');
    } finally {
      setSupporting(false);
    }
  };

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true);
    try {
      const updated = await updateComplaintStatus(complaintId, status);
      setComplaint(updated);
      toast.success(`Status updated to "${status}"`);
      onUpdated?.();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isOfficial = profile?.role === 'official';
  const isOwner = complaint?.created_by?._id === profile?._id || complaint?.created_by === profile?._id;
  const canDelete = isOwner || isOfficial;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteComplaint(complaintId);
      toast.success('Complaint deleted successfully');
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete complaint');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Complaint Details
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canDelete && !loading && complaint && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete complaint"
                style={{
                  background: '#FEF2F2', border: '1px solid #FCA5A5',
                  color: '#DC2626', borderRadius: 8, height: 32, padding: '0 10px',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading ? (
            <DrawerSkeleton />
          ) : !complaint ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
              Complaint not found
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Delete Confirmation Box */}
              {confirmDelete && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
                  padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
                  animation: 'fadeIn 0.2s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 600, fontSize: 14 }}>
                    <AlertTriangle size={18} /> Delete this complaint?
                  </div>
                  <p style={{ fontSize: 13, color: '#7F1D1D', margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to delete <strong>"{complaint.title}"</strong>? This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              )}

              {/* Image */}
              {complaint.image_url && (
                <img
                  src={complaint.image_url}
                  alt={complaint.title}
                  style={{
                    width: '100%', aspectRatio: '16/9', objectFit: 'cover',
                    borderRadius: 12, border: '1px solid var(--border)',
                  }}
                />
              )}

              {/* Title & Badges */}
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                  {complaint.title}
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={getStatusBadgeClass(complaint.status)}>{complaint.status}</span>
                  <span className={getSeverityBadgeClass(complaint.severity)}>{complaint.severity}</span>
                </div>
              </div>

              {/* Meta info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow icon={<Tag size={15} />} label="Category" value={complaint.category} />
                <InfoRow icon={<Building2 size={15} />} label="Department" value={complaint.department} />
                <InfoRow
                  icon={<Calendar size={15} />}
                  label="Reported"
                  value={format(new Date(complaint.created_at), 'dd MMM yyyy, h:mm a')}
                />
                <InfoRow
                  icon={<ThumbsUp size={15} />}
                  label="Supporters"
                  value={`${complaint.support_count} citizen${complaint.support_count !== 1 ? 's' : ''}`}
                />
                {complaint.created_by?.email && (
                  <InfoRow icon={<User size={15} />} label="Reported by" value={complaint.created_by.email} />
                )}
              </div>

              {/* Description */}
              <div>
                <p className="label">Description</p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {complaint.description}
                </p>
              </div>

              {/* Official: Status Update */}
              {isOfficial && (
                <div>
                  <p className="label">Update Status</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <select
                        className="input"
                        value={complaint.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    {updatingStatus && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Updating status...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Map */}
              {complaint.latitude && complaint.longitude && isLoaded && (
                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Location</p>
                  <div className="map-container" style={{ height: 200 }}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: complaint.latitude, lng: complaint.longitude }}
                      zoom={15}
                      options={{ disableDefaultUI: true, zoomControl: true }}
                    >
                      <MarkerF
                        position={{ lat: complaint.latitude, lng: complaint.longitude }}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          fillColor: getMarkerColor(complaint.status),
                          fillOpacity: 1,
                          strokeColor: '#fff',
                          strokeWeight: 2,
                          scale: 10,
                        }}
                      />
                    </GoogleMap>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      marginTop: 8, fontSize: 13, color: 'var(--primary)',
                      textDecoration: 'none', fontWeight: 500,
                    }}
                  >
                    <MapPin size={13} /> Open in Google Maps <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="label" style={{ marginBottom: 12 }}>Status Timeline</p>
                <div className="timeline">
                  <TimelineItem
                    label="Reported"
                    date={complaint.created_at}
                    active
                  />
                  {complaint.status !== 'Pending' && (
                    <TimelineItem label="Assigned to Department" date={complaint.updated_at} active />
                  )}
                  {(complaint.status === 'In Progress' || complaint.status === 'Resolved') && (
                    <TimelineItem label="Work In Progress" date={complaint.updated_at} active />
                  )}
                  {complaint.status === 'Resolved' && (
                    <TimelineItem label="Issue Resolved" date={complaint.updated_at} active isLast />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — citizen support button */}
        {!isOfficial && complaint && (
          <div className="drawer-footer">
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleSupport}
              disabled={supporting}
            >
              <ThumbsUp size={18} />
              {supporting ? 'Updating...' : `Support this Complaint · ${complaint?.support_count ?? 0}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}: </span>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
      </div>
    </div>
  );
}

function TimelineItem({ label, date, active, isLast }) {
  return (
    <div className="timeline-item">
      <div
        className="timeline-dot"
        style={{ background: active ? 'var(--primary)' : 'var(--border)' }}
      />
      <p style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
      </p>
      {date && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {format(new Date(date), 'dd MMM yyyy, h:mm a')}
        </p>
      )}
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 200, width: '100%' }} />
      <div className="skeleton" style={{ height: 24, width: '70%' }} />
      <div className="skeleton" style={{ height: 16, width: '40%' }} />
      <div className="skeleton" style={{ height: 80, width: '100%' }} />
      <div className="skeleton" style={{ height: 200, width: '100%' }} />
    </div>
  );
}
