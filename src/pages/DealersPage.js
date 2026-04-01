import React, { useState, useEffect } from 'react';
import { getDealers, createDealer, updateDealer, deleteDealer } from '../lib/supabase';

const INIT = { name:'', contact_person:'', phone:'', whatsapp:'', email:'', city:'', state:'', brands:'', is_active:true, notes:'' };

export default function DealersPage() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); try { setDealers(await getDealers()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(INIT); setShowModal(true); };
  const openEdit = (d) => { setEditing(d.id); setForm({ ...d }); setShowModal(true); };
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return alert('Dealer name is required.');
    setSaving(true);
    try {
      if (editing) await updateDealer(editing, form);
      else await createDealer(form);
      load(); setShowModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dealer?')) return;
    try { await deleteDealer(id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <>
      <div className="topbar">
        <h2>Dealers</h2>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAdd}>+ Add Dealer</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header">
            <h3>All Dealers</h3>
            <span className="tag tag-blue">{dealers.length} total</span>
          </div>
          {loading ? <div style={{ padding:40, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div> : (
            <table className="data-table">
              <thead>
                <tr><th>Dealership</th><th>Contact</th><th>Phone</th><th>City / State</th><th>Brands</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {dealers.length === 0 && <tr><td colSpan="7" style={{ textAlign:'center', color:'var(--gray-400)', padding:32 }}>No dealers yet.</td></tr>}
                {dealers.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex flex-center gap-8">
                        <div className="avatar av-blue">{d.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                        <div style={{ fontWeight:600 }}>{d.name}</div>
                      </div>
                    </td>
                    <td>{d.contact_person || '—'}</td>
                    <td>
                      <div>{d.phone}</div>
                      {d.email && <div className="text-muted text-sm">{d.email}</div>}
                    </td>
                    <td>{[d.city, d.state].filter(Boolean).join(', ') || '—'}</td>
                    <td><span className="tag tag-blue">{d.brands || 'All'}</span></td>
                    <td><span className={`tag ${d.is_active ? 'tag-green' : 'tag-gray'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-8">
                        <a href={`tel:${d.phone}`} className="btn btn-sm btn-call">📞 Call</a>
                        {d.whatsapp && <a href={`https://wa.me/${d.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa">💬</a>}
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
            <div className="modal-header">
              <h3>{editing ? 'Edit Dealer' : 'Add Dealer'}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
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
                <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state} onChange={e => set('state',e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" value={form.notes} onChange={e => set('notes',e.target.value)} /></div>
              <div className="form-group">
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => set('is_active',e.target.checked)} />
                  Active dealer
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Add Dealer')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
