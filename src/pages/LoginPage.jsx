import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--bg-color)',
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, background: 'linear-gradient(160deg, var(--primary-dark) 0%, #1a2e1a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>SmartAgri</span>
        </div>
        <h1 style={{ color: 'white', fontSize: '3rem', marginBottom: '24px', lineHeight: 1.1 }}>
          Platform Pertanian<br />Cerdas Masa Depan
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', marginBottom: '48px', lineHeight: 1.7 }}>
          Monitoring kesuburan tanah real-time berbasis IoT & Machine Learning untuk hasil panen jagung yang optimal.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {['Real-time monitoring sensor tanah', 'Analisis NPK & pH otomatis', 'Rekomendasi lahan berbasis data'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.9)' }}>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '60px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Selamat Datang</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Masuk ke dashboard monitoring Anda</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Masukkan email Anda"
                required
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  border: '2px solid #e0e0e0', fontSize: '1rem', outline: 'none',
                  transition: 'border-color 0.2s', background: 'white',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-dark)'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Masukkan password"
                  required
                  style={{
                    width: '100%', padding: '14px 48px 14px 16px', borderRadius: '12px',
                    border: '2px solid #e0e0e0', fontSize: '1rem', outline: 'none',
                    transition: 'border-color 0.2s', background: 'white',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary-dark)'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  {showPass ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(230,57,70,0.1)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '1rem', borderRadius: '12px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Daftar Sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
