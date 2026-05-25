import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { SectionHeader } from '../components/Cards';

const InputRow = ({ label, value, onChange, type = 'text', placeholder, hint }) => (
  <div>
    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #e0e0e0', fontSize: '0.95rem', outline: 'none', maxWidth: '500px', fontFamily: 'inherit' }}
      onFocus={e => e.target.style.borderColor = 'var(--primary-dark)'}
      onBlur={e => e.target.style.borderColor = '#e0e0e0'}
    />
    {hint && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>{hint}</p>}
  </div>
);

export default function Pengaturan() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
  const [interval, setRefreshInterval] = useState(5);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppLayout isOnline>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <SectionHeader title="Pengaturan Sistem" subtitle="Konfigurasi koneksi IoT, API, dan preferensi tampilan" />

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Koneksi API */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              Koneksi Backend / API
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputRow
                label="URL API Backend"
                value={apiUrl}
                onChange={setApiUrl}
                placeholder="http://localhost:3001/api"
                hint="Isi dengan URL backend ESP32 atau server Node.js Anda. Gunakan VITE_API_URL di file .env untuk produksi."
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: '#f0f7f0', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Endpoint yang digunakan:</div>
                  <code style={{ color: 'var(--primary-dark)', display: 'block' }}>GET {apiUrl}/sensor/latest</code>
                  <code style={{ color: 'var(--primary-dark)', display: 'block' }}>GET {apiUrl}/sensor/history</code>
                </div>
              </div>
            </div>
          </div>

          {/* Refresh */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              Interval Refresh Data
            </h3>
            <InputRow
              label="Interval Auto-Refresh (detik)"
              value={interval}
              onChange={setRefreshInterval}
              type="number"
              placeholder="5"
              hint="Data akan diperbarui otomatis setiap N detik. Minimum 3 detik."
            />
          </div>

          {/* Notifikasi */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              Notifikasi & Alert
            </h3>
            {[
              { label: 'Notifikasi saat pH di bawah 5.5', defaultChecked: true },
              { label: 'Notifikasi saat Nitrogen rendah (< 80 mg/kg)', defaultChecked: true },
              { label: 'Notifikasi saat sensor offline', defaultChecked: true },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <input type="checkbox" defaultChecked={item.defaultChecked} id={`notif-${i}`}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-dark)', cursor: 'pointer' }} />
                <label htmlFor={`notif-${i}`} style={{ fontSize: '0.9rem', cursor: 'pointer' }}>{item.label}</label>
              </div>
            ))}
          </div>

          {/* Info Integrasi */}
          <div style={{ background: '#eef8f8', border: '1px solid #b2e0da', borderRadius: '14px', padding: '20px 24px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#2A9D8F' }}>
              Cara Integrasi dengan ESP32
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#2A9D8F', margin: 0, lineHeight: 1.7 }}>
              1. Pastikan ESP32 dan server ini terhubung ke jaringan yang sama.<br />
              2. Program ESP32 untuk mengirim data JSON ke <code>POST /api/sensor</code>.<br />
              3. Ubah URL API di atas ke IP/domain backend Anda.<br />
              4. Format JSON yang diterima: <code>{`{"ph": 6.5, "nitrogen": 120, "phosphorus": 80, "kalium": 95}`}</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '14px 32px', borderRadius: '12px' }}>
              {saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
