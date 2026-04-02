import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTractors, deleteTractor } from '../lib/supabase';
import TractorModal from '../components/TractorModal.jsx';
import { exportTractorsToExcel } from '../lib/exportToExcel';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';

const WA_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
);
const LINK_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const CALL_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

// ── Photo Lightbox ─────────────────────────────────────────
function PhotoLightbox({ photo, name, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        zIndex: 200, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={photo}
          alt={name}
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '100vw', maxHeight: '90vh',
            width: 'auto', height: 'auto',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        />
        <div style={{ marginTop: 12, color: '#fff', fontSize: 13, opacity: 0.8 }}>{name} — tap outside to close</div>
      </div>
    </div>
  );
}

// ── Card View ──────────────────────────────────────────────
function CardView({ tractors, navigate, enquiryCall, enquiryWA, shareTractor, handleDelete }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      <div className="tractor-grid">
        {tractors.map(t => (
          <div key={t.id} className="tractor-card" onClick={() => navigate(`/tractors/${t.id}`)}>
            <div className="tcard-photo">
              {t.cover_photo ? (
                <img
                  src={t.cover_photo}
                  alt={t.model}
                  onClick={e => { e.stopPropagation(); setLightbox(t); }}
                  title="Click to enlarge"
                  style={{ cursor: 'zoom-in' }}
                />
              ) : (
                <span className="tcard-photo-placeholder">🚜</span>
              )}
              <span className={`status-badge status-${t.status}`}>{t.status}</span>
            </div>
            <div className="tcard-body">
              <div className="tcard-name">{t.make} {t.model}</div>
              <div className="tcard-meta">{t.year} · {t.hours_used}{t.engine_hp ? ' · ' + t.engine_hp + ' HP' : ''} · {t.location_text}</div>
              <div className="tcard-price">{PRICE_FMT(t.expected_price)}</div>
              {t.description && (
                <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 8, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {t.description}
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm btn-call" style={{ flex:1, justifyContent:'center' }} onClick={e => enquiryCall(e)}>
                    {CALL_ICON} Enquiry Call
                  </button>
                  <button className="btn btn-sm btn-danger btn-icon" style={{ flexShrink:0 }} onClick={e => handleDelete(e, t.id)}>✕</button>
                </div>
                <button className="btn btn-sm btn-wa" style={{ width:'100%', justifyContent:'center' }} onClick={e => enquiryWA(e, t)}>
                  {WA_ICON} Enquiry on WhatsApp
                </button>
                <button className="btn btn-sm" style={{ width:'100%', justifyContent:'center' }} onClick={e => shareTractor(e, t)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share This Tractor
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <PhotoLightbox
          photo={lightbox.cover_photo}
          name={`${lightbox.make} ${lightbox.model}`}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

// ── List View ──────────────────────────────────────────────
function ListView({ tractors, navigate, enquiryCall, enquiryWA, shareTractor, handleDelete }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Photo</th>
              <th>Tractor</th>
              <th>Details</th>
              <th>Price</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tractors.map(t => (
              <tr key={t.id} style={{ cursor: 'pointer' }}>
                {/* Photo thumbnail */}
                <td onClick={e => { e.stopPropagation(); t.cover_photo ? setLightbox(t) : navigate(`/tractors/${t.id}`); }}>
                  <div style={{ width: 60, height: 44, borderRadius: 6, overflow: 'hidden',
                    background: 'var(--gray-100)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, cursor: t.cover_photo ? 'zoom-in' : 'pointer' }}>
                    {t.cover_photo
                      ? <img src={t.cover_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20 }}>🚜</span>
                    }
                  </div>
                </td>

                {/* Name */}
                <td onClick={() => navigate(`/tractors/${t.id}`)}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.make} {t.model}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{t.year}</div>
                </td>

                {/* Details */}
                <td onClick={() => navigate(`/tractors/${t.id}`)}>
                  <div style={{ fontSize: 12 }}>{t.hours_used}{t.engine_hp ? ' · ' + t.engine_hp + ' HP' : ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>📍 {t.location_text}</div>
                  {t.area_office && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{t.area_office}</div>}
                  {t.rc_number && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>RC: {t.rc_number}</div>}
                </td>

                {/* Price */}
                <td onClick={() => navigate(`/tractors/${t.id}`)}>
                  <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>{PRICE_FMT(t.expected_price)}</div>
                  {t.exchange_date && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Exchanged: {new Date(t.exchange_date).toLocaleDateString('en-IN')}</div>}
                </td>

                {/* Status */}
                <td onClick={() => navigate(`/tractors/${t.id}`)}>
                  <span className={`status-badge status-${t.status}`} style={{ position: 'static', fontSize: 11, padding: '3px 8px' }}>{t.status}</span>
                </td>

                {/* Notes */}
                <td onClick={() => navigate(`/tractors/${t.id}`)}>
                  {t.description && (
                    <div style={{ fontSize: 12, color: 'var(--gray-600)', maxWidth: 180,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                      {t.description}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td>
                  <div className="flex gap-8" style={{ flexWrap: 'nowrap' }}>
                    <button className="btn btn-sm btn-call" title="Enquiry Call" onClick={e => enquiryCall(e)}>{CALL_ICON}</button>
                    <button className="btn btn-sm btn-wa" title="Enquiry on WhatsApp" onClick={e => enquiryWA(e, t)}>{WA_ICON}</button>
                    <button className="btn btn-sm" title="Share Tractor" onClick={e => shareTractor(e, t)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
                    <button className="btn btn-sm btn-danger" onClick={e => handleDelete(e, t.id)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lightbox && (
        <PhotoLightbox
          photo={lightbox.cover_photo}
          name={`${lightbox.make} ${lightbox.model}`}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

// ── View toggle icons ──────────────────────────────────────
const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const ListIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

// ── Main page ──────────────────────────────────────────────
export default function TractorsPage() {
  const [tractors, setTractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [filterMake, setFilterMake] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterHP, setFilterHP] = useState('');
  const [filterHours, setFilterHours] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { setTractors(await getTractors()); }
    catch (e) { alert('Error loading tractors: ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Unique values for filter dropdowns
  const makes = [...new Set(tractors.map(t => t.make).filter(Boolean))].sort();
  const models = [...new Set(tractors.filter(t => !filterMake || t.make === filterMake).map(t => t.model).filter(Boolean))].sort();
  const years = [...new Set(tractors.map(t => t.year).filter(Boolean))].sort((a,b) => b - a);

  const filtered = tractors.filter(t => {
    const q = search.toLowerCase();
    const searchStr = [
      t.make, t.model, t.year, t.hours_used, t.engine_hp,
      t.location_text, t.area_office, t.rc_number, t.serial_number,
      t.condition, t.status, t.description,
      t.expected_price, t.exchange_date,
      ...(t.tractor_brokers?.map(tb => tb.brokers?.name) || []),
    ].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !q || searchStr.includes(q);
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchMake = !filterMake || t.make === filterMake;
    const matchModel = !filterModel || t.model === filterModel;
    const matchYear = !filterYear || String(t.year) === filterYear;
    const matchHP = !filterHP || (t.engine_hp && t.engine_hp >= parseInt(filterHP));
    const matchHours = !filterHours || (t.hours_used && parseInt(t.hours_used) <= parseInt(filterHours));
    const matchPriceMin = !filterPriceMin || (t.expected_price && t.expected_price >= parseInt(filterPriceMin.replace(/,/g,'')));
    const matchPriceMax = !filterPriceMax || (t.expected_price && t.expected_price <= parseInt(filterPriceMax.replace(/,/g,'')));
    return matchSearch && matchStatus && matchMake && matchModel && matchYear && matchHP && matchHours && matchPriceMin && matchPriceMax;
  });

  const activeFilters = [filterMake, filterModel, filterYear, filterHP, filterHours, filterPriceMin, filterPriceMax].filter(Boolean).length;

  const clearFilters = () => {
    setFilterMake(''); setFilterModel(''); setFilterYear('');
    setFilterHP(''); setFilterHours(''); setFilterPriceMin(''); setFilterPriceMax('');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this tractor?')) return;
    try { await deleteTractor(id); load(); }
    catch (err) { alert(err.message); }
  };

  // 1. Enquiry call — calls fixed number
  const enquiryCall = (e) => {
    e.stopPropagation();
    window.open('tel:+917518767671', '_self');
  };

  // 2. Enquiry on WhatsApp — sends stock link to fixed number
  const enquiryWA = (e, t) => {
    e.stopPropagation();
    const url = `${window.location.origin}/market/${t.share_token}`;
    const msg = `Hi, I am interested in buying this tractor.\n\n🚜 *${t.make} ${t.model}* (${t.year})\n📍 ${t.location_text}\n💰 ${PRICE_FMT(t.expected_price)}\n\n${url}`;
    window.open('https://wa.me/917518767671?text=' + encodeURIComponent(msg), '_blank');
  };

  // 3. Share tractor — native share sheet or clipboard fallback
  const shareTractor = (e, t) => {
    e.stopPropagation();
    const url = `${window.location.origin}/market/${t.share_token}`;
    const shareData = {
      title: `${t.make} ${t.model} (${t.year})`,
      text: `${t.make} ${t.model} (${t.year}) — ${PRICE_FMT(t.expected_price)} — 📍 ${t.location_text}`,
      url,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Link copied to clipboard!'));
    }
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

          {/* Filter toggle */}
          <button className="btn" onClick={() => setShowFilters(f => !f)} style={{ position:'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            {activeFilters > 0 && <span style={{ position:'absolute', top:-6, right:-6, background:'var(--green)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{activeFilters}</span>}
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              className="btn"
              style={{ borderRadius: 0, border: 'none', borderRight: '1px solid var(--border-md)',
                background: viewMode === 'card' ? 'var(--green-light)' : '#fff',
                color: viewMode === 'card' ? 'var(--green-dark)' : 'var(--gray-600)', padding: '6px 10px' }}
              onClick={() => setViewMode('card')}
              title="Card view"
            >
              <GridIcon />
            </button>
            <button
              className="btn"
              style={{ borderRadius: 0, border: 'none',
                background: viewMode === 'list' ? 'var(--green-light)' : '#fff',
                color: viewMode === 'list' ? 'var(--green-dark)' : 'var(--gray-600)', padding: '6px 10px' }}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <ListIcon />
            </button>
          </div>

          <button className="btn" onClick={() => exportTractorsToExcel(tractors)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Tractor</button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background:'#fff', borderBottom:'1px solid var(--border)', padding:'12px 24px', display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Make</div>
            <select className="form-input form-select" style={{ width:130 }} value={filterMake} onChange={e => { setFilterMake(e.target.value); setFilterModel(''); }}>
              <option value="">All Makes</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Model</div>
            <select className="form-input form-select" style={{ width:130 }} value={filterModel} onChange={e => setFilterModel(e.target.value)}>
              <option value="">All Models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Year</div>
            <select className="form-input form-select" style={{ width:100 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">Any Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Min HP</div>
            <input className="form-input" style={{ width:90 }} placeholder="e.g. 45" value={filterHP} onChange={e => setFilterHP(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Max Hours</div>
            <input className="form-input" style={{ width:100 }} placeholder="e.g. 2000" value={filterHours} onChange={e => setFilterHours(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Price Min (Rs.)</div>
            <input className="form-input" style={{ width:120 }} placeholder="e.g. 1,00,000" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Price Max (Rs.)</div>
            <input className="form-input" style={{ width:120 }} placeholder="e.g. 5,00,000" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} />
          </div>
          {activeFilters > 0 && (
            <button className="btn btn-danger" onClick={clearFilters} style={{ alignSelf:'flex-end' }}>Clear All</button>
          )}
        </div>
      )}

      <div className="content">
        {/* Count */}
        {!loading && filtered.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>
            {filtered.length} tractor{filtered.length !== 1 ? 's' : ''}
            {filterStatus !== 'All' ? ` · ${filterStatus}` : ''}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 12px' }} /><p>Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No tractors found.</p></div>
        ) : viewMode === 'card' ? (
          <CardView
            tractors={filtered}
            navigate={navigate}
            enquiryCall={enquiryCall}
            enquiryWA={enquiryWA}
            shareTractor={shareTractor}
            handleDelete={handleDelete}
          />
        ) : (
          <ListView
            tractors={filtered}
            navigate={navigate}
            enquiryCall={enquiryCall}
            enquiryWA={enquiryWA}
            shareTractor={shareTractor}
            handleDelete={handleDelete}
          />
        )}
      </div>

      {showModal && <TractorModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </>
  );
}
