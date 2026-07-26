import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { ClinicProvider } from './context/ClinicContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainLayout } from './layouts/MainLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public pages
import { Home } from './pages/public/Home';
import { Services } from './pages/public/Services';
import { Doctors } from './pages/public/Doctors';
import { DoctorDetail } from './pages/public/DoctorDetail';
import { BookingPage } from './pages/public/BookingPage';
import { Contact } from './pages/public/Contact';
import { LoginRegister } from './pages/public/LoginRegister';

// Patient page
import { PatientDashboard } from './pages/patient/PatientDashboard';

// Staff pages
import { ReceptionistDashboard } from './pages/staff/ReceptionistDashboard';
import { DentistDashboard } from './pages/staff/DentistDashboard';
import { CashierDashboard } from './pages/staff/CashierDashboard';
import { ManagerDashboard } from './pages/staff/ManagerDashboard';

// Waiting Room board
import { QueueTracking } from './pages/queue-tracking/QueueTracking';
import { Icon } from './components/Icon';

// ── Route Wrappers ──

const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
      <Icon name="progress_activity" className="text-[32px] animate-spin text-primary" />
      <p className="text-sm">Đang khôi phục phiên đăng nhập...</p>
    </div>
  </div>
);

const PublicRoute: React.FC<{ component: React.ComponentType }> = ({ component: Component }) => (
  <MainLayout>
    <Component />
  </MainLayout>
);

// Protected route — kiểm tra đăng nhập VÀ đúng vai trò (role guard)
const RoleGuardRoute: React.FC<{ component: React.ComponentType; allowedRoles: UserRole[] }> = ({
  component: Component,
  allowedRoles,
}) => {
  const { isAuthenticated, isInitializing, role } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  // Chưa đăng nhập → về trang Login, ghi nhớ URL gốc
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Đăng nhập nhưng sai vai trò → về trang dashboard của vai trò hiện tại
  if (!allowedRoles.includes(role)) {
    const dest = role === 'patient' ? '/patient' : `/dashboard/${role}`;
    return <Navigate to={dest} replace />;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
};

// Redirect logged-in users away from login page
const GuestOnlyRoute: React.FC<{ component: React.ComponentType }> = ({ component: Component }) => {
  const { isAuthenticated, isInitializing, role } = useAuth();

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    const dest = role === 'patient' ? '/patient' : `/dashboard/${role}`;
    return <Navigate to={dest} replace />;
  }

  return <Component />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfirmProvider>
          <ClinicProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicRoute component={Home} />} />
              <Route path="/about" element={<PublicRoute component={AboutUs} />} />
              <Route path="/services" element={<PublicRoute component={Services} />} />
              <Route path="/doctors" element={<PublicRoute component={Doctors} />} />
              <Route path="/doctors/:id" element={<PublicRoute component={DoctorDetail} />} />
              <Route path="/contact" element={<PublicRoute component={Contact} />} />
              <Route path="/book" element={<PublicRoute component={BookingPage} />} />

              {/* Auth — redirect away if already logged in */}
              <Route path="/login" element={<GuestOnlyRoute component={LoginRegister} />} />

              {/* Waiting Room TV Board — public display screen */}
              <Route path="/queue-board" element={<QueueTracking />} />

              {/* Protected: Patient Portal */}
              <Route
                path="/patient"
                element={<RoleGuardRoute component={PatientDashboard} allowedRoles={['patient']} />}
              />

              {/* Protected: Staff Workspaces — kiểm tra đúng vai trò */}
              <Route
                path="/dashboard/receptionist"
                element={<RoleGuardRoute component={ReceptionistDashboard} allowedRoles={['receptionist', 'manager']} />}
              />
              <Route
                path="/dashboard/dentist"
                element={<RoleGuardRoute component={DentistDashboard} allowedRoles={['dentist', 'manager']} />}
              />
              <Route
                path="/dashboard/cashier"
                element={<RoleGuardRoute component={CashierDashboard} allowedRoles={['cashier', 'manager']} />}
              />
              <Route
                path="/dashboard/manager"
                element={<RoleGuardRoute component={ManagerDashboard} allowedRoles={['manager']} />}
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ClinicProvider>
      </ConfirmProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
