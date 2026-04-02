import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTractorById, getTractorDocuments, updateTractor,
  uploadDocument, uploadPhoto, supabase,
  getBrokers, getDealers, createEnquiry, markTractorSoldToEnquiry
} from '../lib/supabase';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '—';
const STATUS_OPTIONS = ['Available', 'Pending', 'Sold'];

export default function TractorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tractor, setTractor] = useState(null);
  const [docs, setDocs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const docRef = useRef();
  const photoRef = useRef();

  // ── Mark Sold modal state ─────────────────────────────
  const [soldModal, setSoldModal] = useState(false);
  const [soldForm, setSoldForm] = useState({
    source: 'manual', broker_id: '', dealer_id: '',
    buyer_name: '', buyer_phone: '', buyer_whatsapp: '', buyer_location: '',
    offered_price: '', sale_date: new Date().toISOString().slice(0,10), notes: ''
  });
  const [brokers, setBrokers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [markingSold, setMarkingSold] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0); // index of selected thumbnail; gallery overlay opens on click

  // Keyboard nav — only active when gallery overlay is open
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (!galleryOpen) return;
      if (e.key === 'Escape') setGalleryOpen(false);
      if (e.key === 'ArrowRight') setGalleryIndex(i => Math.min((i ?? 0) + 1, photos.length - 1));
      if (e.key === 'ArrowLeft') setGalleryIndex(i => Math.max((i ?? 0) - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galleryOpen, photos.length]);

  const load = async () => {
    setLoading(true);
    try {
      const t = await getTractorById(id);
      setTractor(t);
      setDocs(await getTractorDocuments(id));
      const { data: ph } = await supabase.from('tractor_photos').select('*').eq('tractor_id', id).order('created_at');
      setPhotos(ph || []);
      const [br, dl] = await Promise.all([getBrokers(), getDealers()]);
      setBrokers(br); setDealers(dl);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async (status) => {
    // If already Sold — block any change
    if (tractor.status === 'Sold') {
      alert('This tractor is already marked as Sold. Status cannot be changed.');
      return;
    }
    // If changing TO Sold — open the modal for buyer details
    if (status === 'Sold') {
      setSoldForm(prev => ({ ...prev, sale_date: new Date().toISOString().slice(0,10) }));
      setSoldModal(true);
      return;
    }
    try {
      await updateTractor(id, { status });
      setTractor(prev => ({ ...prev, status }));
    } catch (e) { alert(e.message); }
  };

  const setSoldField = (k, v) => setSoldForm(prev => ({ ...prev, [k]: v }));

  const selectBrokerSold = (bid) => {
    const b = brokers.find(x => x.id === bid);
    if (b) setSoldForm(prev => ({ ...prev, broker_id: bid, buyer_name: b.name, buyer_phone: b.phone||'', buyer_whatsapp: b.whatsapp||b.phone||'', buyer_location: b.location||'' }));
    else setSoldField('broker_id', bid);
  };

  const selectDealerSold = (did) => {
    const d = dealers.find(x => x.id === did);
    if (d) setSoldForm(prev => ({ ...prev, dealer_id: did, buyer_name: d.contact_person||d.name, buyer_phone: d.phone||'', buyer_whatsapp: d.whatsapp||d.phone||'', buyer_location: d.city||'' }));
    else setSoldField('dealer_id', did);
  };

  const confirmMarkSold = async () => {
    if (!soldForm.buyer_name) return alert('Buyer name is required.');
    if (!soldForm.sale_date) return alert('Sale date is required.');
    setMarkingSold(true);
    try {
      // 1. Create an enquiry record with all buyer details
      const enquiry = await createEnquiry({
        tractor_id: id,
        source: soldForm.source,
        broker_id: soldForm.source === 'broker' ? soldForm.broker_id || null : null,
        dealer_id: soldForm.source === 'dealer' ? soldForm.dealer_id || null : null,
        buyer_name: soldForm.buyer_name,
        buyer_phone: soldForm.buyer_phone,
        buyer_whatsapp: soldForm.buyer_whatsapp,
        buyer_location: soldForm.buyer_location,
        offered_price: soldForm.offered_price ? parseInt(String(soldForm.offered_price).replace(/,/g,'')) : null,
        notes: soldForm.notes,
        status: 'Sold',
      });
      // 2. Mark tractor as Sold with sale date — updates status everywhere
      await markTractorSoldToEnquiry(id, enquiry.id, soldForm.sale_date);
      // 3. Reload tractor
      setTractor(prev => ({ ...prev, status: 'Sold', sold_at: new Date(soldForm.sale_date).toISOString() }));
      setSoldModal(false);
      alert('Tractor marked as Sold. Sale recorded in Enquiries.');
    } catch (e) { alert(e.message); }
    finally { setMarkingSold(false); }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const newDoc = await uploadDocument(id, file);
      setDocs(function(prev) { return [...prev, newDoc]; });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const MAX_PHOTOS = 5;

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) { alert('Maximum 5 photos allowed. Delete one to add more.'); return; }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) alert(`Only ${remaining} more photo(s) allowed. Uploading first ${remaining}.`);
    setUploading(true);
    try {
      for (const file of toUpload) {
        const url = await uploadPhoto(id, file);
        const isCover = photos.length === 0;
        const { data } = await supabase.from('tractor_photos').insert([{ tractor_id: id, photo_url: url, is_cover: isCover }]).select().single();
        if (isCover) { await updateTractor(id, { cover_photo: url }); setTractor(prev => ({ ...prev, cover_photo: url })); }
        setPhotos(prev => [...prev, data]);
      }
    } catch (err) { alert(err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const deleteDoc = async (docId) => {
    await supabase.from('tractor_documents').delete().eq('id', docId);
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  const deletePhoto = async (ph) => {
    await supabase.from('tractor_photos').delete().eq('id', ph.id);
    const remaining = photos.filter(p => p.id !== ph.id);
    setPhotos(remaining);
    if (ph.is_cover && remaining.length > 0) {
      const newCover = remaining[0].photo_url;
      await supabase.from('tractor_photos').update({ is_cover: true }).eq('id', remaining[0].id);
      await updateTractor(id, { cover_photo: newCover });
      setTractor(prev => ({ ...prev, cover_photo: newCover }));
    }
    if (remaining.length === 0) await updateTractor(id, { cover_photo: null });
  };

  const setCover = async (ph) => {
    await supabase.from('tractor_photos').update({ is_cover: false }).eq('tractor_id', id);
    await supabase.from('tractor_photos').update({ is_cover: true }).eq('id', ph.id);
    await updateTractor(id, { cover_photo: ph.photo_url });
    setTractor(prev => ({ ...prev, cover_photo: ph.photo_url }));
    setPhotos(prev => prev.map(p => ({ ...p, is_cover: p.id === ph.id })));
  };

  const shareUrl = tractor ? `${window.location.origin}/market/${tractor.share_token}` : '';

  const shareWA = () => {
    if (!tractor) return;
    const msg = `🚜 *${tractor.make} ${tractor.model}* (${tractor.year})\n📍 ${tractor.location_text}\n⏱ ${tractor.hours_used}\n💰 ${PRICE_FMT(tractor.expected_price)}\n\n🔗 ${shareUrl}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  if (loading) return <div className="content"><div className="spinner" /></div>;
  if (!tractor) return <div className="content"><p>Tractor not found.</p></div>;

  const tractorBrokers = tractor.tractor_brokers?.map(tb => tb.brokers) || [];
  const mainPhoto = tractor.cover_photo;

  return (
    <>
      <div className="topbar" style={{ flexWrap:'wrap', gap:10 }}>
        <div className="flex flex-center gap-12" style={{ minWidth:0 }}>
          <button className="btn btn-sm" onClick={() => navigate('/')}>← Back</button>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'40vw' }}>{tractor.make} {tractor.model}</h2>
            <span className={`status-badge status-${tractor.status}`} style={{ position:'static', display:'inline-block', marginTop:2 }}>{tractor.status}</span>
          </div>
        </div>
        <div className="topbar-actions" style={{ flexWrap:'wrap' }}>
          {tractor.status === 'Sold' ? (
            <span className="status-badge status-Sold" style={{ fontSize:13, padding:'6px 14px' }}>
              Sold {tractor.sold_at ? '— ' + new Date(tractor.sold_at).toLocaleDateString('en-IN') : ''}
            </span>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <select className="form-input form-select" style={{ width: 140 }} value={tractor.status}
                onChange={e => handleStatusChange(e.target.value)}>
                {['Available','Pending'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => handleStatusChange('Sold')}>
                ✓ Mark as Sold
              </button>
            </div>
          )}
          <button className="btn btn-wa" onClick={shareWA}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> Share on WhatsApp</button>
        </div>
      </div>

      <div className="content" style={{ padding: '16px 20px' }}>
        <div className="detail-layout">
          {/* LEFT COLUMN — Photos + Docs */}
          <div>
            {/* ── Amazon-style photo viewer ── */}
            <div style={{ marginBottom: 16 }}>
              {photos.length === 0 ? (
                <div onClick={() => photoRef.current?.click()} style={{
                  width:'100%', height:200, border:'2px dashed var(--border-md)',
                  borderRadius:'var(--radius-lg)', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', cursor:'pointer',
                  color:'var(--gray-400)', gap:8, background:'var(--gray-50)'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{ fontSize:13, fontWeight:500 }}>Add photos</span>
                  <span style={{ fontSize:11 }}>Up to 5 photos</span>
                </div>
              ) : (
                <div style={{ display:'flex', gap:8 }}>

                  {/* ── Thumbnail column — left side ── */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                    {photos.map((ph, i) => (
                      <div
                        key={ph.id}
                        onClick={() => setGalleryIndex(i)}
                        style={{
                          width: 64, height: 64, borderRadius: 8, overflow:'hidden',
                          cursor:'pointer', flexShrink:0,
                          border: galleryIndex === i
                            ? '2px solid var(--green)'
                            : '2px solid var(--border)',
                          background:'var(--gray-100)',
                          transition:'border-color 0.15s',
                        }}
                      >
                        <img src={ph.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                    ))}
                    {/* Add photo thumb */}
                    {photos.length < 5 && (
                      <div
                        onClick={() => photoRef.current?.click()}
                        style={{
                          width:64, height:64, borderRadius:8, border:'2px dashed var(--border-md)',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          cursor:'pointer', color:'var(--gray-400)', gap:2,
                          background:'var(--gray-50)', fontSize:11,
                        }}
                        title="Add photo"
                      >
                        <span style={{ fontSize:20, lineHeight:1 }}>+</span>
                        <span style={{ fontSize:9 }}>{photos.length}/5</span>
                      </div>
                    )}
                  </div>

                  {/* ── Main image — right side ── */}
                  <div style={{ flex:1, minWidth:0, position:'relative' }}>
                    <div
                      onClick={() => setGalleryOpen(true)}
                      style={{
                        width:'100%',
                        height: 320,
                        borderRadius: 'var(--radius-lg)', overflow:'hidden',
                        background:'var(--gray-50)', border:'1px solid var(--border)',
                        cursor:'zoom-in',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        position:'relative',
                      }}
                    >
                      <img
                        src={photos[galleryIndex ?? 0]?.photo_url}
                        alt={tractor.make + ' ' + tractor.model}
                        style={{
                          maxWidth:'100%',
                          maxHeight:'100%',
                          width:'auto',
                          height:'auto',
                          objectFit:'contain',
                          display:'block',
                        }}
                      />
                      {/* Zoom hint */}
                      <div style={{
                        position:'absolute', bottom:8, right:8,
                        background:'rgba(0,0,0,0.45)', color:'#fff',
                        fontSize:10, padding:'3px 8px', borderRadius:20,
                        display:'flex', alignItems:'center', gap:4,
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                        Tap to zoom
                      </div>
                      {/* Delete button on main image */}
                      <button
                        onClick={e => { e.stopPropagation(); deletePhoto(photos[galleryIndex ?? 0]); setGalleryIndex(null); }}
                        style={{
                          position:'absolute', top:8, right:8,
                          background:'rgba(226,75,74,0.8)', color:'#fff',
                          border:'none', borderRadius:'50%',
                          width:26, height:26, cursor:'pointer', fontSize:14,
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}
                        title="Delete this photo"
                      >✕</button>
                      {/* Cover badge */}
                      {photos[galleryIndex ?? 0]?.is_cover && (
                        <span style={{
                          position:'absolute', top:8, left:8,
                          fontSize:10, fontWeight:700, background:'var(--green)',
                          color:'#fff', padding:'2px 8px', borderRadius:10,
                        }}>Cover</span>
                      )}
                      {/* Set as cover button */}
                      {!photos[galleryIndex ?? 0]?.is_cover && (
                        <button
                          onClick={e => { e.stopPropagation(); setCover(photos[galleryIndex ?? 0]); }}
                          style={{
                            position:'absolute', top:8, left:8,
                            background:'rgba(0,0,0,0.45)', color:'#fff', border:'none',
                            borderRadius:12, padding:'2px 10px', fontSize:10,
                            cursor:'pointer', fontWeight:600,
                          }}
                        >Set Cover</button>
                      )}
                    </div>

                    {/* Photo counter */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                      <span style={{ fontSize:11, color:'var(--gray-400)' }}>
                        {(galleryIndex ?? 0) + 1} of {photos.length}
                      </span>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-sm"
                          disabled={(galleryIndex ?? 0) === 0}
                          onClick={() => setGalleryIndex(i => Math.max((i ?? 0) - 1, 0))}
                          style={{ padding:'4px 10px' }}>‹</button>
                        <button className="btn btn-sm"
                          disabled={(galleryIndex ?? 0) >= photos.length - 1}
                          onClick={() => setGalleryIndex(i => Math.min((i ?? 0) + 1, photos.length - 1))}
                          style={{ padding:'4px 10px' }}>›</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePhotoUpload} />

            {/* Documents */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <h3>Documents</h3>
                <button className="btn btn-sm" onClick={() => docRef.current?.click()} disabled={uploading}>
                  {uploading ? '…' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Upload'}
                </button>
                <input ref={docRef} type="file" style={{ display:'none' }} onChange={handleDocUpload} />
              </div>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                {docs.length === 0 && <p className="text-muted text-sm">No documents yet. Upload RC Book, Insurance, etc.</p>}
                {docs.map(doc => (
                  <div key={doc.id} className="doc-row">
                    <div className="doc-icon">{doc.file_type || 'FILE'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                      <div className="text-muted text-sm">{doc.file_size ? Math.round(doc.file_size/1024) + ' KB' : ''}</div>
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn btn-sm">View</a>
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => deleteDoc(doc.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Key stats — price, year, hours, HP */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <div className="stat-card" style={{ gridColumn:'1/-1' }}>
                <div className="stat-label">Expected Price</div>
                <div className="stat-value price-value">{PRICE_FMT(tractor.expected_price)}</div>
              </div>
              <div className="stat-card"><div className="stat-label">Year</div><div className="stat-value">{tractor.year || '—'}</div></div>
              <div className="stat-card"><div className="stat-label">Condition</div><div className="stat-value">{tractor.condition || '—'}</div></div>
              {tractor.hours_used && <div className="stat-card"><div className="stat-label">Hours Used</div><div className="stat-value" style={{ fontSize:14 }}>{tractor.hours_used}</div></div>}
              {tractor.engine_hp && <div className="stat-card"><div className="stat-label">Engine</div><div className="stat-value" style={{ fontSize:14 }}>{tractor.engine_hp} HP</div></div>}
            </div>

            {/* Info */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Details</h3></div>
              <div className="card-body">
                {[
                  ['Year', tractor.year],
                  ['Hours Used', tractor.hours_used],
                  ['Engine', tractor.engine_hp ? tractor.engine_hp + ' HP' : null],
                  ['Condition', tractor.condition],
                  ['RC Number', tractor.rc_number],
                  ['Serial / Chassis No.', tractor.serial_number],
                  ['Date of Exchange', tractor.exchange_date ? new Date(tractor.exchange_date).toLocaleDateString('en-IN') : null],
                  ['Area Office', tractor.area_office],
                  ['Location', tractor.location_text],
                  ['Sold On', tractor.sold_at ? new Date(tractor.sold_at).toLocaleDateString('en-IN') : null],
                ].filter(([,v]) => v).map(([label, val]) => (
                  <div key={label} className="info-row"><span className="label">{label}</span><span className="font-bold">{val}</span></div>
                ))}
                {tractor.description && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--gray-600)' }}>{tractor.description}</p>}
              </div>
            </div>

            {/* Share */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Share</h3></div>
              <div className="card-body">
                <div className="share-url-bar">
                  <span>{shareUrl}</span>
                  <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('Copied!'))}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</button>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-wa" style={{ flex:1 }} onClick={shareWA}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> WhatsApp</button>
                  <a className="btn" style={{ flex:1, justifyContent:'center' }} href={shareUrl} target="_blank" rel="noreferrer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Preview</a>
                </div>
              </div>
            </div>

            {/* Eligible Brokers */}
            <div className="card">
              <div className="card-header"><h3>Eligible Brokers</h3><span className="tag tag-green">{tractorBrokers.length}</span></div>
              <div className="card-body" style={{ padding: '8px 16px' }}>
                {tractorBrokers.length === 0 && <p className="text-muted text-sm" style={{ padding:'8px 0' }}>No brokers assigned.</p>}
                {tractorBrokers.map(b => b && (
                  <div key={b.id} className="flex flex-center gap-8" style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                    <div className="avatar av-green">{b.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{b.name}</div>
                      <div className="text-muted text-sm">{b.phone} · {b.location}</div>
                    </div>
                    <a href={'https://wa.me/' + (b.whatsapp || (b.phone||'').replace(/[^0-9]/g,'')) + '?text=' + encodeURIComponent('Hi ' + b.name + ', I have a tractor for you: ' + shareUrl)} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg></a>
                    <a href={'tel:' + (b.phone||'')} className="btn btn-sm btn-call"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo Gallery Overlay ── */}
      {galleryOpen && photos.length > 0 && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
          onClick={() => setGalleryOpen(false)}
        >
          {/* Close */}
          <button
            onClick={() => setGalleryOpen(false)}
            style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)',
              border:'none', color:'#fff', width:40, height:40, borderRadius:'50%', cursor:'pointer',
              fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}
          >✕</button>

          {/* Counter */}
          <div style={{ position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
            color:'rgba(255,255,255,0.7)', fontSize:13 }}>
            {galleryIndex + 1} / {photos.length}
          </div>

          {/* Prev arrow */}
          {galleryIndex > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setGalleryIndex(galleryIndex - 1); }}
              style={{ position:'absolute', left:16, background:'rgba(255,255,255,0.15)', border:'none',
                color:'#fff', width:44, height:44, borderRadius:'50%', cursor:'pointer',
                fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}
            >‹</button>
          )}

          {/* Main image */}
          <img
            src={photos[galleryIndex]?.photo_url}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain',
              borderRadius:8, userSelect:'none' }}
          />

          {/* Next arrow */}
          {galleryIndex < photos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setGalleryIndex(galleryIndex + 1); }}
              style={{ position:'absolute', right:16, background:'rgba(255,255,255,0.15)', border:'none',
                color:'#fff', width:44, height:44, borderRadius:'50%', cursor:'pointer',
                fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}
            >›</button>
          )}

          {/* Thumbnail strip at bottom */}
          <div style={{ position:'absolute', bottom:16, display:'flex', gap:8, padding:'0 16px',
            maxWidth:'100vw', overflowX:'auto' }}>
            {photos.map((ph, i) => (
              <div key={ph.id}
                onClick={e => { e.stopPropagation(); setGalleryIndex(i); }}
                style={{ width:56, height:42, flexShrink:0, borderRadius:6, overflow:'hidden', cursor:'pointer',
                  border: i === galleryIndex ? '2px solid #fff' : '2px solid transparent',
                  opacity: i === galleryIndex ? 1 : 0.55, transition:'opacity 0.15s, border-color 0.15s' }}
              >
                <img src={ph.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            ))}
            {/* Delete current in gallery */}
            <button
              onClick={e => { e.stopPropagation(); deletePhoto(photos[galleryIndex]); setGalleryIndex(prev => Math.min(prev, photos.length - 2)); }}
              style={{ flexShrink:0, width:42, height:42, borderRadius:6, border:'1px solid rgba(255,255,255,0.3)',
                background:'rgba(226,75,74,0.7)', color:'#fff', cursor:'pointer', fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center' }}
              title="Delete this photo"
            >✕</button>
            {/* Set as cover in gallery */}
            <button
              onClick={e => { e.stopPropagation(); setCover(photos[galleryIndex]); }}
              style={{ flexShrink:0, padding:'0 12px', height:42, borderRadius:6,
                border:'1px solid rgba(255,255,255,0.3)', background:'rgba(29,158,117,0.7)',
                color:'#fff', cursor:'pointer', fontSize:12, whiteSpace:'nowrap' }}
              title="Set as cover photo"
            >Set Cover</button>
          </div>
        </div>
      )}

      {/* ── Mark as Sold Modal ── */}
      {soldModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSoldModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>Mark as Sold — {tractor.make} {tractor.model}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setSoldModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Buyer source */}
              <div className="form-group">
                <label className="form-label">Buyer Source</label>
                <div style={{ display:'flex', gap:8 }}>
                  {['broker','dealer','manual'].map(src => (
                    <button key={src} type="button" className="btn" style={{
                      flex:1, justifyContent:'center', textTransform:'capitalize',
                      background: soldForm.source===src ? 'var(--green-light)' : '#fff',
                      color: soldForm.source===src ? 'var(--green-dark)' : 'var(--gray-600)',
                      borderColor: soldForm.source===src ? 'var(--green)' : 'var(--border-md)',
                      fontWeight: soldForm.source===src ? 600 : 400,
                    }}
                    onClick={() => setSoldForm(prev => ({ ...prev, source: src, broker_id:'', dealer_id:'', buyer_name:'', buyer_phone:'', buyer_whatsapp:'' }))}>
                      {src==='broker' ? 'From Broker' : src==='dealer' ? 'From Dealer' : 'Manual'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Broker selector */}
              {soldForm.source === 'broker' && (
                <div className="form-group">
                  <label className="form-label">Select Broker</label>
                  <select className="form-input form-select" value={soldForm.broker_id} onChange={e => selectBrokerSold(e.target.value)}>
                    <option value="">Choose from broker list…</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name} — {b.phone} — {b.location}</option>)}
                  </select>
                </div>
              )}

              {/* Dealer selector */}
              {soldForm.source === 'dealer' && (
                <div className="form-group">
                  <label className="form-label">Select Dealer</label>
                  <select className="form-input form-select" value={soldForm.dealer_id} onChange={e => selectDealerSold(e.target.value)}>
                    <option value="">Choose from dealer list…</option>
                    {dealers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.contact_person} — {d.city}</option>)}
                  </select>
                </div>
              )}

              {/* Buyer details */}
              <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'12px 14px', marginBottom:14, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                  Buyer Details {soldForm.source !== 'manual' ? '(auto-filled, editable)' : ''}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Buyer Name *</label>
                    <input className="form-input" value={soldForm.buyer_name} onChange={e => setSoldField('buyer_name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-input" value={soldForm.buyer_location} onChange={e => setSoldField('buyer_location', e.target.value)} placeholder="City, State" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={soldForm.buyer_phone} onChange={e => setSoldField('buyer_phone', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input className="form-input" value={soldForm.buyer_whatsapp} onChange={e => setSoldField('buyer_whatsapp', e.target.value)} placeholder="919876543210" />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Final Sale Price (Rs.)</label>
                  <input className="form-input" value={soldForm.offered_price} onChange={e => setSoldField('offered_price', e.target.value)} placeholder="e.g. 3,50,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Sale *</label>
                  <input className="form-input" type="date" value={soldForm.sale_date}
                    max={new Date().toISOString().slice(0,10)}
                    onChange={e => setSoldField('sale_date', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input form-textarea" value={soldForm.notes} onChange={e => setSoldField('notes', e.target.value)} placeholder="Any additional sale notes…" />
              </div>

              <div style={{ background:'var(--amber-light)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--amber-text)' }}>
                Once confirmed, this tractor will be marked as <strong>Sold</strong> everywhere — tractor page, marketplace, and a sale record will be created in Enquiries. This cannot be undone easily.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setSoldModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmMarkSold} disabled={markingSold}>
                {markingSold ? 'Saving…' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
