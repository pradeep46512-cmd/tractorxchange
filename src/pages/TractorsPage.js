import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTractors, deleteTractor } from '../lib/supabase';
import TractorModal from '../components/TractorModal';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';

export default function TractorsPage() {
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
                    <button className="btn btn-sm btn-wa" onClick={e => shareWA(e, t)}>💬 WhatsApp</button>
                    <button className="btn btn-sm" onClick={e => copyLink(e, t)}>🔗 Link</button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }} onClick={e => handleDelete(e, t.id)}>✕</button>
                  </div>
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
