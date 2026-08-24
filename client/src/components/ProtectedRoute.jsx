import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth();

  // Still initialising Firebase auth
  if (loading) return <LoadingSpinner />;

  // Not authenticated at all — send to login
  if (!user) return <Navigate to="/auth" replace />;

  // Authenticated but profile hasn't loaded from the backend yet.
  // Show spinner instead of prematurely redirecting (avoids officials
  // being sent to /citizen while the role is still resolving).
  if (!profile) return <LoadingSpinner />;

  // Role mismatch — redirect to correct dashboard
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'official' ? '/official' : '/citizen'} replace />;
  }

  return children;
}
