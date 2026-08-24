import { useEffect, useState } from 'react';
import {
  X, MapPin, Tag, Building2, AlertTriangle, Calendar,
  ThumbsUp, User, ExternalLink, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
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
        {/* Mobile drag handle */}
        <div style={{
          display: 'flex', justifyContent: 'center', padding: '10px 0 4px',
          flexShrink: 0,
        }} className="drawer-handle-wrap">
          <div style={{
            width: 36, height: 4, borderRadius: 100,
            background: 'var(--border-strong)',
          }} />
        </div>

        {/* Header */}
        <div className="drawer-header">
          <h2 style={{ fontSize: 15.5, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.2px' }}>
            Complaint Details
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canDelete && !loading && complaint && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete complaint"
                style={{
                  background: '#F9ECEC', border: '1px solid rgba(155,59,59,0.2)',
                  color: '#9B3B3B', borderRadius: 7, height: 30, padding: '0 10px',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: '#F7F5F0', border: '1px solid #E8E5DE',
                borderRadius: 7, width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={15} color="#6B6B6B" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading ? (
            <DrawerSkeleton />
          ) : !complaint ? (
            <p style={{ color: '#6B6B6B', textAlign: 'center', marginTop: 40, fontSize: 14 }}>
              Complaint not found
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Delete Confirmation */}
              {confirmDelete && (
                <div style={{
                  background: '#F9ECEC', border: '1px solid rgba(155,59,59,0.2)', borderRadius: 12,
                  padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
                  animation: 'fadeIn 0.18s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7a2e2e', fontWeight: 600, fontSize: 14 }}>
                    <AlertTriangle size={17} /> Delete this complaint?
                  </div>
                  <p style={{ fontSize: 13, color: '#5a2020', margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to delete <strong>"{complaint.title}"</strong>? This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Cancel
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
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
                    borderRadius: 12, border: '1px solid #E8E5DE',
                  }}
                />
              )}

              {/* Title & Badges */}
              <div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#1C1C1E', marginBottom: 10, letterSpacing: '-0.2px' }}>
                  {complaint.title}
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={getStatusBadgeClass(complaint.status)}>{complaint.status}</span>
                  <span className={getSeverityBadgeClass(complaint.severity)}>{complaint.severity}</span>
                </div>
              </div>

              {/* Meta info */}
              <div style={{
                background: '#F7F5F0', border: '1px solid #E8E5DE', borderRadius: 12, padding: 16,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <InfoRow icon={<Tag size={14} />} label="Category" value={complaint.category} />
                <InfoRow icon={<Building2 size={14} />} label="Department" value={complaint.department} />
                <InfoRow icon={<Calendar size={14} />} label="Reported" value={format(new Date(complaint.created_at), 'dd MMM yyyy, h:mm a')} />
                <InfoRow icon={<ThumbsUp size={14} />} label="Supporters" value={`${complaint.support_count} citizen${complaint.support_count !== 1 ? 's' : ''}`} />
                {complaint.created_by?.email && (
                  <InfoRow icon={<User size={14} />} label="Reported by" value={complaint.created_by.email} />
                )}
              </div>

              {/* Description */}
              <div>
                <p className="label" style={{ marginBottom: 8 }}>Description</p>
                <p style={{ fontSize: 13.5, color: '#3A3A3C', lineHeight: 1.75 }}>
                  {complaint.description}
                </p>
              </div>

              {/* Official: Status Update */}
              {isOfficial && (
                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Update Status</p>
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
                  {updatingStatus && (
                    <p style={{ fontSize: 12, color: '#6B6B6B', marginTop: 6 }}>Updating status...</p>
                  )}
                </div>
              )}

              {/* Map */}
              {complaint.latitude && complaint.longitude && (
                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Location</p>
                  <div style={{ height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid #E8E5DE', zIndex: 0 }}>
                    <MapContainer
                      center={[complaint.latitude, complaint.longitude]}
                      zoom={15}
                      style={{ width: '100%', height: 200 }}
                      scrollWheelZoom={false}
                      dragging={false}
                      zoomControl={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <CircleMarker
                        center={[complaint.latitude, complaint.longitude]}
                        radius={10}
                        pathOptions={{
                          color: '#fff',
                          weight: 2.5,
                          fillColor: getMarkerColor(complaint.status),
                          fillOpacity: 1,
                        }}
                      />
                    </MapContainer>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}&zoom=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      marginTop: 9, fontSize: 13, color: '#011410',
                      textDecoration: 'none', fontWeight: 500,
                    }}
                  >
                    <MapPin size={13} /> Open in OpenStreetMap <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="label" style={{ marginBottom: 12 }}>Status Timeline</p>
                <div className="timeline">
                  <TimelineItem label="Reported" date={complaint.created_at} active />
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
              <ThumbsUp size={17} />
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
      <span style={{ color: '#4A7A44', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 11.5, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}: </span>
        <span style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>{value}</span>
      </div>
    </div>
  );
}

function TimelineItem({ label, date, active }) {
  return (
    <div className="timeline-item">
      <div className="timeline-dot" style={{ background: active ? '#011410' : '#E8E5DE' }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#1C1C1E' : '#6B6B6B' }}>
        {label}
      </p>
      {date && (
        <p style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
          {format(new Date(date), 'dd MMM yyyy, h:mm a')}
        </p>
      )}
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="skeleton" style={{ height: 200, width: '100%' }} />
      <div className="skeleton" style={{ height: 22, width: '70%' }} />
      <div className="skeleton" style={{ height: 16, width: '40%' }} />
      <div className="skeleton" style={{ height: 80, width: '100%' }} />
      <div className="skeleton" style={{ height: 200, width: '100%' }} />
    </div>
  );
}
