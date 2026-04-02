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
          <p style={{ color: '#888', marginBottom: 16 }}>Check that your Supabase environment variables are set correctly in Vercel.</p>
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

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* Public marketplace route — no auth needed */}
        <Route path="/market/:token" element={<PublicTractorPage />} />
        <Route path="/marketplace" element={<MarketplacePage isPublic={true} />} />

        {/* Auth */}
        <Route path="/login" element={session ? <Navigate to="/" /> : <LoginPage />} />

        {/* Protected internal app */}
        <Route path="/" element={session ? <Layout session={session} /> : <Navigate to="/login" />}>
          <Route index element={<TractorsPage />} />
          <Route path="tractors/:id" element={<TractorDetailPage />} />
          <Route path="brokers" element={<BrokersPage />} />
          <Route path="dealers" element={<DealersPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
