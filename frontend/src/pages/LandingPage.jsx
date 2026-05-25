import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Bubbles */}
      {[
        // Large background blobs
        { size: 450, top: '-10%', left: '-10%', opacity: 0.06 },
        { size: 500, top: '30%', right: '-15%', opacity: 0.05 },
        { size: 350, bottom: '-5%', left: '15%', opacity: 0.06 },
        
        // Medium bubbles
        { size: 180, top: '15%', right: '15%', opacity: 0.08 },
        { size: 200, top: '65%', left: '8%', opacity: 0.07 },
        { size: 150, bottom: '15%', right: '25%', opacity: 0.09 },
        { size: 120, top: '35%', left: '35%', opacity: 0.1 },
        { size: 160, top: '75%', right: '40%', opacity: 0.08 },

        // Small accents
        { size: 60, top: '25%', left: '25%', opacity: 0.12 },
        { size: 80, top: '45%', right: '35%', opacity: 0.1 },
        { size: 40, bottom: '30%', left: '45%', opacity: 0.15 },
        { size: 90, top: '10%', left: '45%', opacity: 0.09 },
        { size: 50, bottom: '40%', right: '10%', opacity: 0.12 },
        { size: 70, top: '85%', left: '60%', opacity: 0.11 },
      ].map((b, i) => (
        <div key={i} className={i % 2 === 0 ? "animate-float" : "animate-float-delayed"} style={{
          position: 'absolute',
          width: b.size,
          height: b.size,
          borderRadius: '50%',
          background: 'rgba(47,79,47,' + b.opacity + ')',
          top: b.top, left: b.left, right: b.right, bottom: b.bottom,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      ))}
      
      {/* Navbar */}
      <div style={{ padding: '24px 48px', width: '100%', position: 'relative', zIndex: 10 }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1.8rem', lineHeight: 1, letterSpacing: '-0.5px' }}>SiTani</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '4px', fontWeight: 600 }}>IOT FARMING SYSTEM</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" style={{ padding: '10px 20px', fontWeight: 600, color: 'var(--text-main)', borderRadius: '99px' }}>Masuk</Link>
                <Link to="/login" className="btn btn-primary">Daftar</Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="landing-hero animate-fade-in">
        <div className="badge-pill">
          IoT &amp; Machine Learning Powered
        </div>
        <h1>Smart Farming Jagung<br />Berbasis IoT &amp; Machine Learning</h1>
        <p className="subtitle" style={{ marginBottom: '40px' }}>
          Pantau kesuburan tanah secara real-time dan dapatkan prediksi panen jagung yang akurat menggunakan sensor IoT dan kecerdasan buatan.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/login" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1rem' }}>
            Mulai Prediksi
          </Link>
          <Link to="/login" className="btn btn-outline" style={{ padding: '16px 36px', fontSize: '1rem' }}>
            Sudah Punya Akun?
          </Link>
        </div>
      </section>

      {/* Fitur Unggulan */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '12px' }}>Fitur Unggulan</h2>
            <p className="subtitle">Teknologi terdepan untuk mengoptimalkan pertanian jagung Anda</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              { title: 'Soil Monitoring', desc: 'Monitoring kondisi tanah real-time menggunakan sensor pH & NPK berbasis IoT dengan pembaruan setiap 5 menit.', color: '#2F4F2F' },
              { title: 'Fertility Analysis', desc: 'Analisis tingkat pH, Nitrogen (N), Phosphorus (P), dan Kalium (K) secara otomatis dengan machine learning.', color: '#2A9D8F' },
              { title: 'Harvest Prediction', desc: 'Prediksi waktu & hasil panen jagung berdasarkan kondisi tanah aktual dengan akurasi tinggi.', color: '#F4A261' },
            ].map((f, i) => (
              <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 0.1}s`, borderTop: `4px solid ${f.color}` }}>
                <h3 style={{ marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara Kerja */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '12px' }}>Cara Kerja Sistem</h2>
            <p className="subtitle">Langkah mudah menuju pertanian yang lebih produktif</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            {[
              { step: '01', title: 'Daftar Akun', desc: 'Buat akun petani/penyuluh pertanian.' },
              { step: '02', title: 'Input Data Lahan', desc: 'Masukkan lokasi dan data awal lahan.' },
              { step: '03', title: 'Pasang Sensor IoT', desc: 'Hubungkan ESP32 ke jaringan dan lahan.' },
              { step: '04', title: 'Prediksi & Pantau', desc: 'Dapatkan rekomendasi dan estimasi panen.' },
            ].map((s, i) => (
              <div key={i} className="card text-center animate-fade-in" style={{ animationDelay: `${i * 0.12}s` }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-dark)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, margin: '0 auto 16px' }}>
                  {s.step}
                </div>
                <h4 style={{ marginBottom: '8px' }}>{s.title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: 'var(--primary-dark)' }}>
        <div className="container text-center">
          <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '16px' }}>Siap Meningkatkan Hasil Panen Jagung Anda?</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '40px', fontSize: '1.1rem' }}>Bergabunglah dengan petani modern yang sudah memanfaatkan teknologi IoT.</p>
          <Link to="/login" className="btn" style={{ background: 'var(--bg-color)', color: 'var(--primary-dark)', padding: '16px 40px', fontSize: '1rem', fontWeight: 700 }}>
            Mulai Sekarang
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1a2e1a', color: 'white', padding: '60px 0 32px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', paddingBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>SiTani</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', lineHeight: 1.7 }}>
              Platform monitoring pertanian jagung berbasis IoT &amp; Machine Learning untuk Indonesia.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '0.875rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fitur</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Soil Monitoring', 'Fertility Analysis', 'Harvest Prediction', 'Riwayat Data'].map((item) => (
                <li key={item} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '0.875rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Kontak</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['info@sitani.id', 'Manado, Indonesia'].map((item) => (
                <li key={item} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container" style={{ paddingTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
          © 2026 SiTani · PJBL Machine Learning POLIMDO × Dinas Pertanian Sulawesi Utara
        </div>
      </footer>
    </div>
  );
}
