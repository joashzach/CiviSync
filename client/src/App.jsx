import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Citizen
import CitizenLayout from './layouts/CitizenLayout';
import CitizenDashboard from './pages/citizen/Dashboard';
import ReportIssue from './pages/citizen/ReportIssue';
import MyComplaints from './pages/citizen/MyComplaints';
import NearbyMap from './pages/citizen/NearbyMap';

// Official
import OfficialLayout from './layouts/OfficialLayout';
import OfficialDashboard from './pages/official/Dashboard';
import OfficialMapView from './pages/official/MapView';

function RoleRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={profile?.role === 'official' ? '/official' : '/citizen'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<RoleRedirect />} />

      {/* Citizen */}
      <Route
        path="/citizen"
        element={
          <ProtectedRoute role="citizen">
            <CitizenLayout>
              <CitizenDashboard />
            </CitizenLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/report"
        element={
          <ProtectedRoute role="citizen">
            <CitizenLayout>
              <ReportIssue />
            </CitizenLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/complaints"
        element={
          <ProtectedRoute role="citizen">
            <CitizenLayout>
              <MyComplaints />
            </CitizenLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/map"
        element={
          <ProtectedRoute role="citizen">
            <CitizenLayout>
              <NearbyMap />
            </CitizenLayout>
          </ProtectedRoute>
        }
      />

      {/* Official */}
      <Route
        path="/official"
        element={
          <ProtectedRoute role="official">
            <OfficialLayout>
              <OfficialDashboard />
            </OfficialLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/official/map"
        element={
          <ProtectedRoute role="official">
            <OfficialLayout>
              <OfficialMapView />
            </OfficialLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
