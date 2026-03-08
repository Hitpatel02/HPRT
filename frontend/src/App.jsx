/**
 * App.jsx — Phase 5 update (sidebar layout)
 * - Lazy-loaded routes (code splitting)
 * - ToastContainer configured
 * - Sidebar replaces top navbar
 * - design-system.css imported
 */
import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/design-system.css';
import './css/App.css';
import Sidebar from './components/Sidebar';
import Spinner from './components/ui/Spinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// ── Lazy-loaded route components ──────────────────────────────────────────
const Login            = lazy(() => import('./pages/Login'));
const Dashboard        = lazy(() => import('./components/Dashboard'));
const ReportPage       = lazy(() => import('./components/ReportPage'));
const ClientList       = lazy(() => import('./components/ClientList'));
const ClientDocuments  = lazy(() => import('./components/ClientDocuments'));
const ClientEdit       = lazy(() => import('./components/ClientEdit'));
const ReminderSettings = lazy(() => import('./components/ReminderSettings'));
const DocumentStatus   = lazy(() => import('./components/DocumentStatus'));
const SubmissionPage   = lazy(() => import('./components/SubmissionPage'));
const UserManagement   = lazy(() => import('./pages/UserManagement'));
const CommunicationLogs = lazy(() => import('./components/CommunicationLogs'));
const WhatsAppSettings = lazy(() => import('./pages/WhatsAppSettings'));
const AgreementPage    = lazy(() => import('./pages/AgreementPage'));

// ── Lazy route fallback ───────────────────────────────────────────────────
function RouteLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Spinner size="lg" label="Loading…" center />
    </div>
  );
}

import {
  selectToken,
  selectLastPath,
  selectInitialDataLoaded,
  setLastPath,
  verifyAuth,
} from './redux/authSlice';

// ── Protected route helper ────────────────────────────────────────────────
function Protected({ token, children }) {
  return token ? children : <Navigate to="/login" replace />;
}

// ── Mobile top bar (shown on small screens) ──────────────────────────────────
function MobileTopbar({ onToggle }) {
  return (
    <div className="mobile-topbar">
      <button className="mobile-topbar__toggle" onClick={onToggle} aria-label="Open navigation">
        <i className="bi bi-list" />
      </button>
      <Link to="/" className="mobile-topbar__brand">HPRT</Link>
    </div>
  );
}

function App() {
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile top bar — only rendered on small screens via CSS */}
      <MobileTopbar onToggle={() => setMobileOpen((v) => !v)} />

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main content */}
      <div
        className={`app-shell__content ${collapsed ? 'app-shell__content--collapsed' : ''}`}
      >
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={4500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          borderRadius: 'var(--radius-md)',
          fontFamily:   'var(--font-sans)',
          fontSize:     'var(--text-sm)',
          boxShadow:    'var(--shadow-md)',
        }}
      />
    </div>
  );
}

function AppRoutes() {
  const token              = useSelector(selectToken);
  const lastPath           = useSelector(selectLastPath);
  const initialDataLoaded  = useSelector(selectInitialDataLoaded);
  const dispatch           = useDispatch();
  const location           = useLocation();
  const navigate           = useNavigate();
  const [initializing, setInitializing] = useState(true);

  // Track current path for restoring on reload/login
  useEffect(() => {
    if (token && location.pathname !== '/login') {
      dispatch(setLastPath(location.pathname));
    }
  }, [token, location.pathname, dispatch]);

  // Verify auth on mount
  useEffect(() => {
    const verify = async () => {
      if (location.pathname === '/login' || !token) {
        setInitializing(false);
        return;
      }
      try {
        await dispatch(verifyAuth()).unwrap();
      } finally {
        setInitializing(false);
      }
    };
    verify();
  }, [token, dispatch, location.pathname]);

  // Redirect to last path after login
  useEffect(() => {
    if (token && initialDataLoaded && location.pathname === '/login') {
      navigate(lastPath);
    }
  }, [token, initialDataLoaded, lastPath, location.pathname, navigate]);

  if (initializing) {
    return <RouteLoader />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"          element={<Protected token={token}><Dashboard /></Protected>} />
      <Route path="/reports"   element={<Protected token={token}><ReportPage /></Protected>} />
      <Route path="/status"    element={<Protected token={token}><DocumentStatus /></Protected>} />
      <Route path="/submission" element={<Protected token={token}><SubmissionPage /></Protected>} />
      <Route path="/clients"   element={<Protected token={token}><ClientList /></Protected>} />
      <Route path="/client/:clientId/documents" element={<Protected token={token}><ClientDocuments /></Protected>} />
      <Route path="/client/:clientId/edit"      element={<Protected token={token}><ClientEdit /></Protected>} />
      <Route path="/settings"  element={<Protected token={token}><ReminderSettings /></Protected>} />
      <Route path="/users"     element={<Protected token={token}><UserManagement /></Protected>} />
      <Route path="/logs"      element={<Protected token={token}><CommunicationLogs /></Protected>} />
      <Route path="/whatsapp"  element={<Protected token={token}><WhatsAppSettings /></Protected>} />
      <Route path="/agreements" element={<Protected token={token}><AgreementPage /></Protected>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
