import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : 'Price on request';

const WA_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
const CALL_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.18 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
const SHARE_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const COPY_ICON = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;

export default function PublicTractorPage() {
  const { token } = useParams();
  const [tractor, setTractor] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t, error } = await supabase
        .from('tractors').select('*').eq('share_token', token).single();
      if (error || !t) { setLoading(false); return; }
      setTractor(t);
      const { data: ph } = await supabase.from('tractor_photos').select('*').eq('tractor_id', t.id).order('created_at');
      setPhotos(ph || []);
      const { data: dc } = await supabase.from('tractor_documents').select('*').eq('tractor_id', t.id);
      setDocs(dc || []);
      setLoading(false);
    })();
  }, [token]);

  // Keyboard nav
  useEffect(() => {
    const h = (e) => {
      if (!galleryOpen) return;
      if (e.key === 'Escape') setGalleryOpen(false);
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(i + 1, photos.length - 1));
      if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [galleryOpen, photos.length]);

  if (loading) return <div className="app-loading"><div className="spinner" /><span>Loading…</span></div>;

  if (!tractor) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24 }}>
      <span style={{ fontSize:52 }}>🚜</span>
      <h2 style={{ fontSize:20 }}>Tractor not found</h2>
      <p style={{ color:'var(--gray-400)', textAlign:'center' }}>This link may have expired or been removed.</p>
      <a href="/marketplace" className="btn btn-primary">Browse Marketplace</a>
    </div>
  );

  const url = window.location.href;
  const enquiryWA = () => {
    const msg = `Hi, I am interested in buying this tractor.\n\n🚜 *${tractor.make} ${tractor.model}* (${tractor.year})\n📍 ${tractor.location_text}\n💰 ${PRICE_FMT(tractor.expected_price)}\n\n${url}`;
    window.open('https://wa.me/917518767671?text=' + encodeURIComponent(msg), '_blank');
  };
  const shareTractor = () => {
    const sd = { title: `${tractor.make} ${tractor.model}`, text: `${tractor.make} ${tractor.model} (${tractor.year}) — ${PRICE_FMT(tractor.expected_price)}`, url };
    if (navigator.share) navigator.share(sd).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
  };

  const activePhoto = photos[activeIdx];
  const specs = [
    ['Make / Model', `${tractor.make} ${tractor.model}`],
    ['Year', tractor.year],
    ['Hours Used', tractor.hours_used],
    ['Engine', tractor.engine_hp ? tractor.engine_hp + ' HP' : null],
    ['Condition', tractor.condition],
    ['Location', tractor.location_text],
    ['Status', tractor.status],
  ].filter(([, v]) => v);

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)', fontFamily:'var(--font)' }}>

      {/* ── Header ── */}
      <div style={{ background:'var(--green-dark)', color:'#fff', padding:'12px 16px',
        display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <a href="/marketplace" style={{ color:'rgba(255,255,255,0.75)', textDecoration:'none',
          fontSize:13, display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
          ← Marketplace
        </a>
        <span className={`status-badge status-${tractor.status}`}
          style={{ position:'static', display:'inline-block' }}>{tractor.status}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {tractor.make} {tractor.model}
          </div>
          <div style={{ fontSize:12, opacity:0.75 }}>{tractor.year} · {tractor.location_text}</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(url).then(() => alert('Copied!'))}
            style={{ background:'rgba(255,255,255,0.15)', color:'#fff', borderColor:'rgba(255,255,255,0.3)', fontSize:12 }}>
            {COPY_ICON} Copy Link
          </button>
          <button className="btn btn-sm" onClick={shareTractor}
            style={{ background:'rgba(255,255,255,0.15)', color:'#fff', borderColor:'rgba(255,255,255,0.3)', fontSize:12 }}>
            {SHARE_ICON} Share
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth:720, margin:'0 auto', padding:'16px 14px' }}>

        {/* ── Photo viewer — Amazon style ── */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border)',
          overflow:'hidden', marginBottom:14 }}>

          {photos.length === 0 ? (
            /* No photos */
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center',
              flexDirection:'column', gap:8, color:'var(--gray-400)', background:'var(--gray-50)' }}>
              <span style={{ fontSize:56 }}>🚜</span>
              <span style={{ fontSize:13 }}>No photos available</span>
            </div>
          ) : (
            <div style={{ display:'flex', gap:0 }}>
              {/* Thumbnail column */}
              {photos.length > 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:4,
                  padding:'10px 6px 10px 10px', borderRight:'1px solid var(--border)',
                  background:'var(--gray-50)', flexShrink:0 }}>
                  {photos.map((ph, i) => (
                    <div key={ph.id} onClick={() => setActiveIdx(i)}
                      style={{ width:58, height:58, borderRadius:8, overflow:'hidden', cursor:'pointer',
                        border: i === activeIdx ? '2px solid var(--green)' : '2px solid transparent',
                        background:'var(--gray-100)', flexShrink:0 }}>
                      <img src={ph.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center',
                justifyContent:'center', background:'#fff', cursor:'zoom-in',
                minHeight:220, maxHeight:320, padding:8, position:'relative' }}
                onClick={() => setGalleryOpen(true)}>
                <img
                  src={activePhoto?.photo_url}
                  alt={`${tractor.make} ${tractor.model}`}
                  style={{ maxWidth:'100%', maxHeight:300, width:'auto', height:'auto',
                    objectFit:'contain', display:'block', borderRadius:6 }}
                />
                {/* Zoom hint */}
                <div style={{ position:'absolute', bottom:8, right:8,
                  background:'rgba(0,0,0,0.4)', color:'#fff',
                  fontSize:10, padding:'2px 8px', borderRadius:12,
                  display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  Tap to zoom
                </div>
                {/* Counter */}
                {photos.length > 1 && (
                  <div style={{ position:'absolute', top:8, right:8,
                    background:'rgba(0,0,0,0.4)', color:'#fff',
                    fontSize:10, padding:'2px 8px', borderRadius:12 }}>
                    {activeIdx + 1} / {photos.length}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nav arrows row */}
          {photos.length > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'8px 0',
              borderTop:'1px solid var(--border)', background:'var(--gray-50)' }}>
              <button className="btn btn-sm"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx(i => Math.max(i - 1, 0))}
                style={{ padding:'4px 14px', opacity: activeIdx === 0 ? 0.4 : 1 }}>‹ Prev</button>
              <button className="btn btn-sm"
                disabled={activeIdx >= photos.length - 1}
                onClick={() => setActiveIdx(i => Math.min(i + 1, photos.length - 1))}
                style={{ padding:'4px 14px', opacity: activeIdx >= photos.length - 1 ? 0.4 : 1 }}>Next ›</button>
            </div>
          )}
        </div>

        {/* ── Price & CTA ── */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border)',
          padding:16, marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)',
            textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Expected Price</div>
          <div style={{ fontSize:28, fontWeight:800, color:'var(--green)', marginBottom:14 }}>
            {PRICE_FMT(tractor.expected_price)}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <a href="tel:+917518767671" className="btn btn-call"
              style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
              {CALL_ICON} Enquiry Call
            </a>
            <button className="btn btn-wa" onClick={enquiryWA}
              style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
              {WA_ICON} Enquiry on WhatsApp
            </button>
            <button className="btn" onClick={shareTractor}
              style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
              {SHARE_ICON} Share This Tractor
            </button>
            <a href="/marketplace" className="btn"
              style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
              Browse More Tractors
            </a>
          </div>
        </div>

        {/* ── Specifications ── */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border)',
          padding:16, marginBottom:14 }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>Specifications</div>
          {specs.map(([label, val]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', padding:'10px 0',
              borderBottom:'1px solid var(--border)', fontSize:14 }}>
              <span style={{ color:'var(--gray-400)' }}>{label}</span>
              <span style={{ fontWeight:600, textAlign:'right', maxWidth:'60%' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* ── Description ── */}
        {tractor.description && (
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border)',
            padding:16, marginBottom:14 }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>About This Tractor</div>
            <p style={{ fontSize:14, lineHeight:1.7, color:'var(--gray-600)', margin:0 }}>{tractor.description}</p>
          </div>
        )}

        {/* ── Documents ── */}
        {docs.length > 0 && (
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid var(--border)',
            padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>Documents</div>
              <span className="tag tag-green">{docs.length} attached</span>
            </div>
            <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:12 }}>
              Contact us to receive full document copies.
            </p>
            {docs.map(d => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0',
                borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'var(--blue-light)',
                  color:'var(--blue-text)', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, fontWeight:700, flexShrink:0 }}>
                  {d.file_type || 'DOC'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize:11, color:'var(--gray-400)' }}>Available on request</div>
                </div>
                <span className="tag tag-green" style={{ fontSize:11 }}>✓</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Full screen gallery overlay ── */}
      {galleryOpen && photos.length > 0 && (
        <div onClick={() => setGalleryOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)',
            zIndex:300, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center' }}>
          <button onClick={() => setGalleryOpen(false)}
            style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.15)',
              border:'none', color:'#fff', width:40, height:40, borderRadius:'50%',
              cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <div style={{ position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
            color:'rgba(255,255,255,0.7)', fontSize:13 }}>
            {activeIdx + 1} / {photos.length}
          </div>
          {activeIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); setActiveIdx(i => i - 1); }}
              style={{ position:'absolute', left:12, background:'rgba(255,255,255,0.15)',
                border:'none', color:'#fff', width:44, height:44, borderRadius:'50%',
                cursor:'pointer', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          )}
          <img src={photos[activeIdx]?.photo_url} alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth:'92vw', maxHeight:'82vh', objectFit:'contain', borderRadius:8 }} />
          {activeIdx < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setActiveIdx(i => i + 1); }}
              style={{ position:'absolute', right:12, background:'rgba(255,255,255,0.15)',
                border:'none', color:'#fff', width:44, height:44, borderRadius:'50%',
                cursor:'pointer', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
          )}
          {/* Thumbnail strip */}
          <div style={{ position:'absolute', bottom:16, display:'flex', gap:6,
            maxWidth:'100vw', overflowX:'auto', padding:'0 16px' }}>
            {photos.map((ph, i) => (
              <div key={ph.id} onClick={e => { e.stopPropagation(); setActiveIdx(i); }}
                style={{ width:52, height:40, flexShrink:0, borderRadius:6, overflow:'hidden',
                  cursor:'pointer', border: i === activeIdx ? '2px solid #fff' : '2px solid transparent',
                  opacity: i === activeIdx ? 1 : 0.5 }}>
                <img src={ph.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
