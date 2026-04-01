import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TractorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="3.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="9.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 8h3l2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="13.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const PeopleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const StoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="8" width="14" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4 8V5a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const MarketIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2h12l-1.5 7H3.5L2 2z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="5.5" cy="13.5" r="1" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="11.5" cy="13.5" r="1" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

export default function Layout({ session }) {
  const navigate = useNavigate();
  const email = session?.user?.email || '';
  const initials = email.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🚜 TractorXchange</h1>
          <p>Exchange Manager</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <TractorIcon /> Tractors
          </NavLink>
          <NavLink to="/brokers" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <PeopleIcon /> Brokers
          </NavLink>
          <NavLink to="/dealers" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <StoreIcon /> Dealers
          </NavLink>
          <a href="/marketplace" target="_blank" rel="noreferrer" className="nav-link">
            <MarketIcon /> Marketplace ↗
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="flex flex-center gap-8" style={{ marginBottom: 8 }}>
            <div className="avatar av-green">{initials}</div>
            <div className="sidebar-user"><strong>{email}</strong>Internal Team</div>
          </div>
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
