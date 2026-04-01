import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PRICE_FMT = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : 'Price on request';

export default function PublicTractorPage() {
  const { token } = useParams();
  const [tractor, setTractor] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainPhoto, setMainPhoto] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: t, error } = await supabase
        .from('tractors')
        .select('*')
        .eq('share_token', token)
        .single();
      if (error || !t) { setLoading(false); return; }
      setTractor(t);
      setMainPhoto(t.cover_photo);

      const { data: ph } = await supabase.from('tractor_photos').select('*').eq('tractor_id', t.id).order('created_at');
      setPhotos(ph || []);
      const { data: dc } = await supabase.from('tractor_documents').select('*').eq('tractor_id', t.id);
      setDocs(dc || []);
      setLoading(false);
    })();
  }, [token]);

  const shareWA = () => {
    const url = window.location.href;
    const msg = `🚜 *${tractor.make} ${tractor.model}* (${tractor.year})\n📍 ${tractor.location_text}\n⏱ ${tractor.hours_used}\n💰 ${PRICE_FMT(tractor.expected_price)}\n\n🔗 ${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  if (loading) return <div className="app-loading"><div className="spinner" /><span>Loading…</span></div>;
  if (!tractor) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <span style={{ fontSize:48 }}>🚜</span>
      <h2>Tractor not found</h2>
      <p style={{ color:'var(--gray-400)' }}>This link may have expired or been removed.</p>
      <a href="/marketplace" className="btn btn-primary">Browse Marketplace</a>
    </div>
  );

  const infoItems = [
    ['Make / Model', `${tractor.make} ${tractor.model}`],
    ['Year', tractor.year],
    ['Hours Used', tractor.hours_used],
    ['Engine', tractor.engine_hp ? tractor.engine_hp + ' HP' : null],
    ['Condition', tractor.condition],
    ['Location', tractor.location_text],
    ['Status', tractor.status],
  ].filter(([,v]) => v);

  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)' }}>
      {/* Header */}
      <div className="public-header">
        <a href="/marketplace" style={{ color:'rgba(255,255,255,0.7)', textDecoration:'none', fontSize:13 }}>← Marketplace</a>
        <span style={{ fontSize:20 }}>🚜</span>
        <div>
          <h1 style={{ fontSize:16 }}>{tractor.make} {tractor.model}</h1>
          <p>{tractor.year} · {tractor.location_text}</p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button className="btn btn-wa" onClick={shareWA}>💬 Share on WhatsApp</button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!'))}>🔗 Copy Link</button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>

          {/* LEFT */}
          <div>
            {/* Main photo */}
            <div style={{ width:'100%', aspectRatio:'16/9', background:'var(--gray-100)', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:80 }}>
              {mainPhoto ? <img src={mainPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '🚜'}
            </div>
            {/* Thumbnails */}
            {photos.length > 1 && (
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                {photos.map(ph => (
                  <div key={ph.id} onClick={() => setMainPhoto(ph.photo_url)} style={{ width:72, height:54, borderRadius:8, overflow:'hidden', cursor:'pointer', border: mainPhoto === ph.photo_url ? '2px solid var(--green)' : '1px solid var(--border)' }}>
                    <img src={ph.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {tractor.description && (
              <div className="card" style={{ marginBottom:16 }}>
                <div className="card-header"><h3>About This Tractor</h3></div>
                <div className="card-body"><p style={{ fontSize:14, lineHeight:1.7, color:'var(--gray-600)' }}>{tractor.description}</p></div>
              </div>
            )}

            {/* Documents */}
            {docs.length > 0 && (
              <div className="card">
                <div className="card-header"><h3>Documents</h3><span className="tag tag-green">{docs.length} attached</span></div>
                <div className="card-body" style={{ padding:'12px 16px' }}>
                  <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:10 }}>Contact us to receive full document copies.</p>
                  {docs.map(d => (
                    <div key={d.id} className="doc-row">
                      <div className="doc-icon">{d.file_type || 'DOC'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{d.name}</div>
                        <div className="text-muted text-sm">Available on request</div>
                      </div>
                      <span className="tag tag-green">✓ Available</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {/* Price card */}
            <div className="card" style={{ marginBottom:16 }}>
              <div className="card-body">
                <div style={{ fontSize:12, color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Expected Price</div>
                <div style={{ fontSize:28, fontWeight:800, color:'var(--green)', margin:'6px 0 12px' }}>{PRICE_FMT(tractor.expected_price)}</div>
                <span className={`status-badge status-${tractor.status}`} style={{ marginBottom:16, display:'inline-block' }}>{tractor.status}</span>
                <div className="flex gap-8" style={{ flexDirection:'column' }}>
                  <button className="btn btn-wa" style={{ justifyContent:'center' }} onClick={shareWA}>💬 Enquire on WhatsApp</button>
                  <button className="btn" style={{ justifyContent:'center' }} onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!'))}>🔗 Copy Listing Link</button>
                  <a href="/marketplace" className="btn" style={{ justifyContent:'center' }}>Browse More Tractors</a>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="card">
              <div className="card-header"><h3>Specifications</h3></div>
              <div className="card-body">
                {infoItems.map(([label, val]) => (
                  <div key={label} className="info-row">
                    <span className="label">{label}</span>
                    <span className="font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
