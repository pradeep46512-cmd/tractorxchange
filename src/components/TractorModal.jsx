import React, { useState, useEffect, useMemo } from 'react';
import { createTractor, getBrokers, getDealers, getEnquiries } from '../lib/supabase';
import { INDIAN_STATES } from '../lib/indianStates';

const INITIAL = {
  make: '', model: '', year: '', hours_used: '', engine_hp: '',
  condition: 'Good', status: 'Available', expected_price: '',
  rc_number: '', serial_number: '', exchange_date: '',
  state: '', location_text: '', description: ''
};

const PRICE_FMT = (n) => n ? '\u20b9' + Number(n).toLocaleString('en-IN') : '\u2014';

// ── Score how relevant a broker is for this tractor ──────
function scoreBroker(broker, form) {
  let score = 0;
  const make = form.make.toLowerCase();
  const loc = form.location_text.toLowerCase();
  const state = form.state.toLowerCase();

  // Speciality matches make
  if (make && broker.speciality?.toLowerCase().includes(make)) score += 3;
  // Location matches tractor location or state
  if (loc && broker.location?.toLowerCase().includes(loc)) score += 2;
  if (state && broker.location?.toLowerCase().includes(state)) score += 1;
  // Active bonus
  if (broker.is_active) score += 1;

  return score;
}

// ── Score how well an enquiry matches this tractor ────────
function scoreEnquiry(eq, form) {
  if (eq.status === 'Sold' || eq.tractor_id) return 0; // already linked
  let score = 0;
  let checks = 0;
  const make = form.make.toLowerCase();
  const model = form.model.toLowerCase();

  if (eq.req_make) {
    checks++;
    if (make && eq.req_make.toLowerCase() === make) score++;
  }
  if (eq.req_model) {
    checks++;
    if (model && eq.req_model.toLowerCase().includes(model)) score++;
  }
  if (eq.req_year) {
    checks++;
    if (form.year && String(eq.req_year) === String(form.year)) score++;
  }
  if (eq.req_hp) {
    checks++;
    if (form.engine_hp && parseInt(form.engine_hp) >= parseInt(eq.req_hp)) score++;
  }
  if (eq.req_price_max) {
    checks++;
    const price = parseInt(String(form.expected_price).replace(/,/g, ''));
    if (price && price <= parseInt(eq.req_price_max)) score++;
  }

  // If no requirements set but enquiry is open — show as possible match
  if (checks === 0) return 0.1;
  return score / checks;
}

export default function TractorModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL);
  const [brokers, setBrokers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [selectedBrokers, setSelectedBrokers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBrokers().then(setBrokers).catch(() => {});
    getDealers().then(setDealers).catch(() => {});
    getEnquiries().then(data => setEnquiries(data.filter(e => e.status !== 'Sold'))).catch(() => {});
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleStateChange = (state) => {
    setForm(prev => ({ ...prev, state, location_text: '' }));
  };

  const dealersInState = form.state ? dealers.filter(d => d.state === form.state) : [];

  const toggleBroker = (id) => setSelectedBrokers(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  // ── Ranked brokers — top 10 by relevance ─────────────────
  const rankedBrokers = useMemo(() => {
    return brokers
      .map(b => ({ ...b, _score: scoreBroker(b, form) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [brokers, form.make, form.location_text, form.state]);

  // ── Matched enquiries — top 10 by relevance ──────────────
  const matchedEnquiries = useMemo(() => {
    return enquiries
      .map(eq => ({ ...eq, _score: scoreEnquiry(eq, form) }))
      .filter(eq => eq._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [enquiries, form.make, form.model, form.year, form.engine_hp, form.expected_price]);

  const scoreLabel = (s) => {
    if (s >= 0.8) return { text: 'Strong match', color: 'var(--green-dark)', bg: 'var(--green-light)' };
    if (s >= 0.4) return { text: 'Partial match', color: 'var(--amber-text)', bg: 'var(--amber-light)' };
    return { text: 'Possible', color: 'var(--gray-600)', bg: 'var(--gray-100)' };
  };

  const handleSubmit = async () => {
    if (!form.make || !form.model) return alert('Make and Model are required.');
    setSaving(true);
    try {
      const { state, ...rest } = form;
      await createTractor({
        ...rest,
        area_office: state,
        year: form.year ? parseInt(form.year) : null,
        engine_hp: form.engine_hp ? parseInt(form.engine_hp) : null,
        expected_price: form.expected_price ? parseInt(String(form.expected_price).replace(/,/g, '')) : null,
        exchange_date: form.exchange_date || null,
      }, selectedBrokers);
      onSaved();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>Add Exchange Tractor</h3>
          <button className="btn btn-sm btn-icon" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">

          {/* Make & Model */}
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

          {/* Year, Hours, HP */}
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

          {/* RC & Serial */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">RC Number</label>
              <input className="form-input" placeholder="RJ-14-CA-1234" value={form.rc_number} onChange={e => set('rc_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Serial / Chassis Number</label>
              <input className="form-input" placeholder="MH475DI2019XXXX" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
            </div>
          </div>

          {/* Price, Condition, Date */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Expected Price (Rs.)</label>
              <input className="form-input" placeholder="4,50,000" value={form.expected_price} onChange={e => set('expected_price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-input form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                {['Excellent', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Exchange</label>
              <input className="form-input" type="date" value={form.exchange_date} max={new Date().toISOString().slice(0,10)} onChange={e => set('exchange_date', e.target.value)} />
            </div>
          </div>

          {/* State & Dealer Location */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Area Office</label>
              <select className="form-input form-select" value={form.state} onChange={e => handleStateChange(e.target.value)}>
                <option value="">Select area office...</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Dealer Location
                {form.state && dealersInState.length === 0 && (
                  <span style={{ color: 'var(--gray-400)', fontWeight: 400, marginLeft: 6, textTransform: 'none' }}>
                    (no dealers in {form.state} area)
                  </span>
                )}
              </label>
              {dealersInState.length > 0 ? (
                <select className="form-input form-select" value={form.location_text} onChange={e => set('location_text', e.target.value)}>
                  <option value="">Select dealer location...</option>
                  {dealersInState.map(d => (
                    <option key={d.id} value={d.city}>{d.city} - {d.name}</option>
                  ))}
                </select>
              ) : (
                <input className="form-input"
                  placeholder={form.state ? 'Type location manually' : 'Select area office first'}
                  value={form.location_text} onChange={e => set('location_text', e.target.value)} />
              )}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" placeholder="Condition notes, service history..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* ── Suggested Brokers — ranked by relevance ── */}
          <div className="form-group">
            <label className="form-label">
              Eligible Brokers
              <span style={{ fontSize:11, fontWeight:400, color:'var(--gray-400)', marginLeft:6, textTransform:'none' }}>
                — top 10 by relevance to this tractor
              </span>
            </label>
            {rankedBrokers.length === 0 ? (
              <p className="text-muted text-sm">No brokers found. Add brokers first.</p>
            ) : (
              <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                {rankedBrokers.map((b, i) => {
                  const selected = selectedBrokers.includes(b.id);
                  const lbl = b._score > 0 ? scoreLabel(b._score) : null;
                  return (
                    <label key={b.id} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                      cursor:'pointer', borderBottom: i < rankedBrokers.length-1 ? '1px solid var(--border)' : 'none',
                      background: selected ? 'var(--green-light)' : '#fff',
                      transition:'background 0.1s'
                    }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleBroker(b.id)} style={{ width:14, height:14, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color: selected ? 'var(--green-dark)' : 'var(--gray-900)' }}>{b.name}</div>
                        <div style={{ fontSize:11, color:'var(--gray-400)' }}>{b.phone} · {b.location}{b.speciality ? ' · '+b.speciality : ''}</div>
                      </div>
                      {lbl && b._score > 0.1 && (
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:10, background:lbl.bg, color:lbl.color, whiteSpace:'nowrap' }}>
                          {lbl.text}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Matching Enquiries — buyers waiting for this tractor ── */}
          {matchedEnquiries.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Matching Enquiries
                <span style={{ fontSize:11, fontWeight:400, color:'var(--gray-400)', marginLeft:6, textTransform:'none' }}>
                  — {matchedEnquiries.length} buyer{matchedEnquiries.length>1?'s are':' is'} looking for a tractor like this
                </span>
              </label>
              <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                {matchedEnquiries.map((eq, i) => {
                  const lbl = scoreLabel(eq._score);
                  return (
                    <div key={eq.id} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                      borderBottom: i < matchedEnquiries.length-1 ? '1px solid var(--border)' : 'none',
                      background: eq._score >= 0.8 ? 'rgba(29,158,117,0.05)' : '#fff'
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{eq.buyer_name}</div>
                        <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:6, flexWrap:'wrap', marginTop:2 }}>
                          {eq.req_make && <span>{eq.req_make}</span>}
                          {eq.req_model && <span>{eq.req_model}</span>}
                          {eq.req_year && <span>{eq.req_year}</span>}
                          {eq.req_price_max && <span>Max {PRICE_FMT(eq.req_price_max)}</span>}
                          {eq.buyer_location && <span>📍 {eq.buyer_location}</span>}
                        </div>
                      </div>
                      {eq.buyer_phone && (
                        <a href={'tel:'+eq.buyer_phone} className="btn btn-sm btn-call" style={{ fontSize:11, padding:'3px 8px' }}
                          onClick={e => e.stopPropagation()}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        </a>
                      )}
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:10, background:lbl.bg, color:lbl.color, whiteSpace:'nowrap' }}>
                        {lbl.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Add Tractor'}</button>
        </div>
      </div>
    </div>
  );
}
