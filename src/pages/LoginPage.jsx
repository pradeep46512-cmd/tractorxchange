import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ fontSize:40, marginBottom:8 }}>🚜</div>
        <h1>TractorXchange</h1>
        <p>Sign in to manage exchange tractors</p>
        {error && <div style={{ background:'var(--red-light)', color:'var(--red-text)', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ textAlign:'left' }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group" style={{ textAlign:'left' }}>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', marginTop:8 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <hr className="divider" />
        <p style={{ fontSize:12, color:'var(--gray-400)' }}>
          Public marketplace: <a href="/marketplace" style={{ color:'var(--green)' }}>View listings →</a>
        </p>
      </div>
    </div>
  );
}
