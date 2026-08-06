import { useState, useEffect } from 'react';
import {
  FileText, Clock, Briefcase, Zap, CheckCircle2,
  Search, Filter, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { getStats } from '../../api/stats';
import { getComplaints, deleteComplaint } from '../../api/complaints';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';
import ComplaintDrawer from '../../components/ComplaintDrawer';
import { getStatusBadgeClass, getSeverityBadgeClass, truncate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const DEPARTMENTS = [
  '',
  'Roads & Highways',
  'Sanitation',
  'Electrical Maintenance',
  'Water & Drainage',
  'Parks & Public Spaces',
  'Town Planning & Encroachment',
  'Pollution Control',
];
const CATEGORIES = DEPARTMENTS;
const STATUSES = ['', 'Pending', 'Assigned', 'In Progress', 'Resolved'];

export default function OfficialDashboard() {
  const { profile } = useAuth();
  const assignedDept = profile?.department || null;

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('-created_at');

  const LIMIT = 10;

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const fetchComplaints = () => {
    setLoading(true);
    const params = {
      page, limit: LIMIT, sort,
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(departmentFilter && { department: departmentFilter }),
      ...(categoryFilter && { category: categoryFilter }),
    };
    getComplaints(params)
      .then((data) => {
        setComplaints(data.complaints);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComplaints(); }, [page, sort, statusFilter, departmentFilter, categoryFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchComplaints(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  const handleSort = (field) => {
    setSort((s) => s === field ? `-${field}` : field);
  };

  const handleDelete = async (e, id, title) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteComplaint(id);
      toast.success('Complaint deleted successfully');
      fetchComplaints();
      getStats().then(setStats).catch(() => {});
    } catch {
      toast.error('Failed to delete complaint');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="page-title">Official Dashboard</h1>
          {assignedDept && (
            <span style={{
              background: '#EFF6FF', color: '#2563EB',
              fontSize: 12, fontWeight: 600, padding: '4px 12px',
              borderRadius: 100, border: '1px solid #BFDBFE',
            }}>
              {assignedDept}
            </span>
          )}
        </div>
        <p className="page-subtitle">
          {assignedDept
            ? `Showing only complaints assigned to ${assignedDept}`
            : 'Manage and resolve civic complaints across all departments'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={<FileText size={20} />} value={stats?.total} label="Total" color="#2563EB" bgColor="#EFF6FF" />
        <StatCard icon={<Clock size={20} />} value={stats?.pending} label="Pending" color="#D97706" bgColor="#FFFBEB" />
        <StatCard icon={<Briefcase size={20} />} value={stats?.assigned} label="Assigned" color="#2563EB" bgColor="#EFF6FF" />
        <StatCard icon={<Zap size={20} />} value={stats?.inProgress} label="In Progress" color="#7C3AED" bgColor="#F5F3FF" />
        <StatCard icon={<CheckCircle2 size={20} />} value={stats?.resolved} label="Resolved" color="#16A34A" bgColor="#F0FDF4" />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1', minWidth: 200, position: 'relative' }}>
            <Search size={15} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)',
            }} />
            <input
              className="input"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 160 }}>
            <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Department</th>
                <th>Severity</th>
                <th>Status</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('support_count')}>
                  Supporters {sort.includes('support_count') ? (sort.startsWith('-') ? '↓' : '↑') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
                  Date {sort.includes('created_at') ? (sort.startsWith('-') ? '↓' : '↑') : ''}
                </th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 6, width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No complaints found
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c._id} onClick={() => setSelectedId(c._id)}>
                    <td style={{ fontWeight: 500 }}>{truncate(c.title, 45)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.category}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.department}</td>
                    <td><span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span></td>
                    <td><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.support_count}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {format(new Date(c.created_at), 'dd MMM yyyy')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, c._id, c.title)}
                        title="Delete complaint"
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'var(--text-muted)', cursor: 'pointer', padding: 6,
                          borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = '#FEF2F2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>{page}/{totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <ComplaintDrawer
          complaintId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => { fetchComplaints(); getStats().then(setStats).catch(() => {}); }}
        />
      )}
    </div>
  );
}
