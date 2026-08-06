import { useState } from 'react';
import {
  AlertTriangle, ThumbsUp, MapPin, X, Users, FileText,
} from 'lucide-react';
import { toggleSupport } from '../api/complaints';
import { getStatusBadgeClass } from '../lib/utils';
import toast from 'react-hot-toast';

/**
 * DuplicateModal — shown when a near-duplicate complaint is detected.
 *
 * Props:
 *  - duplicate:     The duplicate complaint object
 *  - onSupported:   Called after the user successfully supports the existing complaint
 *  - onReportAnyway: Called when user decides to file their complaint regardless
 *  - onClose:       Called to dismiss modal without action
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#FEF3C7', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={18} color="#D97706" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                Similar Complaint Found
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                An active complaint already exists nearby
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="duplicate-card">
            {/* Image */}
            {duplicate.image_url && (
              <img
                src={duplicate.image_url}
                alt={duplicate.title}
                className="duplicate-card-image"
              />
            )}

            <div className="duplicate-card-body">
              {/* Title */}
              <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {duplicate.title}
              </h4>

              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={getStatusBadgeClass(duplicate.status)}>
                  {duplicate.status}
                </span>
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div className="duplicate-meta">
                  <MapPin size={13} />
                  <span>{duplicate.latitude.toFixed(4)}, {duplicate.longitude.toFixed(4)}</span>
                </div>
                <div className="supporter-pill">
                  <Users size={13} />
                  <span>{duplicate.support_count} supporter{duplicate.support_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hint text */}
          <p style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
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
            <ThumbsUp size={18} />
            {supporting ? 'Adding Support...' : 'Support Existing Complaint'}
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={onReportAnyway}
          >
            <FileText size={16} />
            Report Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
