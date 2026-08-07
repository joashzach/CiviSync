export default function LoadingSpinner({ fullScreen = true, size = 36 }) {
  const spinner = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2.5px solid #E8E5DE`,
        borderTopColor: '#011410',
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
        background: '#F7F5F0',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {spinner}
        <p style={{ color: '#6B6B6B', fontSize: 13, fontWeight: 500, fontFamily: "'Poppins', sans-serif" }}>
          Loading CiviSync...
        </p>
      </div>
    </div>
  );
}
