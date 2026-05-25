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
      minHeight: '100vh',
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '40px 20px',
    }}>
      {/* Decorative Bubbles */}
      {[
        { size: 180, top: '8%', left: '5%', opacity: 0.06 },
        { size: 120, top: '70%', left: '10%', opacity: 0.05 },
        { size: 90, bottom: '15%', right: '8%', opacity: 0.07 },
        { size: 200, top: '20%', right: '3%', opacity: 0.04 },
        { size: 60, top: '50%', left: '50%', opacity: 0.08 },
        { size: 40, top: '15%', right: '25%', opacity: 0.1 },
        { size: 70, bottom: '25%', left: '30%', opacity: 0.06 },
      ].map((b, i) => (
        <div key={i} className={i % 2 === 0 ? "animate-float" : "animate-float-delayed"} style={{
          position: 'absolute',
          width: b.size,
          height: b.size,
          borderRadius: '50%',
          background: 'rgba(47,79,47,' + b.opacity + ')',
          top: b.top, left: b.left, right: b.right, bottom: b.bottom,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: 1050,
        minHeight: 560,
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left Panel - Illustration with Organic Blob */}
        <div style={{
          flex: '0 0 48%',
          position: 'relative',
          overflow: 'hidden',
          background: '#f0f5f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          {/* Back Button */}
          <Link to="/" style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            color: 'var(--primary-dark)',
            textDecoration: 'none',
            zIndex: 10,
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '50%',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'white'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
          title="Kembali ke Awal"
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>←</span>
          </Link>

          {/* Organic Blob SVG Background */}
          <svg
            viewBox="0 0 500 600"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4e8d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#a8d5a8" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M50,100 Q80,20 200,50 Q350,80 400,200 Q450,350 350,450 Q250,550 120,500 Q20,450 30,300 Q40,200 50,100Z"
              fill="url(#blobGrad)"
            />
            <path
              d="M80,150 Q120,60 230,90 Q370,130 380,250 Q390,380 300,460 Q200,520 100,460 Q30,400 50,280 Q60,200 80,150Z"
              fill="rgba(47,79,47,0.08)"
            />
          </svg>

          {/* Small decorative circles */}
          <div style={{ position: 'absolute', top: '18%', right: '15%', width: 30, height: 30, borderRadius: '50%', background: 'rgba(47,79,47,0.08)' }} />
          <div style={{ position: 'absolute', bottom: '30%', left: '8%', width: 20, height: 20, borderRadius: '50%', background: 'rgba(47,79,47,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '25%', width: 16, height: 16, borderRadius: '50%', background: 'rgba(47,79,47,0.06)' }} />

          {/* Logo Title */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
            marginBottom: '32px',
          }}>
            <div style={{ fontWeight: 800, fontSize: '2.2rem', color: 'var(--primary-dark)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>SiTani</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary-dark)', opacity: 0.8, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, marginTop: '6px' }}>IoT Farming System</div>
          </div>

          {/* Illustration */}
          <div className="animate-float" style={{
            position: 'relative',
            width: '75%',
            zIndex: 1,
          }}>
            <img
              src="/farming_illustration.png"
              alt="Smart Farming Illustration"
              style={{
                width: '100%',
                height: 'auto',
                mixBlendMode: 'multiply',
              }}
            />
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 56px',
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: 'var(--primary-dark)',
            marginBottom: '36px',
            letterSpacing: '-0.5px',
          }}>
            Login
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--text-main)',
              }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Masukkan email Anda"
                required
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '99px',
                  border: '2px solid #e0e0e0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                  background: '#fafafa',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--primary-dark)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(47,79,47,0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--text-main)',
              }}>
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
                    width: '100%',
                    padding: '14px 60px 14px 20px',
                    borderRadius: '99px',
                    border: '2px solid #e0e0e0',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                    background: '#fafafa',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--primary-dark)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(47,79,47,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280',
                  fontSize: '0.75rem', fontWeight: 600,
                }}>
                  {showPass ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(230,57,70,0.08)',
                color: 'var(--danger)',
                padding: '12px 20px',
                borderRadius: '99px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '99px',
                border: 'none',
                background: loading
                  ? '#9ab89a'
                  : 'linear-gradient(135deg, #4A7C4A 0%, #2A9D8F 100%)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(42,157,143,0.3)',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(42,157,143,0.4)';
                }
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = loading ? 'none' : '0 4px 15px rgba(42,157,143,0.3)';
              }}
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          {/* Register Link */}
          <p style={{
            textAlign: 'center',
            marginTop: '28px',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{
              color: '#2A9D8F',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}>
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 40px',
        zIndex: 1,
      }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
          © 2026 SiTani · POLIMDO × Dinas Pertanian Sulawesi Utara
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
          Powered by IoT & Machine Learning
        </span>
      </div>
    </div>
  );
}
