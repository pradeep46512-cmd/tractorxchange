import React, { useState, useEffect } from 'react';
import { createTractor, getBrokers } from '../lib/supabase';

const INITIAL = { make:'', model:'', year:'', hours_used:'', engine_hp:'', condition:'Good', status:'Available', expected_price:'', location_text:'', description:'' };

export default function TractorModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL);
  const [brokers, setBrokers] = useState([]);
  const [selectedBrokers, setSelectedBrokers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBrokers().then(setBrokers).catch(() => {});
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleBroker = (id) => setSelectedBrokers(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const handleSubmit = async () => {
    if (!form.make || !form.model) return alert('Make and Model are required.');
    setSaving(true);
    try {
      await createTractor({
        ...form,
        year: form.year ? parseInt(form.year) : null,
        engine_hp: form.engine_hp ? parseInt(form.engine_hp) : null,
        expected_price: form.expected_price ? parseInt(form.expected_price.replace(/,/g,'')) : null,
      }, selectedBrokers);
      onSaved();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Add Exchange Tractor</h3>
          <button className="btn btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Make *</label>
              <input className="form-input" placeholder="Mahindra" value={form.make} onChange={e => set('make', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Model *</label>
              <input className="form-input" placeholder="475 DI" value={form.model} onChange={e => set('model', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" type="number" placeholder="2019" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Hours Used</label>
              <input className="form-input" placeholder="1200 hrs" value={form.hours_used} onChange={e => set('hours_used', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Engine (HP)</label>
              <input className="form-input" type="number" placeholder="45" value={form.engine_hp} onChange={e => set('engine_hp', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Expected Price (₹)</label>
              <input className="form-input" placeholder="4,50,000" value={form.expected_price} onChange={e => set('expected_price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-input form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                {['Excellent','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="Village, District, State" value={form.location_text} onChange={e => set('location_text', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" placeholder="Condition notes, service history, special features…" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {brokers.length > 0 && (
            <div className="form-group">
              <label className="form-label">Eligible Brokers (who can buy/bring buyers)</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
                {brokers.map(b => (
                  <label key={b.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'5px 10px', border:'1px solid var(--border-md)', borderRadius:8, cursor:'pointer', background: selectedBrokers.includes(b.id) ? 'var(--green-light)' : '#fff', color: selectedBrokers.includes(b.id) ? 'var(--green-dark)' : 'inherit' }}>
                    <input type="checkbox" checked={selectedBrokers.includes(b.id)} onChange={() => toggleBroker(b.id)} style={{ width:14, height:14 }} />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Add Tractor'}</button>
        </div>
      </div>
    </div>
  );
}
