import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getEnquiries, createEnquiry, updateEnquiry, deleteEnquiry,
  markTractorSoldToEnquiry, getTractors, getBrokers, getDealers
} from '../lib/supabase';
import { exportEnquiriesToExcel } from '../lib/exportToExcel';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';
const WA = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
const CALL = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;

// ── Stock match logic ──────────────────────────────────────
// Score how well a tractor matches enquiry requirements
function matchScore(tractor, req) {
  if (!req || tractor.status === 'Sold') return 0;
  let score = 0;
  let checks = 0;

  if (req.req_make) { checks++; if (tractor.make?.toLowerCase() === req.req_make.toLowerCase()) score++; }
  if (req.req_model) { checks++; if (tractor.model?.toLowerCase().includes(req.req_model.toLowerCase())) score++; }
  if (req.req_year) { checks++; if (String(tractor.year) === String(req.req_year)) score++; }
  if (req.req_hp) { checks++; if (tractor.engine_hp && tractor.engine_hp >= parseInt(req.req_hp)) score++; }
  if (req.req_price_max) {
    checks++;
    if (tractor.expected_price && tractor.expected_price <= parseInt(String(req.req_price_max).replace(/,/g,''))) score++;
  }

  if (checks === 0) return 0;
  return score / checks; // 0 to 1
}

const INIT_FORM = {
  source: 'manual', broker_id: '', dealer_id: '',
  buyer_name: '', buyer_phone: '', buyer_whatsapp: '', buyer_location: '',
  // linked stock tractor (optional)
  tractor_id: '',
  // OR requirement details (for unlinked enquiries)
  req_make: '', req_model: '', req_year: '', req_hp: '', req_price_max: '',
  req_condition: '', req_notes: '',
  offered_price: '', status: 'New', notes: ''
};

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [tractors, setTractors] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [soldModal, setSoldModal] = useState(null);
  const [saleDate, setSaleDate] = useState('');
  const [matchPanel, setMatchPanel] = useState(null); // enquiry id to show matches for
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eq, tr, br, dl] = await Promise.all([getEnquiries(), getTractors(), getBrokers(), getDealers()]);
      setEnquiries(eq); setTractors(tr); setBrokers(br); setDealers(dl);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const setSource = (src) => setForm(prev => ({ ...prev, source: src, broker_id: '', dealer_id: '', buyer_name: '', buyer_phone: '', buyer_whatsapp: '' }));

  const selectBroker = (id) => {
    const b = brokers.find(x => x.id === id);
    if (b) setForm(prev => ({ ...prev, broker_id: id, buyer_name: b.name, buyer_phone: b.phone||'', buyer_whatsapp: b.whatsapp||b.phone||'', buyer_location: b.location||'' }));
    else set('broker_id', id);
  };

  const selectDealer = (id) => {
    const d = dealers.find(x => x.id === id);
    if (d) setForm(prev => ({ ...prev, dealer_id: id, buyer_name: d.contact_person||d.name, buyer_phone: d.phone||'', buyer_whatsapp: d.whatsapp||d.phone||'', buyer_location: d.city||'' }));
    else set('dealer_id', id);
  };

  const openAdd = () => { setEditing(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (eq) => {
    setEditing(eq.id);
    setForm({ source: eq.source||'manual', broker_id: eq.broker_id||'', dealer_id: eq.dealer_id||'',
      buyer_name: eq.buyer_name||'', buyer_phone: eq.buyer_phone||'', buyer_whatsapp: eq.buyer_whatsapp||'',
      buyer_location: eq.buyer_location||'', tractor_id: eq.tractor_id||'',
      req_make: eq.req_make||'', req_model: eq.req_model||'', req_year: eq.req_year||'',
      req_hp: eq.req_hp||'', req_price_max: eq.req_price_max||'',
      req_condition: eq.req_condition||'', req_notes: eq.req_notes||'',
      offered_price: eq.offered_price||'', status: eq.status||'New', notes: eq.notes||'' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.buyer_name) return alert('Buyer name is required.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        broker_id: form.source === 'broker' ? form.broker_id||null : null,
        dealer_id: form.source === 'dealer' ? form.dealer_id||null : null,
        tractor_id: form.tractor_id || null,
        offered_price: form.offered_price ? parseInt(String(form.offered_price).replace(/,/g,'')) : null,
        req_price_max: form.req_price_max ? parseInt(String(form.req_price_max).replace(/,/g,'')) : null,
        req_hp: form.req_hp ? parseInt(form.req_hp) : null,
        req_year: form.req_year || null,
      };
      if (editing) await updateEnquiry(editing, payload);
      else await createEnquiry(payload);
      load(); setShowModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleMarkSold = (eq) => {
    if (!eq.tractor_id) return alert('Please link a tractor to this enquiry before marking as sold.');
    setSaleDate(new Date().toISOString().slice(0,10));
    setSoldModal(eq);
  };

  const confirmMarkSold = async () => {
    if (!soldModal) return;
    try { await markTractorSoldToEnquiry(soldModal.tractor_id, soldModal.id, saleDate); setSoldModal(null); load(); }
    catch (e) { alert(e.message); }
  };

  const linkTractor = async (enquiryId, tractorId) => {
    try { await updateEnquiry(enquiryId, { tractor_id: tractorId, status: 'Negotiating' }); load(); setMatchPanel(null); }
    catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try { await deleteEnquiry(id); load(); } catch (e) { alert(e.message); }
  };

  const handleStatusChange = async (id, status) => {
    try { await updateEnquiry(id, { status }); load(); } catch (e) { alert(e.message); }
  };

  // Compute matches for each enquiry
  const matchedTractors = useMemo(() => {
    const result = {};
    enquiries.forEach(eq => {
      if (eq.tractor_id) { result[eq.id] = []; return; } // already linked
      const scored = tractors
        .filter(t => t.status !== 'Sold')
        .map(t => ({ tractor: t, score: matchScore(t, eq) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);
      result[eq.id] = scored;
    });
    return result;
  }, [enquiries, tractors]);

  const filtered = enquiries.filter(eq => {
    const matchStatus = filterStatus === 'All' || eq.status === filterStatus;
    const q = search.toLowerCase();
    const eqStr = [
      eq.buyer_name, eq.buyer_phone, eq.buyer_whatsapp, eq.buyer_location,
      eq.source, eq.status, eq.notes, eq.offered_price,
      eq.req_make, eq.req_model, eq.req_year, eq.req_condition, eq.req_notes,
      eq.tractors?.make, eq.tractors?.model, eq.tractors?.year,
      eq.tractors?.location_text, eq.tractors?.rc_number,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !q || eqStr.includes(q);
    return matchStatus && matchSearch;
  });

  const counts = { All: enquiries.length, New: 0, Negotiating: 0, Sold: 0, Lost: 0 };
  enquiries.forEach(eq => { if (counts[eq.status] !== undefined) counts[eq.status]++; });

  // Available tractors in stock (not sold)
  const availTractors = tractors.filter(t => t.status !== 'Sold');

  return (
    <>
      <div className="topbar">
        <h2>Enquiries</h2>
        <div className="topbar-actions">
          <input className="search-input" placeholder="Search buyer or tractor…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {['All','New','Negotiating','Sold','Lost'].map(s => <option key={s} value={s}>{s} ({counts[s]})</option>)}
          </select>
          <button className="btn" onClick={() => exportEnquiriesToExcel(enquiries)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border-md)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
            <button className="btn" title="Card view"
              style={{ borderRadius:0, border:'none', borderRight:'1px solid var(--border-md)', padding:'6px 10px',
                background: viewMode==='card' ? 'var(--green-light)' : '#fff',
                color: viewMode==='card' ? 'var(--green-dark)' : 'var(--gray-600)' }}
              onClick={() => setViewMode('card')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button className="btn" title="List view"
              style={{ borderRadius:0, border:'none', padding:'6px 10px',
                background: viewMode==='list' ? 'var(--green-light)' : '#fff',
                color: viewMode==='list' ? 'var(--green-dark)' : 'var(--gray-600)' }}
              onClick={() => setViewMode('list')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Enquiry</button>
        </div>
      </div>

      <div className="content">
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10, marginBottom:20 }}>
          {[{l:'Total',v:counts.All,c:'var(--gray-900)'},{l:'New',v:counts.New,c:'var(--blue)'},{l:'Negotiating',v:counts.Negotiating,c:'var(--amber)'},{l:'Sold',v:counts.Sold,c:'var(--green)'},{l:'Lost',v:counts.Lost,c:'var(--gray-400)'}].map(s => (
            <div key={s.l} className="stat-card"><div className="stat-label">{s.l}</div><div className="stat-value" style={{ color:s.c }}>{s.v}</div></div>
          ))}
        </div>

        {loading ? <div className="empty-state"><div className="spinner" style={{ margin:'0 auto 12px' }} /><p>Loading…</p></div> : filtered.length === 0 ? (
          <div className="empty-state"><p>No enquiries found.</p></div>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Requirement / Stock</th>
                  <th>Offered Price</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(eq => {
                  const linkedTractor = tractors.find(t => t.id === eq.tractor_id);
                  const matches = matchedTractors[eq.id] || [];
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{eq.buyer_name}</div>
                        {eq.buyer_phone && (
                          <div className="flex gap-8" style={{ marginTop:4 }}>
                            <a href={'tel:'+eq.buyer_phone} className="btn btn-sm btn-call" style={{ padding:'2px 7px', fontSize:11 }}>
                              {WA} Call
                            </a>
                            <a href={'https://wa.me/'+(eq.buyer_whatsapp||eq.buyer_phone).replace(/[^0-9]/g,'')} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa" style={{ padding:'2px 7px', fontSize:11 }}>
                              {WA} WA
                            </a>
                          </div>
                        )}
                        {eq.buyer_location && <div className="text-muted text-sm" style={{ marginTop:2 }}>📍 {eq.buyer_location}</div>}
                      </td>
                      <td>
                        {linkedTractor ? (
                          <div>
                            <div style={{ fontWeight:600, fontSize:12, color:'var(--green-dark)' }}>{linkedTractor.make} {linkedTractor.model} ({linkedTractor.year})</div>
                            <div style={{ fontSize:11, color:'var(--gray-400)' }}>{PRICE_FMT(linkedTractor.expected_price)}</div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize:12, display:'flex', flexWrap:'wrap', gap:4 }}>
                              {eq.req_make && <span className="tag tag-blue" style={{ fontSize:10 }}>{eq.req_make}</span>}
                              {eq.req_model && <span className="tag tag-blue" style={{ fontSize:10 }}>{eq.req_model}</span>}
                              {eq.req_year && <span className="tag tag-gray" style={{ fontSize:10 }}>{eq.req_year}</span>}
                              {eq.req_price_max && <span className="tag tag-green" style={{ fontSize:10 }}>Max {PRICE_FMT(eq.req_price_max)}</span>}
                              {!eq.req_make && !eq.req_model && <span className="text-muted text-sm">No req.</span>}
                            </div>
                            {matches.length > 0 && (
                              <div style={{ fontSize:11, color:'var(--green-dark)', fontWeight:600, marginTop:3 }}>
                                {matches.length} stock match{matches.length>1?'es':''}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td><span style={{ fontWeight:600, color:'var(--green)', fontSize:13 }}>{PRICE_FMT(eq.offered_price)}</span></td>
                      <td><span className={`tag ${eq.source==='broker'?'tag-blue':eq.source==='dealer'?'tag-amber':'tag-gray'}`} style={{ fontSize:10 }}>{eq.source}</span></td>
                      <td>
                        <select className="form-input form-select" style={{ fontSize:12, padding:'3px 24px 3px 8px', width:120 }}
                          value={eq.status} onChange={e => handleStatusChange(eq.id, e.target.value)}>
                          {['New','Negotiating','Sold','Lost'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="text-muted text-sm">{new Date(eq.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="flex gap-8">
                          {!linkedTractor && matches.length > 0 && (
                            <button className="btn btn-sm btn-primary" style={{ fontSize:11, padding:'4px 8px' }}
                              onClick={() => { setViewMode('card'); setMatchPanel(eq.id); }}>
                              {matches.length} Match{matches.length>1?'es':''}
                            </button>
                          )}
                          {linkedTractor && eq.status !== 'Sold' && linkedTractor.status !== 'Sold' && (
                            <button className="btn btn-sm btn-primary" style={{ fontSize:11 }} onClick={() => handleMarkSold(eq)}>✓ Sold</button>
                          )}
                          <button className="btn btn-sm" onClick={() => openEdit(eq)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(eq.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── CARD VIEW ── */
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(eq => {
              const linkedTractor = tractors.find(t => t.id === eq.tractor_id);
              const matches = matchedTractors[eq.id] || [];
              const hasMatches = matches.length > 0;
              const showingMatches = matchPanel === eq.id;

              return (
                <div key={eq.id} className="card" style={{ overflow:'visible' }}>
                  <div style={{ padding:'14px 16px', display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start' }}>

                    {/* Buyer info */}
                    <div style={{ flex:'1', minWidth:180 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{eq.buyer_name}</div>
                      <div className="flex gap-8" style={{ marginTop:5, flexWrap:'wrap' }}>
                        {eq.buyer_phone && <>
                          <a href={'tel:'+eq.buyer_phone} className="btn btn-sm btn-call" style={{ padding:'2px 8px', fontSize:11 }}>{CALL} Call</a>
                          <a href={'https://wa.me/'+(eq.buyer_whatsapp||eq.buyer_phone).replace(/[^0-9]/g,'')} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa" style={{ padding:'2px 8px', fontSize:11 }}>{WA} WA</a>
                        </>}
                      </div>
                      {eq.buyer_location && <div className="text-muted text-sm" style={{ marginTop:4 }}>📍 {eq.buyer_location}</div>}
                      <span className={`tag ${eq.source==='broker'?'tag-blue':eq.source==='dealer'?'tag-amber':'tag-gray'}`} style={{ marginTop:6, display:'inline-block', fontSize:10 }}>{eq.source}</span>
                    </div>

                    {/* Requirement / Linked tractor */}
                    <div style={{ flex:'2', minWidth:220 }}>
                      {linkedTractor ? (
                        // Linked stock tractor
                        <div style={{ background:'var(--green-light)', borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--green-dark)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Linked Stock</div>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--green-dark)' }}>{linkedTractor.make} {linkedTractor.model} ({linkedTractor.year})</div>
                          <div style={{ fontSize:12, color:'var(--green-text)' }}>{PRICE_FMT(linkedTractor.expected_price)} · {linkedTractor.hours_used} · {linkedTractor.location_text}</div>
                          <span className={`status-badge status-${linkedTractor.status}`} style={{ position:'static', display:'inline-block', marginTop:6, fontSize:10, padding:'2px 8px', borderRadius:10 }}>{linkedTractor.status}</span>
                        </div>
                      ) : (
                        // Requirement details
                        <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                            Requirement
                            {hasMatches && (
                              <span style={{ marginLeft:8, background:'var(--green)', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>
                                {matches.length} match{matches.length>1?'es':''}
                              </span>
                            )}
                          </div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {eq.req_make && <span className="tag tag-blue">{eq.req_make}</span>}
                            {eq.req_model && <span className="tag tag-blue">{eq.req_model}</span>}
                            {eq.req_year && <span className="tag tag-gray">{eq.req_year}</span>}
                            {eq.req_hp && <span className="tag tag-gray">{eq.req_hp}+ HP</span>}
                            {eq.req_price_max && <span className="tag tag-green">Max {PRICE_FMT(eq.req_price_max)}</span>}
                            {eq.req_condition && <span className="tag tag-gray">{eq.req_condition}</span>}
                            {!eq.req_make && !eq.req_model && !eq.req_year && !eq.req_hp && !eq.req_price_max && (
                              <span className="text-muted text-sm">No requirements specified</span>
                            )}
                          </div>
                          {eq.req_notes && <div style={{ fontSize:12, color:'var(--gray-600)', marginTop:6 }}>{eq.req_notes}</div>}
                        </div>
                      )}
                    </div>

                    {/* Price & status */}
                    <div style={{ minWidth:140 }}>
                      {eq.offered_price && <div style={{ fontWeight:700, color:'var(--green)', fontSize:15, marginBottom:6 }}>{PRICE_FMT(eq.offered_price)}</div>}
                      <select className="form-input form-select" style={{ fontSize:12, padding:'4px 24px 4px 8px', width:'100%' }}
                        value={eq.status} onChange={e => handleStatusChange(eq.id, e.target.value)}>
                        {['New','Negotiating','Sold','Lost'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      <div className="text-muted text-sm" style={{ marginTop:6 }}>{new Date(eq.created_at).toLocaleDateString('en-IN')}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:120 }}>
                      {!linkedTractor && hasMatches && (
                        <button className="btn btn-sm btn-primary" onClick={() => setMatchPanel(showingMatches ? null : eq.id)}>
                          {showingMatches ? 'Hide Matches' : `View ${matches.length} Match${matches.length>1?'es':''}`}
                        </button>
                      )}
                      {linkedTractor && eq.status !== 'Sold' && linkedTractor.status !== 'Sold' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleMarkSold(eq)}>✓ Mark Sold</button>
                      )}
                      <button className="btn btn-sm" onClick={() => openEdit(eq)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(eq.id)}>Delete</button>
                    </div>
                  </div>

                  {/* Notes */}
                  {eq.notes && (
                    <div style={{ padding:'0 16px 12px', fontSize:12, color:'var(--gray-600)' }}>{eq.notes}</div>
                  )}

                  {/* Stock match panel */}
                  {showingMatches && (
                    <div style={{ borderTop:'1px solid var(--border)', padding:'12px 16px', background:'var(--gray-50)' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        Matching Stock — click to link
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {matches.map(({ tractor: t, score }) => (
                          <div key={t.id} style={{
                            display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                            background:'#fff', borderRadius:8, border:`1.5px solid ${score===1?'var(--green)':'var(--border)'}`,
                            cursor:'pointer', transition:'border-color 0.15s'
                          }}
                            onClick={() => linkTractor(eq.id, t.id)}
                          >
                            {t.cover_photo && (
                              <img src={t.cover_photo} alt="" style={{ width:52, height:40, objectFit:'cover', borderRadius:6, flexShrink:0 }} />
                            )}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:600, fontSize:13 }}>{t.make} {t.model} ({t.year})</div>
                              <div style={{ fontSize:12, color:'var(--gray-600)' }}>{PRICE_FMT(t.expected_price)} · {t.hours_used}{t.engine_hp?' · '+t.engine_hp+' HP':''}</div>
                              <div style={{ fontSize:11, color:'var(--gray-400)' }}>📍 {t.location_text}</div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <div style={{ fontSize:12, fontWeight:700, color: score===1?'var(--green)':score>=0.6?'var(--amber)':'var(--gray-400)' }}>
                                {Math.round(score*100)}% match
                              </div>
                              <span className={`status-badge status-${t.status}`} style={{ position:'static', display:'inline-block', fontSize:10, padding:'2px 7px', borderRadius:10, marginTop:4 }}>{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth:620 }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Enquiry' : 'Add Enquiry'}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Source */}
              <div className="form-group">
                <label className="form-label">Buyer Source</label>
                <div style={{ display:'flex', gap:8 }}>
                  {['broker','dealer','manual'].map(src => (
                    <button key={src} type="button" className="btn" style={{ flex:1, justifyContent:'center', textTransform:'capitalize',
                      background: form.source===src?'var(--green-light)':'#fff',
                      color: form.source===src?'var(--green-dark)':'var(--gray-600)',
                      borderColor: form.source===src?'var(--green)':'var(--border-md)',
                      fontWeight: form.source===src?600:400 }}
                      onClick={() => setSource(src)}>
                      {src==='broker'?'From Broker':src==='dealer'?'From Dealer':'Manual'}
                    </button>
                  ))}
                </div>
              </div>

              {form.source==='broker' && (
                <div className="form-group">
                  <label className="form-label">Select Broker</label>
                  <select className="form-input form-select" value={form.broker_id} onChange={e => selectBroker(e.target.value)}>
                    <option value="">Choose broker…</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name} — {b.phone} — {b.location}</option>)}
                  </select>
                </div>
              )}
              {form.source==='dealer' && (
                <div className="form-group">
                  <label className="form-label">Select Dealer</label>
                  <select className="form-input form-select" value={form.dealer_id} onChange={e => selectDealer(e.target.value)}>
                    <option value="">Choose dealer…</option>
                    {dealers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.contact_person} — {d.city}</option>)}
                  </select>
                </div>
              )}

              {/* Buyer details */}
              <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'12px 14px', marginBottom:14, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Buyer Details</div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.buyer_name} onChange={e => set('buyer_name',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.buyer_location} onChange={e => set('buyer_location',e.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.buyer_phone} onChange={e => set('buyer_phone',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={form.buyer_whatsapp} onChange={e => set('buyer_whatsapp',e.target.value)} /></div>
                </div>
              </div>

              {/* Link to existing stock OR enter requirements */}
              <div style={{ background:'var(--blue-light)', borderRadius:8, padding:'12px 14px', marginBottom:14, border:'1px solid rgba(55,138,221,0.2)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--blue-text)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                  Tractor Requirement
                </div>

                {/* Option A: Link existing stock */}
                <div className="form-group">
                  <label className="form-label">Link to Available Stock (optional)</label>
                  <select className="form-input form-select" value={form.tractor_id} onChange={e => set('tractor_id',e.target.value)}>
                    <option value="">Not linked — enter requirements below</option>
                    {availTractors.map(t => (
                      <option key={t.id} value={t.id}>{t.make} {t.model} ({t.year}) — {PRICE_FMT(t.expected_price)} — {t.location_text}</option>
                    ))}
                  </select>
                </div>

                {/* Option B: Requirements (shown when not linked) */}
                {!form.tractor_id && (
                  <>
                    <div style={{ fontSize:12, color:'var(--blue-text)', marginBottom:10 }}>
                      No stock linked — enter what the buyer is looking for. The system will highlight matching tractors.
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Make</label><input className="form-input" placeholder="e.g. Mahindra" value={form.req_make} onChange={e => set('req_make',e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Model</label><input className="form-input" placeholder="e.g. 475 DI" value={form.req_model} onChange={e => set('req_model',e.target.value)} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Year</label><input className="form-input" placeholder="e.g. 2019" value={form.req_year} onChange={e => set('req_year',e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Min HP</label><input className="form-input" placeholder="e.g. 45" value={form.req_hp} onChange={e => set('req_hp',e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Max Price (Rs.)</label><input className="form-input" placeholder="e.g. 3,50,000" value={form.req_price_max} onChange={e => set('req_price_max',e.target.value)} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Condition</label>
                        <select className="form-input form-select" value={form.req_condition} onChange={e => set('req_condition',e.target.value)}>
                          <option value="">Any</option>
                          {['Excellent','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group"><label className="form-label">Requirement Notes</label><input className="form-input" placeholder="Any other details…" value={form.req_notes} onChange={e => set('req_notes',e.target.value)} /></div>
                    </div>
                  </>
                )}
              </div>

              <div className="form-row">
                <div className="form-group"><label className="form-label">Offered Price (Rs.)</label><input className="form-input" value={form.offered_price} onChange={e => set('offered_price',e.target.value)} placeholder="e.g. 3,50,000" /></div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="form-input form-select" value={form.status} onChange={e => set('status',e.target.value)}>
                    {['New','Negotiating','Sold','Lost'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" value={form.notes} onChange={e => set('notes',e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':(editing?'Update':'Add Enquiry')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Sold Modal */}
      {soldModal && (() => {
        const t = tractors.find(x => x.id === soldModal.tractor_id);
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSoldModal(null)}>
            <div className="modal" style={{ maxWidth:420 }}>
              <div className="modal-header"><h3>Mark as Sold</h3><button className="btn btn-sm btn-icon" onClick={() => setSoldModal(null)}>✕</button></div>
              <div className="modal-body">
                <div style={{ background:'var(--green-light)', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:13, color:'var(--green-dark)' }}>
                  <strong>{t?.make} {t?.model} ({t?.year})</strong>
                  <div style={{ marginTop:4 }}>Selling to: <strong>{soldModal.buyer_name}</strong></div>
                  {soldModal.offered_price && <div>Offered: <strong>{PRICE_FMT(soldModal.offered_price)}</strong></div>}
                </div>
                <div className="form-group"><label className="form-label">Date of Sale *</label>
                  <input className="form-input" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} max={new Date().toISOString().slice(0,10)} />
                </div>
                <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:8 }}>This will mark the tractor as Sold and close this enquiry.</p>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setSoldModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmMarkSold} disabled={!saleDate}>Confirm Sale</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
