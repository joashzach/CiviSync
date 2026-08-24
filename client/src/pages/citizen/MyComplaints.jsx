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

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };

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
            style={{
              padding: '7px 16px',
              borderRadius: 100,
              border: '1.5px solid',
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: filter === f ? '#011410' : '#FFFFFF',
              color: filter === f ? '#FFFFFF' : '#4B5563',
              borderColor: filter === f ? '#011410' : '#E5EFEB',
              boxShadow: filter === f ? '0 2px 8px rgba(1, 20, 16, 0.2)' : 'none',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 260, borderRadius: 18 }} />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', borderRadius: 18, background: '#fff' }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16, background: '#EAF1F8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <FileText size={24} color="#3B6B99" />
          </div>
          <p style={{ color: '#111827', fontWeight: 700, marginBottom: 6, fontSize: 16 }}>
            No reports found
          </p>
          <p style={{ color: '#64748B', fontSize: 13.5 }}>
            {filter !== 'All' ? `No ${filter.toLowerCase()} complaints found in your records.` : 'You haven\'t submitted any complaints yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {complaints.map((c) => (
            <div
              key={c._id}
              className="card card-hover"
              style={{
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: 18,
                background: '#FFFFFF',
                border: '1px solid #E5EFEB',
              }}
              onClick={() => setSelectedId(c._id)}
            >
              {/* Image */}
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.title}
                  style={{ width: '100%', height: 210, objectFit: 'cover', borderBottom: '1px solid #E5EFEB' }}
                />
              ) : (
                <div style={{
                  height: 180, background: '#E8F2EF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid #E5EFEB',
                }}>
                  <ImageIcon size={32} color="#5A8F8B" />
                </div>
              )}

              <div style={{ padding: '16px 18px' }}>
                {/* Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                  <span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span>
                </div>

                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#111827', marginBottom: 4, letterSpacing: '-0.2px' }}>
                  {truncate(c.title, 45)}
                </h3>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#4B5563', marginBottom: 10 }}>{c.category || c.department || 'Civic Issue'}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F0F4F2' }}>
                  <p style={{ fontSize: 11.5, color: '#64748B' }}>
                    {format(new Date(c.created_at), 'dd MMM yyyy')}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, c._id, c.title)}
                    title="Delete complaint"
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#94A3B8', cursor: 'pointer', padding: 5,
                      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#C24A35'; e.currentTarget.style.background = '#FDEEE9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={13} />
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
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#6B6B6B', fontWeight: 500 }}>
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
