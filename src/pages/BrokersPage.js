import React, { useState, useEffect } from 'react';
import { getBrokers, createBroker, updateBroker, deleteBroker } from '../lib/supabase';
import BulkImportModal from '../components/BulkImportModal';

const INIT = { name:'', phone:'', whatsapp:'', email:'', location:'', speciality:'', is_active:true, notes:'' };

export default function BrokersPage() {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = async () => { setLoading(true); try { setBrokers(await getBrokers()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(INIT); setShowModal(true); };
  const openEdit = (b) => { setEditing(b.id); setForm({ ...b }); setShowModal(true); };
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return alert('Name is required.');
    setSaving(true);
    try {
      if (editing) await updateBroker(editing, form);
      else await createBroker(form);
      load(); setShowModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this broker? They will be removed from all tractor assignments.')) return;
    try { await deleteBroker(id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <>
      <div className="topbar">
        <h2>Brokers</h2>
        <div className="topbar-actions">
          <button className="btn" onClick={() => setShowImport(true)}>📥 Bulk Import</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Broker</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <h3>All Brokers</h3>
            <span className="tag tag-green">{brokers.length} total</span>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {brokers.length === 0 && <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>No brokers yet. Add your first broker.</td></tr>}
                {brokers.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="flex flex-center gap-8">
                        <div className="avatar av-green">{b.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                        <div>
                          <div style={{ fontWeight:600 }}>{b.name}</div>
                          {b.email && <div className="text-muted text-sm">{b.email}</div>}
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
                    <td>
                      <div className="flex gap-8">
                        <a href={'https://wa.me/' + (b.whatsapp||b.phone||'').replace(/[^0-9]/g,'')} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> WhatsApp</a>
                        <a href={'tel:' + (b.phone||'')} className="btn btn-sm btn-call"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> Call</a>
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

      {showImport && <BulkImportModal type="brokers" onClose={() => setShowImport(false)} onDone={load} />}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Edit Broker' : 'Add Broker'}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => set('name',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">WhatsApp Number</label><input className="form-input" placeholder="919876543210" value={form.whatsapp} onChange={e => set('whatsapp',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email',e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Location</label><input className="form-input" placeholder="City, State" value={form.location} onChange={e => set('location',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Speciality</label><input className="form-input" placeholder="Mahindra, Sonalika…" value={form.speciality} onChange={e => set('speciality',e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" value={form.notes} onChange={e => set('notes',e.target.value)} /></div>
              <div className="form-group">
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => set('is_active',e.target.checked)} />
                  Active broker
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Add Broker')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
