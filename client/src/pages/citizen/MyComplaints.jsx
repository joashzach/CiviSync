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
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              border: '1.5px solid',
              fontFamily: "'Poppins', sans-serif",
              fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: filter === f ? '#011410' : '#FAFAF7',
              color: filter === f ? '#fff' : '#3A3A3C',
              borderColor: filter === f ? '#011410' : '#E8E5DE',
            }}
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
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#DFF0D8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <FileText size={24} color="#011410" />
          </div>
          <p style={{ color: '#1C1C1E', fontWeight: 600, marginBottom: 6, fontSize: 15 }}>
            No complaints found
          </p>
          <p style={{ color: '#6B6B6B', fontSize: 13 }}>
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
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderBottom: '1px solid #E8E5DE' }}
                />
              ) : (
                <div style={{
                  height: 160, background: '#E8EDDA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid #E8E5DE',
                }}>
                  <ImageIcon size={28} color="#4A7A44" />
                </div>
              )}

              <div style={{ padding: '14px 16px' }}>
                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
                  <span className={getStatusBadgeClass(c.status)}>{c.status}</span>
                  <span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span>
                </div>

                <h3 style={{ fontSize: 13.5, fontWeight: 600, color: '#1C1C1E', marginBottom: 4, letterSpacing: '-0.1px' }}>
                  {truncate(c.title, 55)}
                </h3>
                <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 3 }}>{c.category}</p>
                <p style={{ fontSize: 12, color: '#6B6B6B' }}>{c.department}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #E8E5DE' }}>
                  <p style={{ fontSize: 11.5, color: '#6B6B6B' }}>
                    {format(new Date(c.created_at), 'dd MMM yyyy')}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, c._id, c.title)}
                    title="Delete complaint"
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#6B6B6B', cursor: 'pointer', padding: 4,
                      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9B3B3B'; e.currentTarget.style.background = '#F9ECEC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#6B6B6B'; e.currentTarget.style.background = 'transparent'; }}
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
