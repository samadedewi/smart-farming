import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { fetchLatestSensor, fetchSensorHistory, analyzeSoil, BASE_URL } from '../services/sensorService';
import { useAuth } from '../context/AuthContext';

const VARIETIES_MAP = {
  'Bisi 2': { harvest: 115, yield: '8–10 Ton/Ha' },
  'NK Perkasa': { harvest: 110, yield: '8–9.5 Ton/Ha' },
  'Pertiwi': { harvest: 105, yield: '7–9 Ton/Ha' },
  'Pioneer Sweet Corn': { harvest: 90, yield: '6–8 Ton/Ha' }
};

export default function Laporan() {
  const { user } = useAuth();
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [activeLahan, setActiveLahan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(false);
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        };

        const [l, h, resLahan] = await Promise.all([
          fetchLatestSensor(),
          fetchSensorHistory(),
          fetch(`${BASE_URL}/lahan`, { headers })
        ]);

        const latestData = l?.data || null;
        const historyData = Array.isArray(h?.data) ? h.data : (Array.isArray(h?.data?.data) ? h.data.data : []);

        setLatest(latestData);
        setHistory(historyData);

        if (latestData) {
          setAnalysis(analyzeSoil(latestData));
        }

        const dLahan = await resLahan.json();
        if (dLahan.success && dLahan.data?.length > 0) {
          setActiveLahan(dLahan.data[0]);
        }
      } catch (err) {
        console.error("Gagal memuat data laporan:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0,
        filename: `Laporan_Kesuburan_Tanah_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      const pdfBlob = await html2pdf().set(opt).from(reportRef.current).outputPdf('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', opt.filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      
      link.click();
      
      // Delay cleanup to ensure Chrome registers the 'download' attribute
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 500);
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', flexDirection: 'column', gap: '20px' }}>
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Menyusun laporan analisis...</p>
      </div>
    );
  }

  if (error || !latest || !analysis) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <h2 style={{ marginBottom: '8px' }}>Gagal Memuat Laporan</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Data sensor tidak dapat diakses saat ini.</p>
          <button onClick={loadData} style={{
            padding: '10px 24px', borderRadius: '8px', background: 'var(--primary-dark)', color: 'white', border: 'none', cursor: 'pointer'
          }}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  // Perhitungan Statistik (Rata-rata, Min, Max)
  const safeHistory = Array.isArray(history) ? history : [];
  const stats = safeHistory.reduce((acc, d) => {
    ['ph', 'nitrogen', 'phosphorus', 'kalium'].forEach(field => {
      const val = d[field];
      if (val !== undefined && val !== null) {
        acc[field].sum += val;
        acc[field].count += 1;
        acc[field].min = Math.min(acc[field].min, val);
        acc[field].max = Math.max(acc[field].max, val);
      }
    });
    return acc;
  }, {
    ph: { sum: 0, count: 0, min: Infinity, max: -Infinity },
    nitrogen: { sum: 0, count: 0, min: Infinity, max: -Infinity },
    phosphorus: { sum: 0, count: 0, min: Infinity, max: -Infinity },
    kalium: { sum: 0, count: 0, min: Infinity, max: -Infinity }
  });

  const getFinalStats = (field) => {
    const s = stats[field];
    return {
      avg: s.count > 0 ? (s.sum / s.count).toFixed(1) : '-',
      min: s.min === Infinity ? '-' : s.min,
      max: s.max === -Infinity ? '-' : s.max
    };
  };

  const phStats = getFinalStats('ph');
  const nStats = getFinalStats('nitrogen');
  const pStats = getFinalStats('phosphorus');
  const kStats = getFinalStats('kalium');

  const total = safeHistory.length;
  const displayTotal = total === 0 ? 1 : total;
  const statusCounts = safeHistory.reduce((acc, d) => {
    const s = analyzeSoil(d)?.soilStatus;
    if (s) acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const getStatusColor = (status) =>
    status === 'Rendah' ? '#E63946' : status === 'Tinggi' ? '#F4A261' : '#2A9D8F';

  const targetVariety = latest?.rekomendasi || activeLahan?.id_varietas || latest?.varietas || analysis?.variety || 'Bisi 2';
  const varietyDetail = VARIETIES_MAP[targetVariety] || { harvest: 105, yield: '7–9 Ton/Ha' };

  // Ambil dosis pupuk dari Model 2 (ML)
  const dosisUrea = latest?.dosis_urea || 140;
  const dosisSp36 = latest?.dosis_sp36 || 90;
  const dosisKcl = latest?.dosis_kcl || 60;

  // Prediksi Potensi Hasil (Model 4) dan Sisa Hari Panen (Model 3)
  const yieldEst = latest?.hasil_panen ? `${latest.hasil_panen.toFixed(2)} Ton/Ha` : varietyDetail.yield;
  const harvestDays = varietyDetail.harvest;

  const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const lokasiText = activeLahan ? `Blok ${activeLahan.nama_blok}, Kec. ${activeLahan.kecamatan}` : 'Lahan Utama';
  const jenisTanah = activeLahan?.jenis_tanah || 'Andosol';

  // Shared table cell styles
  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#374151', borderBottom: '2px solid #2F4F2F', background: '#f0f5f0' };
  const tdStyle = { padding: '10px 14px', fontSize: '0.82rem', color: '#1a1a1a', borderBottom: '1px solid #e5e7eb' };

  return (
    <AppLayout isOnline={latest !== null} lastUpdate={latest?.timestamp}>
      {/* Action Bar */}
      <div className="no-print" style={{ background: 'var(--primary-dark)', borderRadius: '14px', padding: '16px 24px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.4rem', margin: 0 }}>Laporan Kesuburan Tanah</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.85rem' }}>Pratinjau dokumen PDF</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handlePrint} style={{
              padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)',
              background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🖨 Cetak
            </button>
            <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: '#F4A261', color: 'white', fontWeight: 700, cursor: pdfLoading ? 'wait' : 'pointer',
              fontSize: '0.85rem', opacity: pdfLoading ? 0.7 : 1, transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { if (!pdfLoading) e.currentTarget.style.background = '#e8934e'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#F4A261'}
            >
              {pdfLoading ? 'Membuat PDF...' : 'Unduh PDF'}
            </button>
          </div>
      </div>

      {/* ═══════ PDF DOCUMENT ═══════ */}
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 24px' }} className="print-area">
        <div ref={reportRef} style={{
          background: 'white',
          padding: '48px 56px',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: '#1a1a1a',
          lineHeight: 1.6,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}>

          {/* ── Document Header ── */}
          <div style={{ borderBottom: '3px solid #2F4F2F', paddingBottom: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2F4F2F', margin: 0, lineHeight: 1.2 }}>
                  LAPORAN ANALISIS<br />KESUBURAN TANAH
                </h1>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '8px 0 0 0' }}>
                  Sistem Monitoring IoT & Machine Learning
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#2F4F2F', lineHeight: 1 }}>SiTani</div>
                <div style={{ fontSize: '0.65rem', color: '#6B7280', letterSpacing: '1.5px', marginTop: '4px' }}>IOT FARMING SYSTEM</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '8px' }}>POLIMDO × Dinas Pertanian<br />Sulawesi Utara</div>
              </div>
            </div>
          </div>

          {/* ── Metadata Table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '0.85rem' }}>
            <tbody>
              {[
                ['Tanggal Laporan', currentDate],
                ['Lokasi', lokasiText],
                ['Jenis Tanah', jenisTanah],
                ['Varietas Rekomendasi', targetVariety],
                ['Total Rekaman Dataset', `${total} data`],
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600, color: '#374151', width: '40%' }}>{label}</td>
                  <td style={{ padding: '8px 0', color: '#1a1a1a' }}>: {value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Section 1: Ringkasan Statistik ── */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2F4F2F', margin: '32px 0 16px 0', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            1. Ringkasan Statistik Parameter Tanah
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Parameter</th>
                <th style={thStyle}>Rata-rata</th>
                <th style={thStyle}>Min</th>
                <th style={thStyle}>Max</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'pH Tanah', avg: phStats.avg, min: phStats.min, max: phStats.max, status: analysis?.phStatus, unit: '' },
                { label: 'Nitrogen (N)', avg: nStats.avg, min: nStats.min, max: nStats.max, status: analysis?.nStatus, unit: ' mg/kg' },
                { label: 'Fosfor (P)', avg: pStats.avg, min: pStats.min, max: pStats.max, status: analysis?.pStatus, unit: ' mg/kg' },
                { label: 'Kalium (K)', avg: kStats.avg, min: kStats.min, max: kStats.max, status: analysis?.kStatus, unit: ' mg/kg' },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.label}</td>
                  <td style={tdStyle}>{row.avg}{row.unit}</td>
                  <td style={tdStyle}>{row.min}{row.unit}</td>
                  <td style={tdStyle}>{row.max}{row.unit}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                      background: `${getStatusColor(row.status)}18`, color: getStatusColor(row.status),
                    }}>{row.status || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Section 2: Distribusi Status ── */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2F4F2F', margin: '32px 0 16px 0', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            2. Distribusi Status Kesuburan
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Jumlah Rekaman</th>
                <th style={thStyle}>Persentase</th>
              </tr>
            </thead>
            <tbody>
              {total === 0 ? (
                <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: '#9CA3AF' }}>Tidak ada data</td></tr>
              ) : (
                Object.entries(statusCounts).map(([status, count], i) => {
                  const pct = Math.round((count / displayTotal) * 100);
                  const color = status === 'Siap Tanam' ? '#2F4F2F' : status === 'Perlu Pupuk' ? '#F4A261' : '#E63946';
                  return (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {status}
                        </span>
                      </td>
                      <td style={tdStyle}>{count} rekaman</td>
                      <td style={tdStyle}>{pct}%</td>
                    </tr>
                  );
                })
              )}
              <tr style={{ background: '#f9fafb' }}>
                <td style={{ ...tdStyle, fontWeight: 700, borderTop: '2px solid #2F4F2F' }}>Total</td>
                <td style={{ ...tdStyle, fontWeight: 700, borderTop: '2px solid #2F4F2F' }}>{total} rekaman</td>
                <td style={{ ...tdStyle, fontWeight: 700, borderTop: '2px solid #2F4F2F' }}>100%</td>
              </tr>
            </tbody>
          </table>

          {/* ── Section 3: Data Rekaman ── */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2F4F2F', margin: '32px 0 16px 0', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            3. Data Dataset Terbaru (5 Rekaman)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
            <thead>
              <tr>
                {['No', 'Waktu', 'pH', 'Nitrogen', 'Fosfor', 'Kalium', 'Status'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {total === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9CA3AF' }}>Belum ada data rekaman.</td></tr>
              ) : safeHistory.slice(0, 5).map((row, i) => {
                const a = analyzeSoil(row);
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem' }}>{row?.timestamp ? new Date(row.timestamp).toLocaleString('id-ID') : '-'}</td>
                    <td style={tdStyle}>{row?.ph ?? '-'}</td>
                    <td style={tdStyle}>{row?.nitrogen ?? '-'} mg/kg</td>
                    <td style={tdStyle}>{row?.phosphorus ?? '-'} mg/kg</td>
                    <td style={tdStyle}>{row?.kalium ?? '-'} mg/kg</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
                        background: a?.soilVariant === 'optimal' ? 'rgba(42,157,143,0.12)' : 'rgba(244,162,97,0.15)',
                        color: a?.soilVariant === 'optimal' ? '#2A9D8F' : '#d97706',
                      }}>{a?.soilStatus || 'N/A'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── Section 4: Rekomendasi Budidaya ── */}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2F4F2F', margin: '32px 0 16px 0', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            4. Rekomendasi Budidaya: {targetVariety}
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '30%' }}>Aspek</th>
                <th style={thStyle}>Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Varietas Optimal', `${targetVariety} — sangat cocok untuk kondisi tanah saat ini (Model 1).`],
                ['Estimasi Panen', `${latest?.sisa_hari_panen ? latest.sisa_hari_panen.toFixed(1) + ' hari lagi' : harvestDays + ' hari setelah tanam'} (Prediksi Model 3).`],
                ['Irigasi', 'Kebutuhan air 400–600 mm/musim. Pastikan drainase baik.'],
                ['Pemupukan', `Urea ${dosisUrea} kg/ha, SP36 ${dosisSp36} kg/ha, KCl ${dosisKcl} kg/ha (Rekomendasi Model 2).`],
                ['Pengendalian Hama', 'Pantau ulat grayak & penggerek batang secara berkala.'],
                ['Potensi Hasil', `${yieldEst} pipilan kering (Prediksi Model 4).`],
              ].map(([aspect, desc], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{aspect}</td>
                  <td style={tdStyle}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div style={{ borderTop: '2px solid #2F4F2F', paddingTop: '20px', marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9CA3AF' }}>
            <div>
              <div>Dokumen ini digenerate secara otomatis oleh sistem <strong style={{ color: '#2F4F2F' }}>SiTani</strong></div>
              <div>IoT Farming System — POLIMDO × Dinas Pertanian Sulawesi Utara</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{currentDate}</div>
              <div>Halaman 1 dari 1</div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom spacing */}
      <div style={{ height: '24px' }} className="no-print" />
    </AppLayout>
  );
}
