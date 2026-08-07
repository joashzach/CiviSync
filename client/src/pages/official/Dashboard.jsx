import { useState, useEffect } from 'react';
import {
  FileText, Clock, Briefcase, Zap, CheckCircle2,
  Search, ChevronLeft, ChevronRight, Trash2,
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
const STATUSES = ['', 'Pending', 'Assigned', 'In Progress', 'Resolved'];

export default function OfficialDashboard() {
  const { profile } = useAuth();
  const assignedDept = profile?.department || null;

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
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
    };
    getComplaints(params)
      .then((data) => {
        setComplaints(data.complaints);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComplaints(); }, [page, sort, statusFilter, departmentFilter]);

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
              background: '#DFF0D8', color: '#011410',
              fontSize: 12, fontWeight: 600, padding: '4px 12px',
              borderRadius: 100, border: '1px solid rgba(26,58,10,0.2)',
            }}>
              {assignedDept}
            </span>
          )}
        </div>
        <p className="page-subtitle">
          {assignedDept
            ? `Showing complaints assigned to ${assignedDept}`
            : 'Manage and resolve civic complaints across all departments'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon={<FileText size={18} />}    value={stats?.total}      label="Total"       color="#011410" bgColor="#DFF0D8" />
        <StatCard icon={<Clock size={18} />}       value={stats?.pending}    label="Pending"     color="#D97706" bgColor="#FEF3C7" />
        <StatCard icon={<Briefcase size={18} />}   value={stats?.assigned}   label="Assigned"    color="#2563EB" bgColor="#DBEAFE" />
        <StatCard icon={<Zap size={18} />}         value={stats?.inProgress} label="In Progress" color="#7C3AED" bgColor="#EDE9FE" />
        <StatCard icon={<CheckCircle2 size={18} />} value={stats?.resolved}  label="Resolved"    color="#16A34A" bgColor="#DCFCE7" />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1', minWidth: 200, position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: '#6B6B6B',
            }} />
            <input
              className="input"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 155 }}>
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
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('support_count')}
                >
                  Supporters {sort.includes('support_count') ? (sort.startsWith('-') ? '↓' : '↑') : ''}
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('created_at')}
                >
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
                        <div className="skeleton" style={{ height: 14, borderRadius: 5, width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6B6B6B' }}>
                    No complaints found
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c._id} onClick={() => setSelectedId(c._id)}>
                    <td style={{ fontWeight: 600, color: '#1C1C1E' }}>{truncate(c.title, 45)}</td>
                    <td style={{ color: '#3A3A3C' }}>{c.category}</td>
                    <td style={{ color: '#6B6B6B', fontSize: 12 }}>{c.department}</td>
                    <td><span className={getSeverityBadgeClass(c.severity)}>{c.severity}</span></td>
                    <td><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                    <td style={{ color: '#3A3A3C', fontWeight: 500 }}>{c.support_count}</td>
                    <td style={{ color: '#6B6B6B', fontSize: 12 }}>
                      {format(new Date(c.created_at), 'dd MMM yyyy')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, c._id, c.title)}
                        title="Delete complaint"
                        style={{
                          background: 'transparent', border: 'none',
                          color: '#6B6B6B', cursor: 'pointer', padding: 6,
                          borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#9B3B3B'; e.currentTarget.style.background = '#F9ECEC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#6B6B6B'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Trash2 size={14} />
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
            padding: '12px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid #E8E5DE',
          }}>
            <span style={{ fontSize: 13, color: '#6B6B6B' }}>
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500, color: '#3A3A3C' }}>
                {page}/{totalPages}
              </span>
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
