import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createTractor, getBrokers, getDealers, getEnquiries, uploadPhoto, updateTractor, supabase } from '../lib/supabase';
import { INDIAN_STATES } from '../lib/indianStates';

const INITIAL = {
  make: '', model: '', year: '', hours_used: '', engine_hp: '',
  condition: 'Good', status: 'Available', expected_price: '',
  rc_number: '', serial_number: '', exchange_date: '',
  state: '', location_text: '', description: ''
};

const PRICE_FMT = (n) => n ? '\u20b9' + Number(n).toLocaleString('en-IN') : '\u2014';

// ── Score how relevant a broker is for this tractor ──────
// ── Helper: tokenise a string into words for notes matching ──
function words(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

// ── Score how relevant a broker is for this tractor ──────
function scoreBroker(broker, form) {
  let score = 0;
  const make  = (form.make || '').toLowerCase().trim();
  const model = (form.model || '').toLowerCase().trim();
  const loc   = (form.location_text || '').toLowerCase().trim();
  const state = (form.state || '').toLowerCase().trim();
  const spec  = (broker.speciality || '').toLowerCase().trim();
  const bLoc  = (broker.location || '').toLowerCase().trim();
  const notes = (broker.notes || '').toLowerCase();

  // ── Speciality — only use if NOT "all" or blank ──────────
  const specIsAll = !spec || spec === 'all' || spec === 'all brands';
  if (!specIsAll && make) {
    if (spec.includes(make))  score += 4; // exact make in speciality
    if (spec.includes(model)) score += 2; // model also in speciality
  }

  // ── Location proximity ────────────────────────────────────
  // Exact city/location match
  if (loc && bLoc && (bLoc.includes(loc) || loc.includes(bLoc))) score += 3;
  // Same area office / state
  if (state && bLoc && bLoc.includes(state)) score += 2;

  // ── Notes text matching ───────────────────────────────────
  // Check if broker's notes mention the make, model, or location
  if (notes) {
    const noteWords = words(notes);
    if (make  && noteWords.some(w => w.includes(make)))  score += 2;
    if (model && noteWords.some(w => w.includes(model))) score += 2;
    if (loc   && noteWords.some(w => w.includes(loc)))   score += 3; // notes mention location — high signal
  }

  // Notes mention area office/state
  if (notes && state && words(notes).some(w => w.includes(state))) score += 2;

  // ── Active bonus ──────────────────────────────────────────
  if (broker.is_active) score += 1;

  return score;
}

// ── Score how well an enquiry matches this tractor ────────
function scoreEnquiry(eq, form) {
  if (eq.status === 'Sold' || eq.tractor_id) return 0; // already linked
  let score = 0;
  let maxScore = 0;

  const make  = (form.make  || '').toLowerCase().trim();
  const model = (form.model || '').toLowerCase().trim();
  const year  = String(form.year || '');
  const hp    = parseInt(form.engine_hp) || 0;
  const price = parseInt(String(form.expected_price || '').replace(/,/g, '')) || 0;
  const loc   = (form.location_text || '').toLowerCase().trim();
  const state = (form.state || '').toLowerCase().trim();

  const eqNotes = words((eq.notes || '') + ' ' + (eq.req_notes || ''));
  const bLoc    = (eq.buyer_location || '').toLowerCase().trim();

  // ── Make match — highest weight ───────────────────────────
  if (eq.req_make) {
    maxScore += 4;
    if (make && eq.req_make.toLowerCase() === make) score += 4;
    else if (make && eq.req_make.toLowerCase().includes(make)) score += 2;
  }

  // ── Model match ───────────────────────────────────────────
  if (eq.req_model) {
    maxScore += 3;
    if (model && eq.req_model.toLowerCase().includes(model)) score += 3;
    else if (model && model.includes(eq.req_model.toLowerCase())) score += 1;
  }

  // ── Year match ────────────────────────────────────────────
  if (eq.req_year) {
    maxScore += 2;
    if (year && String(eq.req_year) === year) score += 2;
  }

  // ── HP match ──────────────────────────────────────────────
  if (eq.req_hp) {
    maxScore += 2;
    if (hp && hp >= parseInt(eq.req_hp)) score += 2;
  }

  // ── Price match ───────────────────────────────────────────
  if (eq.req_price_max) {
    maxScore += 2;
    const maxP = parseInt(eq.req_price_max) || 0;
    if (price && price <= maxP) score += 2;
    else if (price && price <= maxP * 1.1) score += 1; // within 10% tolerance
  }

  // ── Notes text matching — make/model mentioned in buyer notes ──
  if (eqNotes.length > 0) {
    if (make  && eqNotes.some(w => w.includes(make)))  { score += 2; maxScore += 2; }
    if (model && eqNotes.some(w => w.includes(model))) { score += 1; maxScore += 1; }
  }

  // ── Location proximity ────────────────────────────────────
  if (bLoc) {
    if (loc   && (bLoc.includes(loc)   || loc.includes(bLoc)))   { score += 1; maxScore += 1; }
    if (state && (bLoc.includes(state) || state.includes(bLoc))) { score += 1; maxScore += 1; }
  }

  // If no requirements set but enquiry is open — very low possible match
  if (maxScore === 0) return 0.05;
  return score / maxScore;
}

export default function TractorModal({ onClose, onSaved, role }) {
  const [form, setForm] = useState(INITIAL);
  const [brokers, setBrokers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [selectedBrokers, setSelectedBrokers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]); // File objects
  const [photoPreviews, setPhotoPreviews] = useState([]); // object URLs
  const photoRef = useRef();

  const [fieldsLocked, setFieldsLocked] = useState(false);

  useEffect(() => {
    getBrokers().then(setBrokers).catch(() => {});
    getEnquiries().then(data => setEnquiries(data.filter(e => e.status !== 'Sold'))).catch(() => {});
    getDealers().then(dl => {
      setDealers(dl);
      if (role === 'field_agent') {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.email) {
            const match = dl.find(d => d.email?.toLowerCase() === user.email.toLowerCase());
            if (match) {
              setForm(prev => ({ ...prev, state: match.state || '', location_text: match.city || '' }));
              setFieldsLocked(true);
            }
          }
        });
      }
    }).catch(() => {});
  }, [role]);

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
  }, [brokers, form.make, form.model, form.location_text, form.state]);

  // ── Matched enquiries — top 10 by relevance ──────────────
  const matchedEnquiries = useMemo(() => {
    return enquiries
      .map(eq => ({ ...eq, _score: scoreEnquiry(eq, form) }))
      .filter(eq => eq._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [enquiries, form.make, form.model, form.year, form.engine_hp, form.expected_price, form.location_text, form.state]);

  const scoreLabel = (s) => {
    if (s >= 0.8) return { text: 'Strong match', color: 'var(--green-dark)', bg: 'var(--green-light)' };
    if (s >= 0.4) return { text: 'Partial match', color: 'var(--amber-text)', bg: 'var(--amber-light)' };
    return { text: 'Possible', color: 'var(--gray-600)', bg: 'var(--gray-100)' };
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 5 - photoFiles.length;
    if (remaining <= 0) { alert('Maximum 5 photos allowed.'); return; }
    const toAdd = files.slice(0, remaining);
    setPhotoFiles(prev => [...prev, ...toAdd]);
    setPhotoPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removePhoto = (i) => {
    URL.revokeObjectURL(photoPreviews[i]);
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i));
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!form.make || !form.model) return alert('Make and Model are required.');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { state, ...rest } = form;
      const tractor = await createTractor({
        ...rest,
        area_office: state,
        year: form.year ? parseInt(form.year) : null,
        engine_hp: form.engine_hp ? parseInt(form.engine_hp) : null,
        expected_price: form.expected_price ? parseInt(String(form.expected_price).replace(/,/g, '')) : null,
        exchange_date: form.exchange_date || null,
        owner_id: user?.id || null,
        owner_email: user?.email || null,
      }, selectedBrokers);

      // Upload photos and insert into tractor_photos
      for (let i = 0; i < photoFiles.length; i++) {
        const url = await uploadPhoto(tractor.id, photoFiles[i]);
        const isCover = i === 0;
        await supabase.from('tractor_photos').insert([{ tractor_id: tractor.id, photo_url: url, is_cover: isCover }]);
        if (isCover) await updateTractor(tractor.id, { cover_photo: url });
      }

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
              <label className="form-label">
                Area Office
                {fieldsLocked && <span style={{ fontSize:11, fontWeight:400, color:'var(--green-dark)', marginLeft:6, textTransform:'none' }}>— auto-set from your dealer profile</span>}
              </label>
              <select className="form-input form-select" value={form.state} onChange={e => handleStateChange(e.target.value)} disabled={fieldsLocked}>
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
                <select className="form-input form-select" value={form.location_text} onChange={e => set('location_text', e.target.value)} disabled={fieldsLocked}>
                  <option value="">Select dealer location...</option>
                  {dealersInState.map(d => (
                    <option key={d.id} value={d.city}>{d.city} - {d.name}</option>
                  ))}
                </select>
              ) : (
                <input className="form-input"
                  placeholder={form.state ? 'Type location manually' : 'Select area office first'}
                  value={form.location_text} onChange={e => set('location_text', e.target.value)} disabled={fieldsLocked} />
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="form-group">
            <label className="form-label">
              Photos
              <span style={{ fontSize:11, fontWeight:400, color:'var(--gray-400)', marginLeft:6, textTransform:'none' }}>
                — up to 5, first photo becomes cover
              </span>
            </label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'flex-start' }}>
              {photoPreviews.map((src, i) => (
                <div key={i} style={{ position:'relative', width:80, height:80, borderRadius:8, overflow:'hidden', border:'1px solid var(--border-md)', flexShrink:0 }}>
                  <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  {i === 0 && (
                    <span style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.5)', color:'#fff', fontSize:9, textAlign:'center', padding:'2px 0', fontWeight:700 }}>COVER</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,0.55)', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', color:'#fff', fontSize:12, lineHeight:'18px', textAlign:'center', padding:0 }}
                  >×</button>
                </div>
              ))}
              {photoFiles.length < 5 && (
                <div
                  onClick={() => photoRef.current?.click()}
                  style={{ width:80, height:80, borderRadius:8, border:'2px dashed var(--border-md)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--gray-400)', gap:4, flexShrink:0, background:'var(--gray-50)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{ fontSize:10 }}>Add Photo</span>
                </div>
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePhotoSelect} />
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
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? (photoFiles.length ? 'Saving & uploading photos…' : 'Saving...') : 'Add Tractor'}</button>
        </div>
      </div>
    </div>
  );
}
