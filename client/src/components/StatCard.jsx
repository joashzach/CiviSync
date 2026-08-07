export default function StatCard({ icon, value, label, color = '#011410', bgColor = '#DFF0D8' }) {
  return (
    <div className="card stat-card card-hover animate-slide-up">
      <div className="stat-icon" style={{ background: bgColor }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
