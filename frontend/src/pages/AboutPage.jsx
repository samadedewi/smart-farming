import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Bubbles */}
      <div style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', background: 'rgba(47,79,47,0.05)', top: '-10%', left: '-10%', zIndex: 0 }} />
      <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(47,79,47,0.06)', bottom: '-5%', right: '-5%', zIndex: 0 }} />
      
      {/* Navbar */}
      <div className="container" style={{ paddingTop: '24px', paddingBottom: '24px', position: 'relative', zIndex: 10 }}>
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
      <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 1, padding: '40px 20px', maxWidth: '800px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '2.5rem', color: 'var(--primary-dark)', marginBottom: '40px', letterSpacing: '-0.5px' }}>Tentang Kami</h1>
        
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ color: 'var(--primary-dark)', marginBottom: '12px' }}>Apa itu SiTani?</h3>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.8, fontSize: '1.05rem' }}>
            <strong>SiTani (Smart Farming System)</strong> adalah platform pertanian cerdas berbasis Internet of Things (IoT) dan Machine Learning yang dirancang khusus untuk mengoptimalkan hasil panen jagung di Indonesia.
          </p>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.8, fontSize: '1.05rem', marginTop: '12px' }}>
            Sistem ini memadukan perangkat keras sensor tanah (ESP32) yang membaca kondisi lahan secara real-time. Data ini kemudian diolah menggunakan model kecerdasan buatan untuk memberikan rekomendasi varietas benih, estimasi kebutuhan pupuk susulan, dan prediksi hasil panen.
          </p>
        </div>

        <div style={{ marginBottom: '50px' }}>
          <h3 style={{ color: 'var(--primary-dark)', marginBottom: '12px' }}>Latar Belakang & Tujuan</h3>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.8, fontSize: '1.05rem' }}>
            Misi kami adalah membantu petani tradisional bertransisi ke pertanian modern yang lebih presisi, efisien, dan berkelanjutan. Dengan memanfaatkan data secara akurat, diharapkan risiko gagal panen dapat ditekan dan produktivitas hasil tani meningkat secara signifikan.
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '40px' }}>
          <h3 style={{ color: 'var(--primary-dark)', marginBottom: '8px', textAlign: 'center', fontSize: '1.8rem' }}>Tim Pengembang</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
            Proyek PBL - Jurusan Teknik Elektro, Prodi D4 Teknik Informatika<br/><strong>Politeknik Negeri Manado (POLIMDO)</strong>
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
            {[
              'Jesica Sofiani Gigir', 
              'Sofia Natania Samel', 
              'Jonathan James Junior Ruben', 
              'Dewi Shinta Samade'
            ].map(name => (
              <div key={name} style={{ background: 'white', padding: '24px 16px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(47,79,47,0.1)', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #2A9D8F, #2F4F2F)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 auto 16px', boxShadow: '0 4px 10px rgba(47,79,47,0.2)' }}>
                  {name.charAt(0)}
                </div>
                <h4 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '4px', lineHeight: 1.4 }}>{name}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mahasiswa</span>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <Link to="/login" className="btn btn-primary" style={{ padding: '12px 32px' }}>Coba Sekarang</Link>
        </div>
      </div>
    </div>
  );
}
