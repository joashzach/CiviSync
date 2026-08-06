export default function LoadingSpinner({ fullScreen = true, size = 36 }) {
  const spinner = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid #E2E8F0`,
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );

  if (!fullScreen) return spinner;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {spinner}
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
          Loading CiviSync...
        </p>
      </div>
    </div>
  );
}
