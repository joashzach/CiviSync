export default function StatCard({ icon, value, label, color = '#3B6B99', bgColor = '#EAF1F8' }) {
  return (
    <div className="stat-card card-hover animate-slide-up">
      <div className="stat-label">{label}</div>
      <div className="stat-bottom-row">
        <div className="stat-value">{value ?? 0}</div>
        <div className="stat-icon-wrapper" style={{ background: bgColor, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
