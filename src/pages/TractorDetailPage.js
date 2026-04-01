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
      setDocs(prev => [...prev, newDoc]);
    }
    catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(id, file);
      const isCover = photos.length === 0;
      const { data } = await supabase.from('tractor_photos').insert([{ tractor_id: id, photo_url: url, is_cover: isCover }]).select().single();
      if (isCover) { await updateTractor(id, { cover_photo: url }); setTractor(prev => ({ ...prev, cover_photo: url })); }
      setPhotos(prev => [...prev, data]);
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
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
          <button className="btn btn-wa" onClick={shareWA}>💬 Share on WhatsApp</button>
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
              <div className="photo-thumb" style={{ cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--gray-100)', fontSize:22, color:'var(--gray-400)' }} onClick={() => photoRef.current?.click()}>
                +
              </div>
            </div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoUpload} />

            {/* Documents */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <h3>Documents</h3>
                <button className="btn btn-sm" onClick={() => docRef.current?.click()} disabled={uploading}>
                  {uploading ? '…' : '+ Upload'}
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
                  ['Engine', tractor.engine_hp ? tractor.engine_hp + ' HP' : '—'],
                  ['Location', tractor.location_text],
                ].map(([label, val]) => (
                  <div key={label} className="info-row"><span className="label">{label}</span><span className="font-bold">{val || '—'}</span></div>
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
                  <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('Copied!'))}>Copy</button>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-wa" style={{ flex:1 }} onClick={shareWA}>💬 WhatsApp</button>
                  <a className="btn" style={{ flex:1, justifyContent:'center' }} href={shareUrl} target="_blank" rel="noreferrer">🌐 Preview</a>
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
                    <a href={`https://wa.me/${b.whatsapp || b.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${b.name}, I have a tractor for you: ${shareUrl}`)}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-wa">💬</a>
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
