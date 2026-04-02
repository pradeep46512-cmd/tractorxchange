import React, { useState, useEffect } from 'react';
import { getTractors } from '../lib/supabase';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : 'Price on request';

export default function MarketplacePage() {
  const [tractors, setTractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('All');

  useEffect(() => {
    getTractors()
      .then(data => setTractors(data.filter(t => t.status !== 'Sold')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tractors.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || `${t.make} ${t.model} ${t.location_text}`.toLowerCase().includes(q);
    const matchC = filterCondition === 'All' || t.condition === filterCondition;
    return matchQ && matchC;
  });

  const enquiryWA = (t) => {
    const url = `${window.location.origin}/market/${t.share_token}`;
    const msg = `Hi, I am interested in buying this tractor.\n\n🚜 *${t.make} ${t.model}* (${t.year})\n📍 ${t.location_text}\n💰 ${PRICE_FMT(t.expected_price)}\n\n${url}`;
    window.open('https://wa.me/917518767671?text=' + encodeURIComponent(msg), '_blank');
  };

  const shareTractor = (t) => {
    const url = `${window.location.origin}/market/${t.share_token}`;
    const shareData = {
      title: `${t.make} ${t.model} (${t.year})`,
      text: `${t.make} ${t.model} (${t.year}) — ${PRICE_FMT(t.expected_price)} — 📍 ${t.location_text}`,
      url,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)' }}>
      <div className="public-header">
        <span style={{ fontSize:28 }}>🚜</span>
        <div>
          <h1>TractorXchange Marketplace</h1>
          <p>Certified exchange tractors — verified & ready for sale</p>
        </div>
      </div>

      <div className="public-content">
        {/* Filters */}
        <div className="flex flex-center gap-8" style={{ marginBottom:20, flexWrap:'wrap' }}>
          <input className="search-input" style={{ width:260 }} placeholder="Search by make, model, location…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width:160 }} value={filterCondition} onChange={e => setFilterCondition(e.target.value)}>
            <option value="All">All Conditions</option>
            {['Excellent','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
          </select>
          <span className="text-muted text-sm">{filtered.length} tractor{filtered.length !== 1 ? 's' : ''} available</span>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin:'0 auto 12px' }} /><p>Loading…</p></div>
        ) : (
          <div className="tractor-grid">
            {filtered.map(t => (
              <div key={t.id} className="tractor-card">
                <div className="tcard-photo">
                  {t.cover_photo ? <img src={t.cover_photo} alt="" /> : <span className="tcard-photo-placeholder">🚜</span>}
                  <span className={`status-badge status-${t.status}`}>{t.status}</span>
                </div>
                <div className="tcard-body">
                  <div className="tcard-name">{t.make} {t.model}</div>
                  <div className="tcard-meta">{t.year} · {t.hours_used}{t.engine_hp ? ' · ' + t.engine_hp + ' HP' : ''}</div>
                  <div className="tcard-meta">📍 {t.location_text}</div>
                  {t.condition && <div style={{ marginBottom:6 }}><span className="tag tag-blue">{t.condition}</span></div>}
                  <div className="tcard-price">{PRICE_FMT(t.expected_price)}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                    <a href={`/market/${t.share_token}`} className="btn" style={{ justifyContent:'center' }}>
                      View Details
                    </a>
                    <button className="btn btn-call" style={{ justifyContent:'center' }} onClick={() => window.open('tel:+917518767671','_self')}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      Enquiry Call
                    </button>
                    <button className="btn btn-wa" style={{ justifyContent:'center' }} onClick={() => enquiryWA(t)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                      Enquiry on WhatsApp
                    </button>
                    <button className="btn" style={{ justifyContent:'center' }} onClick={() => shareTractor(t)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share This Tractor
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="empty-state" style={{ gridColumn:'1/-1' }}><p>No tractors match your search.</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
