import React, { useState, useEffect, useCallback } from 'react';
import {
  getEnquiries, createEnquiry, updateEnquiry, deleteEnquiry,
  markTractorSoldToEnquiry, getTractors, getBrokers, getDealers
} from '../lib/supabase';
import { exportEnquiriesToExcel } from '../lib/exportToExcel';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';
const STATUS_COLORS = { New: 'tag-blue', Negotiating: 'tag-amber', Sold: 'tag-green', Lost: 'tag-gray' };

const INIT_FORM = {
  tractor_id: '', source: 'manual',
  broker_id: '', dealer_id: '',
  buyer_name: '', buyer_phone: '', buyer_whatsapp: '', buyer_location: '',
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eq, tr, br, dl] = await Promise.all([
        getEnquiries(), getTractors(), getBrokers(), getDealers()
      ]);
      setEnquiries(eq); setTractors(tr); setBrokers(br); setDealers(dl);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // When source changes, clear the other selector
  const setSource = (src) => {
    setForm(prev => ({ ...prev, source: src, broker_id: '', dealer_id: '', buyer_name: '', buyer_phone: '', buyer_whatsapp: '' }));
  };

  // Auto-fill buyer details when broker/dealer is selected
  const selectBroker = (id) => {
    const b = brokers.find(x => x.id === id);
    if (b) setForm(prev => ({ ...prev, broker_id: id, buyer_name: b.name, buyer_phone: b.phone || '', buyer_whatsapp: b.whatsapp || b.phone || '', buyer_location: b.location || '' }));
    else setForm(prev => ({ ...prev, broker_id: id }));
  };

  const selectDealer = (id) => {
    const d = dealers.find(x => x.id === id);
    if (d) setForm(prev => ({ ...prev, dealer_id: id, buyer_name: d.contact_person || d.name, buyer_phone: d.phone || '', buyer_whatsapp: d.whatsapp || d.phone || '', buyer_location: d.city || '' }));
    else setForm(prev => ({ ...prev, dealer_id: id }));
  };

  const openAdd = () => { setEditing(null); setForm(INIT_FORM); setShowModal(true); };
  const openEdit = (eq) => {
    setEditing(eq.id);
    setForm({
      tractor_id: eq.tractor_id || '',
      source: eq.source || 'manual',
      broker_id: eq.broker_id || '',
      dealer_id: eq.dealer_id || '',
      buyer_name: eq.buyer_name || '',
      buyer_phone: eq.buyer_phone || '',
      buyer_whatsapp: eq.buyer_whatsapp || '',
      buyer_location: eq.buyer_location || '',
      offered_price: eq.offered_price || '',
      status: eq.status || 'New',
      notes: eq.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.buyer_name) return alert('Buyer name is required.');
    if (!form.tractor_id) return alert('Please select a tractor.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        broker_id: form.source === 'broker' ? form.broker_id || null : null,
        dealer_id: form.source === 'dealer' ? form.dealer_id || null : null,
        offered_price: form.offered_price ? parseInt(String(form.offered_price).replace(/,/g, '')) : null,
      };
      if (editing) await updateEnquiry(editing, payload);
      else await createEnquiry(payload);
      load(); setShowModal(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleMarkSold = async (eq) => {
    if (!eq.tractor_id) return alert('No tractor linked to this enquiry.');
    const tractor = tractors.find(t => t.id === eq.tractor_id);
    if (!window.confirm(`Mark "${tractor?.make} ${tractor?.model}" as SOLD to ${eq.buyer_name}?`)) return;
    try {
      await markTractorSoldToEnquiry(eq.tractor_id, eq.id);
      load();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try { await deleteEnquiry(id); load(); } catch (e) { alert(e.message); }
  };

  const handleStatusChange = async (id, status) => {
    try { await updateEnquiry(id, { status }); load(); } catch (e) { alert(e.message); }
  };

  const filtered = enquiries.filter(eq => {
    const matchStatus = filterStatus === 'All' || eq.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || eq.buyer_name?.toLowerCase().includes(q) || eq.tractors?.make?.toLowerCase().includes(q) || eq.tractors?.model?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = { All: enquiries.length, New: 0, Negotiating: 0, Sold: 0, Lost: 0 };
  enquiries.forEach(eq => { if (counts[eq.status] !== undefined) counts[eq.status]++; });

  return (
    <>
      <div className="topbar">
        <h2>Enquiries</h2>
        <div className="topbar-actions">
          <input className="search-input" placeholder="Search buyer or tractor…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {['All', 'New', 'Negotiating', 'Sold', 'Lost'].map(s => (
              <option key={s} value={s}>{s} ({counts[s]})</option>
            ))}
          </select>
          <button className="btn" onClick={() => exportEnquiriesToExcel(enquiries)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Enquiry</button>
        </div>
      </div>

      <div className="content">
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: counts.All, color: 'var(--gray-900)' },
            { label: 'New', value: counts.New, color: 'var(--blue)' },
            { label: 'Negotiating', value: counts.Negotiating, color: 'var(--amber)' },
            { label: 'Sold', value: counts.Sold, color: 'var(--green)' },
            { label: 'Lost', value: counts.Lost, color: 'var(--gray-400)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No enquiries found.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Tractor</th>
                  <th>Offered Price</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(eq => {
                  const tractor = eq.tractors;
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{eq.buyer_name}</div>
                        {eq.buyer_phone && (
                          <div className="flex gap-8" style={{ marginTop: 4 }}>
                            <a href={'tel:' + eq.buyer_phone} className="btn btn-sm btn-call" style={{ padding: '2px 8px', fontSize: 11 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> Call
                            </a>
                            <a href={'https://wa.me/' + (eq.buyer_whatsapp || eq.buyer_phone).replace(/[^0-9]/g, '')} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa" style={{ padding: '2px 8px', fontSize: 11 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> WA
                            </a>
                          </div>
                        )}
                        {eq.buyer_location && <div className="text-muted text-sm" style={{ marginTop: 2 }}>📍 {eq.buyer_location}</div>}
                      </td>
                      <td>
                        {tractor ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{tractor.make} {tractor.model}</div>
                            <div className="text-muted text-sm">{tractor.year} · {PRICE_FMT(tractor.expected_price)}</div>
                            <span className={`tag status-${tractor.status}`} style={{ fontSize: 10, marginTop: 2, display: 'inline-block', padding: '1px 7px', borderRadius: 10 }}>{tractor.status}</span>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td><span style={{ fontWeight: 600, color: 'var(--green)' }}>{PRICE_FMT(eq.offered_price)}</span></td>
                      <td><span className={`tag ${eq.source === 'broker' ? 'tag-blue' : eq.source === 'dealer' ? 'tag-amber' : 'tag-gray'}`}>{eq.source}</span></td>
                      <td>
                        <select
                          className="form-input form-select"
                          style={{ padding: '3px 24px 3px 8px', fontSize: 12, width: 120 }}
                          value={eq.status}
                          onChange={e => handleStatusChange(eq.id, e.target.value)}
                        >
                          {['New', 'Negotiating', 'Sold', 'Lost'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="text-muted text-sm">{new Date(eq.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="flex gap-8">
                          {eq.status !== 'Sold' && tractor?.status !== 'Sold' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleMarkSold(eq)}
                              title="Mark tractor as sold to this buyer"
                            >
                              ✓ Mark Sold
                            </button>
                          )}
                          <button className="btn btn-sm" onClick={() => openEdit(eq)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(eq.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Enquiry' : 'Add Enquiry'}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Tractor selection */}
              <div className="form-group">
                <label className="form-label">Tractor *</label>
                <select className="form-input form-select" value={form.tractor_id} onChange={e => set('tractor_id', e.target.value)}>
                  <option value="">Select tractor…</option>
                  {tractors.filter(t => t.status !== 'Sold').map(t => (
                    <option key={t.id} value={t.id}>{t.make} {t.model} ({t.year}) — {PRICE_FMT(t.expected_price)}</option>
                  ))}
                </select>
              </div>

              {/* Source toggle */}
              <div className="form-group">
                <label className="form-label">Buyer Source</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['broker', 'dealer', 'manual'].map(src => (
                    <button
                      key={src}
                      type="button"
                      className="btn"
                      style={{
                        flex: 1, justifyContent: 'center', textTransform: 'capitalize',
                        background: form.source === src ? 'var(--green-light)' : '#fff',
                        color: form.source === src ? 'var(--green-dark)' : 'var(--gray-600)',
                        borderColor: form.source === src ? 'var(--green)' : 'var(--border-md)',
                        fontWeight: form.source === src ? 600 : 400,
                      }}
                      onClick={() => setSource(src)}
                    >
                      {src === 'broker' ? '👤 From Broker' : src === 'dealer' ? '🏪 From Dealer' : '✏️ Manual'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Broker selector */}
              {form.source === 'broker' && (
                <div className="form-group">
                  <label className="form-label">Select Broker</label>
                  <select className="form-input form-select" value={form.broker_id} onChange={e => selectBroker(e.target.value)}>
                    <option value="">Choose from broker list…</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name} — {b.phone} — {b.location}</option>)}
                  </select>
                </div>
              )}

              {/* Dealer selector */}
              {form.source === 'dealer' && (
                <div className="form-group">
                  <label className="form-label">Select Dealer</label>
                  <select className="form-input form-select" value={form.dealer_id} onChange={e => selectDealer(e.target.value)}>
                    <option value="">Choose from dealer list…</option>
                    {dealers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.contact_person} — {d.city}</option>)}
                  </select>
                </div>
              )}

              {/* Buyer details — auto-filled from broker/dealer, editable */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Buyer Details {form.source !== 'manual' ? '(auto-filled, editable)' : ''}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className="form-input" value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} placeholder="Buyer name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-input" value={form.buyer_location} onChange={e => set('buyer_location', e.target.value)} placeholder="City, State" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.buyer_phone} onChange={e => set('buyer_phone', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input className="form-input" value={form.buyer_whatsapp} onChange={e => set('buyer_whatsapp', e.target.value)} placeholder="919876543210" />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Offered Price (₹)</label>
                  <input className="form-input" value={form.offered_price} onChange={e => set('offered_price', e.target.value)} placeholder="e.g. 3,50,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    {['New', 'Negotiating', 'Sold', 'Lost'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional details…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Add Enquiry')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
