import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import AppNavbar from './components/Navbar';
import Footer from './components/Footer';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MarketplacePage from './pages/MarketplacePage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import PricesPage from './pages/PricesPage';
import WeatherPage from './pages/WeatherPage';
import TipsPage from './pages/TipsPage';
import MessagesPage from './pages/MessagesPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AIDashboardPage from './pages/AIDashboardPage';
import BlockchainPage from './pages/BlockchainPage';
import SecurityConfigPage from './pages/SecurityConfigPage';

// Protected route guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

// Admin route guard
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

// Page layout wrapper (includes navbar + footer)
const Layout = ({ children, noFooter }) => (
  <>
    <AppNavbar />
    <main style={{ minHeight: 'calc(100vh - 140px)' }}>{children}</main>
    {!noFooter && <Footer />}
  </>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/marketplace" element={<Layout><MarketplacePage /></Layout>} />
      <Route path="/listings/:id" element={<Layout><ListingDetailPage /></Layout>} />
      <Route path="/prices" element={<Layout><PricesPage /></Layout>} />
      <Route path="/weather" element={<Layout><WeatherPage /></Layout>} />
      <Route path="/tips" element={<Layout><TipsPage /></Layout>} />
      <Route path="/ai-dashboard" element={<Layout><AIDashboardPage /></Layout>} />
      <Route path="/blockchain" element={<Layout><BlockchainPage /></Layout>} />

      {/* Protected */}
      <Route path="/listings/new" element={<ProtectedRoute><Layout><CreateListingPage /></Layout></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Layout noFooter><MessagesPage /></Layout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />

      {/* Admin & Security Domain */}
      <Route path="/admin" element={<AdminRoute><Layout><AdminPage /></Layout></AdminRoute>} />
      <Route path="/security-config" element={<AdminRoute><Layout><SecurityConfigPage /></Layout></AdminRoute>} />

      {/* 404 */}
      <Route path="*" element={
        <Layout>
          <div style={{ textAlign: 'center', padding: '8rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🌾</div>
            <h2 style={{ color: 'var(--text-secondary)' }}>Page Not Found</h2>
            <p>This field is empty. Let's go back to the marketplace.</p>
            <a href="/" className="btn-ag-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Go Home</a>
          </div>
        </Layout>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <ToastContainer
          position="bottom-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="dark"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
