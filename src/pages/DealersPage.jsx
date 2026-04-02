import React, { useState, useEffect } from 'react';
import { getDealers, createDealer, updateDealer, deleteDealer } from '../lib/supabase';
import { INDIAN_STATES } from '../lib/indianStates';
import BulkImportModal from '../components/BulkImportModal.jsx';

const INIT = { name:'', contact_person:'', phone:'', whatsapp:'', email:'', city:'', state:'', brands:'', is_active:true, notes:'' };

export default function DealersPage() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => { setLoading(true); try { setDealers(await getDealers()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const openAdd = () => { setEditing(null); setForm(INIT); setShowModal(true); };
  const openEdit = (d) => { setEditing(d.id); setForm({ ...d }); setShowModal(true); };
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return alert('Dealer name is required.');
    setSaving(true);
    try { if (editing) await updateDealer(editing, form); else await createDealer(form); load(); setShowModal(false); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dealer?')) return;
    try { await deleteDealer(id); load(); } catch (e) { alert(e.message); }
  };

  // Dynamic city list based on selected state
  const citiesInState = [...new Set(
    dealers.filter(d => !filterState || d.state === filterState).map(d => d.city).filter(Boolean)
  )].sort();

  const filtered = dealers.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name?.toLowerCase().includes(q) || d.contact_person?.toLowerCase().includes(q) || d.phone?.includes(q) || d.city?.toLowerCase().includes(q);
    const matchState = !filterState || d.state === filterState;
    const matchCity = !filterCity || d.city === filterCity;
    return matchSearch && matchState && matchCity;
  });

  return (
    <>
      <div className="topbar">
        <h2>Dealers</h2>
        <div className="topbar-actions">
          <input className="search-input" placeholder="Search dealer, city…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width: 180 }} value={filterState} onChange={e => { setFilterState(e.target.value); setFilterCity(''); }}>
            <option value="">All Area Offices</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input form-select" style={{ width: 140 }} value={filterCity} onChange={e => setFilterCity(e.target.value)}>
            <option value="">All Cities</option>
            {citiesInState.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn" onClick={() => setShowImport(true)}>Bulk Import</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Dealer</button>
        </div>
      </div>

      <div className="content">
        <div className="card">
          <div className="card-header">
            <h3>Dealers</h3>
            <span className="tag tag-blue">{filtered.length} of {dealers.length}</span>
          </div>
          {loading ? <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div> : (
            <table className="data-table">
              <thead><tr><th>Dealership</th><th>Contact</th><th>Phone</th><th>City / Area Office</th><th>Brands</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7" style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>No dealers match your filters.</td></tr>}
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex flex-center gap-8">
                        <div className="avatar av-blue">{d.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                        <div>
                          <div style={{ fontWeight:600 }}>{d.name}</div>
                          {d.notes && <div style={{ fontSize:11, color:'var(--gray-600)', marginTop:3, maxWidth:200, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{d.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{d.contact_person || '—'}</td>
                    <td><div>{d.phone}</div>{d.email && <div className="text-muted text-sm">{d.email}</div>}</td>
                    <td><div>{d.city}</div>{d.state && <div className="text-muted text-sm">{d.state}</div>}</td>
                    <td><span className="tag tag-blue">{d.brands || 'All'}</span></td>
                    <td><span className={`tag ${d.is_active ? 'tag-green' : 'tag-gray'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-8">
                        <a href={'tel:' + (d.phone||'')} className="btn btn-sm btn-call">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> Call
                        </a>
                        <a href={'https://wa.me/' + (d.whatsapp||d.phone||'').replace(/[^0-9]/g,'')} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> WhatsApp
                        </a>
                        <button className="btn btn-sm" onClick={() => openEdit(d)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>{editing ? 'Edit Dealer' : 'Add Dealer'}</h3><button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Dealership Name *</label><input className="form-input" value={form.name} onChange={e => set('name',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={form.contact_person} onChange={e => set('contact_person',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => set('phone',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" placeholder="919876543210" value={form.whatsapp} onChange={e => set('whatsapp',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Brands</label><input className="form-input" placeholder="Mahindra, John Deere…" value={form.brands} onChange={e => set('brands',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => set('city',e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label">Area Office</label>
                  <select className="form-input form-select" value={form.state} onChange={e => set('state',e.target.value)}>
                    <option value="">Select area office...</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" value={form.notes} onChange={e => set('notes',e.target.value)} /></div>
              <div className="form-group"><label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}><input type="checkbox" checked={form.is_active} onChange={e => set('is_active',e.target.checked)} /> Active dealer</label></div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Add Dealer')}</button>
            </div>
          </div>
        </div>
      )}
      {showImport && <BulkImportModal type="dealers" onClose={() => setShowImport(false)} onDone={load} />}
    </>
  );
}
