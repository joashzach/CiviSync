import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { getMyComplaints, deleteComplaint } from '../../api/complaints';
import { getStatusBadgeClass, getSeverityBadgeClass, truncate } from '../../lib/utils';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import toast from 'react-hot-toast';

const FILTERS = ['All', 'Pending', 'Assigned', 'In Progress', 'Resolved'];

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const LIMIT = 12;

  const fetchComplaints = (f = filter, p = page) => {
    setLoading(true);
    const params = { page: p, limit: LIMIT };
    if (f !== 'All') params.status = f;
    getMyComplaints(params)
      .then((data) => {
        setComplaints(data.complaints);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComplaints(); }, [filter, page]);

  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(1);
  };

  const handleDelete = async (e, id, title) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteComplaint(id);
      toast.success('Complaint deleted successfully');
      fetchComplaints();
    } catch {
      toast.error('Failed to delete complaint');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Complaints</h1>
        <p className="page-subtitle">{total} complaint{total !== 1 ? 's' : ''} submitted by you</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
            No complaints found
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {filter !== 'All' ? `No ${filter} complaints.` : 'Start by reporting your first issue.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {complaints.map((c) => (
            <div
              key={c._id}
              className="card card-hover"
              style={{ cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => setSelectedId(c._id)}
            >
              {/* Image */}
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.title}
                  style={{ width: '100%', height: 160, objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  height: 160, background: '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ImageIcon size={32} color="var(--text-muted)" />
                </div>
              )}

              <div style={{ padding: '14px 16px' }}>
                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                  <span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {truncate(c.title, 55)}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{c.category}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {c.department}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Reported {format(new Date(c.created_at), 'dd MMM yyyy')}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, c._id, c.title)}
                    title="Delete complaint"
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {selectedId && (
        <ComplaintDrawer
          complaintId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => fetchComplaints()}
        />
      )}
    </div>
  );
}
