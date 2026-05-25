import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Bubbles */}
      <div style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', background: 'rgba(47,79,47,0.05)', top: '-10%', left: '-10%', zIndex: 0 }} />
      <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(47,79,47,0.06)', bottom: '-5%', right: '-5%', zIndex: 0 }} />
      
      {/* Navbar */}
      <div style={{ padding: '24px 48px', width: '100%', position: 'relative', zIndex: 10 }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1.8rem', lineHeight: 1, letterSpacing: '-0.5px' }}>SiTani</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '4px', fontWeight: 600 }}>IOT FARMING SYSTEM</div>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/" style={{ padding: '10px 20px', fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none' }}>Beranda</Link>
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="container" style={{ position: 'relative', zIndex: 1, padding: '40px 20px', maxWidth: '800px' }}>
        <div className="card animate-fade-in" style={{ padding: '40px', borderRadius: '24px' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary-dark)', marginBottom: '24px', letterSpacing: '-0.5px' }}>Tentang SiTani</h1>
          
          <div style={{ color: 'var(--text-main)', lineHeight: 1.8, fontSize: '1.05rem', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p>
              <strong>SiTani (Smart Farming System)</strong> adalah platform pertanian cerdas berbasis Internet of Things (IoT) dan Machine Learning yang dirancang khusus untuk mengoptimalkan hasil panen jagung di Indonesia.
            </p>
            
            <p>
              Sistem ini memadukan perangkat keras sensor tanah (ESP32) yang membaca kadar pH, Nitrogen, Fosfor, Kalium (NPK), suhu, dan kelembaban secara real-time. Data ini kemudian diolah menggunakan model kecerdasan buatan untuk memberikan rekomendasi varietas benih, estimasi kebutuhan pupuk susulan, dan prediksi hasil panen.
            </p>
            
            <h3 style={{ color: 'var(--primary-dark)', marginTop: '20px' }}>Visi & Misi</h3>
            <p>
              Misi kami adalah membantu petani tradisional bertransisi ke pertanian modern yang lebih presisi, efisien, dan berkelanjutan. Dengan memanfaatkan data secara akurat, diharapkan risiko gagal panen dapat ditekan dan produktivitas hasil tani meningkat secara signifikan.
            </p>

            <h3 style={{ color: 'var(--primary-dark)', marginTop: '20px' }}>Kolaborasi</h3>
            <p>
              Proyek ini dikembangkan sebagai bentuk nyata penerapan teknologi tepat guna oleh Politeknik Negeri Manado (POLIMDO) melalui program Project Based Learning (PBL) bekerjasama dengan mitra-mitra terkait di bidang pertanian.
            </p>
          </div>
          
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '12px 32px' }}>Coba Sekarang</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
