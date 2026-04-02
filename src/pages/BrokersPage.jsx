import React, { useState, useEffect } from 'react';
import { getBrokers, createBroker, updateBroker, deleteBroker, getBrokerPurchaseHistory } from '../lib/supabase';
import BulkImportModal from '../components/BulkImportModal.jsx';

const INIT = { name:'', phone:'', whatsapp:'', email:'', location:'', speciality:'', is_active:true, notes:'' };
const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';
const WA = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
const CALL = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;

// ── Purchase History Panel ─────────────────────────────────
function PurchaseHistoryPanel({ broker, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrokerPurchaseHistory(broker.id, broker.phone)
      .then(setHistory)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [broker.id, broker.phone]);

  const soldCount = history.filter(h => h.status === 'Sold').length;
  const totalValue = history.filter(h => h.status === 'Sold' && h.offered_price)
    .reduce((sum, h) => sum + (h.offered_price || 0), 0);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h3>Purchase History — {broker.name}</h3>
            <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{broker.phone} · {broker.location}</div>
          </div>
          <button className="btn btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
          <div className="stat-card">
            <div className="stat-label">Total Enquiries</div>
            <div className="stat-value" style={{ color:'var(--blue)' }}>{history.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tractors Bought</div>
            <div className="stat-value" style={{ color:'var(--green)' }}>{soldCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Value</div>
            <div className="stat-value" style={{ color:'var(--green)', fontSize:15 }}>{PRICE_FMT(totalValue)}</div>
          </div>
        </div>

        <div style={{ maxHeight:460, overflowY:'auto' }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
          ) : history.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}><p>No purchase history found for this broker.</p></div>
          ) : (
            <table className="data-table">
              <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:1 }}>
                <tr>
                  <th>Enquiry ID</th>
                  <th>Tractor</th>
                  <th>Location</th>
                  <th>Asked Price</th>
                  <th>Final Price</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} style={{ background: h.status === 'Sold' ? 'var(--green-light)' : 'transparent' }}>
                    <td>
                      <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--gray-400)', wordBreak:'break-all' }}>
                        {h.id.slice(0,8).toUpperCase()}
                      </div>
                      <div style={{ fontSize:10, color:'var(--gray-400)', marginTop:1 }}>
                        Full: {h.id}
                      </div>
                    </td>
                    <td>
                      {h.tractors ? (
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{h.tractors.make} {h.tractors.model}</div>
                          <div style={{ fontSize:11, color:'var(--gray-400)' }}>{h.tractors.year}</div>
                          {h.tractors.rc_number && <div style={{ fontSize:11, color:'var(--gray-400)' }}>RC: {h.tractors.rc_number}</div>}
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ fontSize:12 }}>
                      {h.tractors?.location_text || '—'}
                      {h.tractors?.area_office && <div style={{ fontSize:11, color:'var(--gray-400)' }}>{h.tractors.area_office}</div>}
                    </td>
                    <td style={{ fontSize:13 }}>{PRICE_FMT(h.tractors?.expected_price)}</td>
                    <td>
                      <span style={{ fontWeight:700, color:'var(--green)', fontSize:13 }}>
                        {PRICE_FMT(h.offered_price)}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${h.status==='Sold'?'tag-green':h.status==='New'?'tag-blue':h.status==='Negotiating'?'tag-amber':'tag-gray'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--gray-600)', whiteSpace:'nowrap' }}>
                      {h.sold_at
                        ? new Date(h.sold_at).toLocaleDateString('en-IN')
                        : new Date(h.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main BrokersPage ───────────────────────────────────────
export default function BrokersPage() {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [historyBroker, setHistoryBroker] = useState(null); // broker to show history for

  const load = async () => { setLoading(true); try { setBrokers(await getBrokers()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const openAdd = () => { setEditing(null); setForm(INIT); setShowModal(true); };
  const openEdit = (b) => { setEditing(b.id); setForm({ ...b }); setShowModal(true); };
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return alert('Name is required.');
    setSaving(true);
    try { if (editing) await updateBroker(editing, form); else await createBroker(form); load(); setShowModal(false); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this broker?')) return;
    try { await deleteBroker(id); load(); } catch (e) { alert(e.message); }
  };

  const locations = [...new Set(brokers.map(b => b.location).filter(Boolean))].sort();

  const filtered = brokers.filter(b => {
    const q = search.toLowerCase();
    const bStr = [b.name, b.phone, b.whatsapp, b.email, b.location, b.speciality, b.notes].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !q || bStr.includes(q);
    const matchLoc = !filterLocation || b.location === filterLocation;
    const matchStatus = filterStatus === 'All' || (filterStatus === 'Active' ? b.is_active : !b.is_active);
    return matchSearch && matchLoc && matchStatus;
  });

  return (
    <>
      <div className="topbar">
        <h2>Brokers</h2>
        <div className="topbar-actions">
          <input className="search-input" placeholder="Search name, phone, speciality…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width: 160 }} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="form-input form-select" style={{ width: 110 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option>All</option><option>Active</option><option>Inactive</option>
          </select>
          <button className="btn" onClick={() => setShowImport(true)}>Bulk Import</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Broker</button>
        </div>
      </div>

      <div className="content">
        <div className="card">
          <div className="card-header">
            <h3>Brokers</h3>
            <span className="tag tag-green">{filtered.length} of {brokers.length}</span>
          </div>
          {loading ? <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Speciality</th>
                  <th>Status</th>
                  <th>Purchases</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7" style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>No brokers match your filters.</td></tr>}
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="flex flex-center gap-8">
                        <div className="avatar av-green">{b.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                        <div>
                          <div style={{ fontWeight:600 }}>{b.name}</div>
                          {b.email && <div className="text-muted text-sm">{b.email}</div>}
                          {b.notes && <div style={{ fontSize:11, color:'var(--gray-600)', marginTop:3, maxWidth:220, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{b.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{b.phone}</div>
                      {b.whatsapp && b.whatsapp !== b.phone && <div className="text-muted text-sm">WA: {b.whatsapp}</div>}
                    </td>
                    <td>{b.location || '—'}</td>
                    <td><span className="tag tag-blue">{b.speciality || 'All'}</span></td>
                    <td><span className={`tag ${b.is_active ? 'tag-green' : 'tag-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>

                    {/* Purchase history column */}
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize:12 }}
                        onClick={() => setHistoryBroker(b)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        View Log
                      </button>
                    </td>

                    <td>
                      <div className="flex gap-8">
                        <a href={'https://wa.me/' + (b.whatsapp||b.phone||'').replace(/[^0-9]/g,'')} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa">{WA} WhatsApp</a>
                        <a href={'tel:' + (b.phone||'')} className="btn btn-sm btn-call">{CALL} Call</a>
                        <button className="btn btn-sm" onClick={() => openEdit(b)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>{editing ? 'Edit Broker' : 'Add Broker'}</h3><button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => set('name',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" placeholder="919876543210" value={form.whatsapp} onChange={e => set('whatsapp',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Location</label><input className="form-input" placeholder="City, State" value={form.location} onChange={e => set('location',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Speciality</label><input className="form-input" placeholder="Mahindra, Sonalika…" value={form.speciality} onChange={e => set('speciality',e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" value={form.notes} onChange={e => set('notes',e.target.value)} /></div>
              <div className="form-group"><label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}><input type="checkbox" checked={form.is_active} onChange={e => set('is_active',e.target.checked)} /> Active broker</label></div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Add Broker')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {historyBroker && (
        <PurchaseHistoryPanel
          broker={historyBroker}
          onClose={() => setHistoryBroker(null)}
        />
      )}

      {showImport && <BulkImportModal type="brokers" onClose={() => setShowImport(false)} onDone={load} />}
    </>
  );
}
