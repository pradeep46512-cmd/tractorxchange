import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Sidebar icons (small, 16px)
const TractorIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="3.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="9.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 8h3l2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="13.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const PeopleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const StoreIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="8" width="14" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4 8V5a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const MarketIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 2h12l-1.5 7H3.5L2 2z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="5.5" cy="13.5" r="1" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="11.5" cy="13.5" r="1" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const EnquiryIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <line x1="9" y1="10" x2="15" y2="10"/>
    <line x1="9" y1="14" x2="13" y2="14"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🚜 TractorXchange</h1>
          <p>Exchange Manager</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <TractorIcon size={16} /> Tractors
          </NavLink>
          <NavLink to="/brokers" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <PeopleIcon size={16} /> Brokers
          </NavLink>
          <NavLink to="/dealers" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <StoreIcon size={16} /> Dealers
          </NavLink>
          <NavLink to="/enquiries" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <EnquiryIcon size={16} /> Enquiries
          </NavLink>
          <a href="/marketplace" target="_blank" rel="noreferrer" className="nav-link">
            <MarketIcon size={16} /> Marketplace ↗
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

      {/* ── Main content ── */}
      <main className="main-area">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav bar ── */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
          <TractorIcon size={22} />
          <span>Tractors</span>
        </NavLink>
        <NavLink to="/brokers" className={({ isActive }) => isActive ? 'active' : ''}>
          <PeopleIcon size={22} />
          <span>Brokers</span>
        </NavLink>
        <NavLink to="/enquiries" className={({ isActive }) => isActive ? 'active' : ''}>
          <EnquiryIcon size={22} />
          <span>Enquiries</span>
        </NavLink>
        <NavLink to="/dealers" className={({ isActive }) => isActive ? 'active' : ''}>
          <StoreIcon size={22} />
          <span>Dealers</span>
        </NavLink>
        <a href="/marketplace" target="_blank" rel="noreferrer">
          <MarketIcon size={22} />
          <span>Market</span>
        </a>
      </nav>

    </div>
  );
}
