import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../services/sensorService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    role: 'manager_user' // default role
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    console.log("DATA DIKIRIM:", formData);

    // Validasi Sederhana
    if (!formData.nama || !formData.email || !formData.password || !formData.role) {
      setError('Semua field wajib diisi');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      console.log('📡 Mengirim data ke backend...', formData);
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        nama: formData.nama,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      if (response.data.success) {
        setSuccess('Registrasi berhasil!');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      console.log("ERROR:", err.response?.data);
      const msg = err.response?.data?.message || 'Register gagal';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-stack" style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-color)', position: 'relative' }}>
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
        background: 'rgba(255,255,255,0.8)',
        borderRadius: '50%',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'white'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
      title="Kembali ke Awal"
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>←</span>
      </Link>

      {/* Left Panel - Branding */}
      <div className="auth-left-panel" style={{
        flex: 1, background: 'linear-gradient(160deg, var(--primary-dark) 0%, #1a2e1a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>SiTani</span>
        </div>
        <h1 style={{ color: 'white', fontSize: '3rem', marginBottom: '24px' }}>
          Gabung Bersama<br />Ekosistem SiTani
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', lineHeight: 1.7 }}>
          Dapatkan akses ke fitur monitoring tercanggih untuk lahan pertanian Anda.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="auth-right-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Buat Akun Baru</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Mulai perjalanan pertanian cerdas Anda</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Nama Lengkap</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  placeholder="Masukkan nama lengkap"
                  required
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e0e0e0', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e0e0e0', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Buat password kuat"
                  required
                  style={{ width: '100%', padding: '14px 60px 14px 16px', borderRadius: '12px', border: '2px solid #e0e0e0', outline: 'none' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#999' }}>
                  {showPass ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Peran (Role)</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #e0e0e0', outline: 'none', background: 'white', fontWeight: 600 }}
              >
                <option value="manager_user">Manager / User (Perencanaan & Review)</option>
                <option value="operator">Operator (Pelaksana Lapangan)</option>
              </select>
            </div>

            {error && <div style={{ background: 'rgba(230,57,70,0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(42,157,143,0.1)', color: 'var(--success)', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}>{success}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '12px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sudah punya akun? <Link to="/login" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
