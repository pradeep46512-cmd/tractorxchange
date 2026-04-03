import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout.jsx';
import TractorsPage from './pages/TractorsPage.jsx';
import TractorDetailPage from './pages/TractorDetailPage.jsx';
import BrokersPage from './pages/BrokersPage.jsx';
import DealersPage from './pages/DealersPage.jsx';
import EnquiriesPage from './pages/EnquiriesPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import PublicTractorPage from './pages/PublicTractorPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 12, textAlign: 'left', overflow: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer' }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Extract role from user metadata
// Admin: no role set, or app_role = 'admin'
// Field Agent: app_role = 'field_agent'
function getRole(session) {
  if (!session) return null;
  const meta = session.user?.user_metadata || {};
  return meta.app_role === 'field_agent' ? 'field_agent' : 'admin';
}

// Guard: redirect field agents away from admin-only pages
function AdminRoute({ role, children }) {
  if (role === 'field_agent') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="app-loading"><div className="spinner" /><span>Loading...</span></div>;

  const role = getRole(session);

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/market/:token" element={<PublicTractorPage />} />
        <Route path="/marketplace" element={<MarketplacePage isPublic={true} />} />

        {/* Auth */}
        <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />

        {/* Protected */}
        <Route path="/" element={session ? <Layout session={session} role={role} /> : <Navigate to="/login" />}>
          <Route index element={<TractorsPage role={role} userId={session?.user?.id} />} />
          <Route path="tractors/:id" element={<TractorDetailPage role={role} />} />

          {/* Admin-only pages */}
          <Route path="brokers" element={<AdminRoute role={role}><BrokersPage /></AdminRoute>} />
          <Route path="dealers" element={<AdminRoute role={role}><DealersPage /></AdminRoute>} />
          <Route path="enquiries" element={<AdminRoute role={role}><EnquiriesPage /></AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
