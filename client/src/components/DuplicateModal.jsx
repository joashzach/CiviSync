import { useState } from 'react';
import {
  AlertTriangle, ThumbsUp, MapPin, X, Users, FileText,
} from 'lucide-react';
import { toggleSupport } from '../api/complaints';
import { getStatusBadgeClass } from '../lib/utils';
import toast from 'react-hot-toast';

/**
 * DuplicateModal — shown when a near-duplicate complaint is detected.
 */
export default function DuplicateModal({ duplicate, onSupported, onReportAnyway, onClose }) {
  const [supporting, setSupporting] = useState(false);

  if (!duplicate) return null;

  const handleSupport = async () => {
    setSupporting(true);
    try {
      const res = await toggleSupport(duplicate._id);
      if (res.supported) {
        toast.success('You are now supporting this complaint!');
      } else {
        toast.success('Support added!');
      }
      onSupported?.();
    } catch {
      toast.error('Failed to add support. Please try again.');
    } finally {
      setSupporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#F7EDE6', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={17} color="#C17D5A" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.2px' }}>
                Similar Complaint Found
              </h3>
              <p style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
                An active complaint already exists nearby
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F7F5F0', border: '1px solid #E8E5DE',
              borderRadius: 7, width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={15} color="#6B6B6B" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="duplicate-card">
            {duplicate.image_url && (
              <img
                src={duplicate.image_url}
                alt={duplicate.title}
                className="duplicate-card-image"
              />
            )}

            <div className="duplicate-card-body">
              <h4 style={{ fontSize: 14.5, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.4 }}>
                {duplicate.title}
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={getStatusBadgeClass(duplicate.status)}>
                  {duplicate.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div className="duplicate-meta">
                  <MapPin size={12} />
                  <span>{duplicate.latitude.toFixed(4)}, {duplicate.longitude.toFixed(4)}</span>
                </div>
                <div className="supporter-pill">
                  <Users size={12} />
                  <span>{duplicate.support_count} supporter{duplicate.support_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <p style={{
            fontSize: 13, color: '#3A3A3C', lineHeight: 1.65,
            marginTop: 16, textAlign: 'center',
          }}>
            Supporting an existing complaint increases its priority and helps officials respond faster.
          </p>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleSupport}
            disabled={supporting}
          >
            <ThumbsUp size={17} />
            {supporting ? 'Adding Support...' : 'Support Existing Complaint'}
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={onReportAnyway}
          >
            <FileText size={15} />
            Report Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
