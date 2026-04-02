import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTractorById, getTractorDocuments, updateTractor,
  uploadDocument, uploadPhoto, supabase
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

  const load = async () => {
    setLoading(true);
    try {
      const t = await getTractorById(id);
      setTractor(t);
      setDocs(await getTractorDocuments(id));
      const { data: ph } = await supabase.from('tractor_photos').select('*').eq('tractor_id', id).order('created_at');
      setPhotos(ph || []);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async (status) => {
    try {
      await updateTractor(id, { status });
      setTractor(prev => ({ ...prev, status }));
    } catch (e) { alert(e.message); }
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

  const brokers = tractor.tractor_brokers?.map(tb => tb.brokers) || [];
  const mainPhoto = tractor.cover_photo;

  return (
    <>
      <div className="topbar">
        <div className="flex flex-center gap-12">
          <button className="btn btn-sm" onClick={() => navigate('/')}>← Back</button>
          <h2>{tractor.make} {tractor.model}</h2>
          <span className={`status-badge status-${tractor.status}`}>{tractor.status}</span>
        </div>
        <div className="topbar-actions">
          <select className="form-input form-select" style={{ width: 140 }} value={tractor.status} onChange={e => handleStatusChange(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-wa" onClick={shareWA}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> Share on WhatsApp</button>
        </div>
      </div>

      <div className="content">
        <div className="detail-layout">
          {/* LEFT COLUMN */}
          <div>
            {/* Main photo */}
            <div className="detail-photo-main" style={{ marginBottom: 12 }}>
              {mainPhoto ? <img src={mainPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius: 12 }} /> : <span>🚜</span>}
            </div>

            {/* Photo grid */}
            <div className="photo-grid">
              {photos.map(ph => (
                <div key={ph.id} className="photo-thumb">
                  <img src={ph.photo_url} alt="" onClick={() => setCover(ph)} title="Set as cover" />
                  {ph.is_cover && <span className="cover-badge">Cover</span>}
                  <button className="photo-delete" onClick={() => deletePhoto(ph)}>✕</button>
                </div>
              ))}
              <div className="photo-thumb" style={{ cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--gray-100)', fontSize:14, color:'var(--gray-400)', flexDirection:'column', gap:2 }} onClick={() => photos.length < 5 && photoRef.current?.click()}>
                <span style={{fontSize:20}}>+</span><span style={{fontSize:10}}>{photos.length}/5</span>
              </div>
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
            {/* Price & stats */}
            <div className="stat-cards" style={{ marginBottom: 16 }}>
              <div className="stat-card"><div className="stat-label">Expected Price</div><div className="stat-value price-value">{PRICE_FMT(tractor.expected_price)}</div></div>
              <div className="stat-card"><div className="stat-label">Condition</div><div className="stat-value">{tractor.condition || '—'}</div></div>
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
              <div className="card-header"><h3>Eligible Brokers</h3><span className="tag tag-green">{brokers.length}</span></div>
              <div className="card-body" style={{ padding: '8px 16px' }}>
                {brokers.length === 0 && <p className="text-muted text-sm" style={{ padding:'8px 0' }}>No brokers assigned.</p>}
                {brokers.map(b => b && (
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
    </>
  );
}
