import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import TractorsPage from './pages/TractorsPage';
import TractorDetailPage from './pages/TractorDetailPage';
import BrokersPage from './pages/BrokersPage';
import DealersPage from './pages/DealersPage';
import EnquiriesPage from './pages/EnquiriesPage';
import MarketplacePage from './pages/MarketplacePage';
import PublicTractorPage from './pages/PublicTractorPage';
import LoginPage from './pages/LoginPage';
import './App.css';

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
  );
}
