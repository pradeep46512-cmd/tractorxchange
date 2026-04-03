import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTractors, deleteTractor } from '../lib/supabase';
import TractorModal from '../components/TractorModal';
import { exportTractorsToExcel } from '../lib/exportToExcel';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';

export default function TractorsPage({ role, userId }) {
  const [tractors, setTractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { setTractors(await getTractors()); }
    catch (e) { alert('Error loading tractors: ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tractors.filter(t => {
    if (role === 'field_agent' && t.owner_id !== userId) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${t.make} ${t.model} ${t.location_text}`.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this tractor?')) return;
    try { await deleteTractor(id); load(); }
    catch (err) { alert(err.message); }
  };

  const shareWA = (e, t) => {
    e.stopPropagation();
    const url = `${window.location.origin}/market/${t.share_token}`;
    const msg = `🚜 *${t.make} ${t.model}* (${t.year})\n📍 ${t.location_text}\n⏱ ${t.hours_used}\n💰 ${PRICE_FMT(t.expected_price)}\n\n🔗 ${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  const copyLink = (e, t) => {
    e.stopPropagation();
    const url = `${window.location.origin}/market/${t.share_token}`;
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
  };

  return (
    <>
      <div className="topbar">
        <h2>Exchange Tractors</h2>
        <div className="topbar-actions">
          <input className="search-input" placeholder="Search by model or location…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option>All</option>
            <option>Available</option>
            <option>Pending</option>
            <option>Sold</option>
          </select>
          <button className="btn" onClick={() => exportTractorsToExcel(tractors)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Tractor</button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 12px' }} /><p>Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No tractors found.</p></div>
        ) : (
          <div className="tractor-grid">
            {filtered.map(t => (
              <div key={t.id} className="tractor-card" onClick={() => navigate(`/tractors/${t.id}`)}>
                <div className="tcard-photo">
                  {t.cover_photo
                    ? <img src={t.cover_photo} alt={t.model} />
                    : <span className="tcard-photo-placeholder">🚜</span>}
                  <span className={`status-badge status-${t.status}`}>{t.status}</span>
                </div>
                <div className="tcard-body">
                  <div className="tcard-name">{t.make} {t.model}</div>
                  <div className="tcard-meta">{t.year} · {t.hours_used} · {t.engine_hp ? t.engine_hp + ' HP · ' : ''}{t.location_text}</div>
                  <div className="tcard-price">{PRICE_FMT(t.expected_price)}</div>
                  <div className="tcard-actions">
                    <button className="btn btn-sm btn-wa" onClick={e => shareWA(e, t)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> WhatsApp</button>
                    <button className="btn btn-sm" onClick={e => copyLink(e, t)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Link</button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }} onClick={e => handleDelete(e, t.id)}>✕</button>
                  </div>
                  {t.tractor_brokers?.length > 0 && t.tractor_brokers[0]?.brokers?.phone && (
                    <div style={{ marginTop: 6 }}>
                      <a
                        className="btn btn-sm btn-call"
                        style={{ width: '100%', justifyContent: 'center' }}
                        href={'tel:' + t.tractor_brokers[0].brokers.phone}
                        onClick={e => e.stopPropagation()}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> Call: {t.tractor_brokers[0].brokers.name}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <TractorModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}
