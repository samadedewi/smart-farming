import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { SectionHeader } from '../components/Cards';
import { fetchLatestSensor, fetchSensorHistory, analyzeSoil } from '../services/sensorService';

function StatRow({ label, value, unit, status, statusColor }) {
  return (
    <div style={{ background: 'white', border: '1px solid #ebebeb', borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${statusColor}22`, color: statusColor }}>{status}</span>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{value ?? '-'} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>{unit}</span></div>
    </div>
  );
}

export default function Laporan() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [l, h] = await Promise.all([fetchLatestSensor(), fetchSensorHistory()]);
      
      const latestData = l?.data || null;
      // Handle nested data structure if present (e.g. { success: true, data: [...] })
      const historyData = Array.isArray(h?.data) ? h.data : (Array.isArray(h?.data?.data) ? h.data.data : []);
      
      setLatest(latestData);
      setHistory(historyData);
      
      if (latestData) {
        setAnalysis(analyzeSoil(latestData));
      }
    } catch (err) {
      console.error("Gagal memuat data laporan:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => window.print();

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <Navbar isOnline={latest !== null} lastUpdate={latest?.timestamp} />

      {/* Hero */}
      <div style={{ background: 'var(--primary-dark)', padding: '40px 0', color: 'white' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', marginBottom: '16px', display: 'inline-block' }}>
              📄 LAPORAN ANALISIS DATASET
            </span>
            <h1 style={{ color: 'white', fontSize: '2.25rem', marginBottom: '8px', marginTop: '12px' }}>Laporan Kesuburan Tanah</h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0 }}>Berdasarkan analisis dataset {latest?.varietas || 'Jagung'}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handlePrint} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}>
              Cetak
            </button>
            <button className="btn" style={{ background: '#F4A261', color: 'white' }}>
              Unduh PDF
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {/* Metadata badges */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { text: 'Lahan A, Jawa Tengah' },
            { text: `${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` },
            { text: `${total} Rekaman Dataset` },
          ].map((b, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {b.text}
            </div>
          ))}
        </div>

        {/* Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <StatRow 
              label="Statistik pH Tanah" 
              value={phStats.avg} unit={`(Min: ${phStats.min}, Max: ${phStats.max})`} 
              status={analysis?.phStatus} statusColor="#2A9D8F" 
            />
            <StatRow 
              label="Statistik Nitrogen (N)" 
              value={nStats.avg} unit={`mg/kg (Min: ${nStats.min}, Max: ${nStats.max})`} 
              status={analysis?.nStatus} statusColor={getStatusColor(analysis?.nStatus)} 
            />
            <StatRow 
              label="Statistik Fosfor (P)" 
              value={pStats.avg} unit={`mg/kg (Min: ${pStats.min}, Max: ${pStats.max})`} 
              status={analysis?.pStatus} statusColor={getStatusColor(analysis?.pStatus)} 
            />
            <StatRow 
              label="Statistik Kalium (K)" 
              value={kStats.avg} unit={`mg/kg (Min: ${kStats.min}, Max: ${kStats.max})`} 
              status={analysis?.kStatus} statusColor={getStatusColor(analysis?.kStatus)} 
            />
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Distribusi Status Kesuburan
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {total === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Data dataset tidak tersedia.</div>
              ) : (Array.isArray(Object.entries(statusCounts)) ? Object.entries(statusCounts) : []).map(([status, count]) => {
                const pct = Math.round((count / displayTotal) * 100);
                const color = status === 'Siap Tanam' ? '#2F4F2F' : status === 'Perlu Pupuk' ? '#F4A261' : '#E63946';
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        {status}
                      </span>
                      <span><strong>{count} rekaman</strong> <span style={{ color: 'var(--text-muted)' }}>{pct}%</span></span>
                    </div>
                    <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Rekaman Dataset</span>
                <strong>{total}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Table 5 Rekaman */}
        <div className="card" style={{ overflowX: 'auto', padding: 0, transform: 'none', marginBottom: '32px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Data Dataset Terbaru (5 Rekaman)</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                {['ID', 'Waktu', 'pH', 'Nitrogen', 'Fosfor', 'Kalium', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {total === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Belum ada data rekaman.</td></tr>
              ) : (Array.isArray(safeHistory) ? safeHistory : []).slice(0, 5).map((row, i) => {
                const a = analyzeSoil(row);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary-dark)' }}>REC-{String(i + 1).padStart(3, '0')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row?.timestamp ? new Date(row.timestamp).toLocaleString('id-ID') : '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row?.ph ?? '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{row?.nitrogen ?? '-'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mg/kg</span></td>
                    <td style={{ padding: '12px 16px' }}>{row?.phosphorus ?? '-'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mg/kg</span></td>
                    <td style={{ padding: '12px 16px' }}>{row?.kalium ?? '-'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mg/kg</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: a?.soilVariant === 'optimal' ? 'rgba(42,157,143,0.1)' : 'rgba(244,162,97,0.15)', color: a?.soilVariant === 'optimal' ? '#2A9D8F' : '#d97706' }}>
                        {a?.soilStatus || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rekomendasi Budidaya */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Rekomendasi Budidaya: {latest?.varietas || analysis?.variety}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {[
              { title: 'Varietas Optimal', desc: `${analysis?.variety} sangat cocok untuk kondisi tanah saat ini.` },
              { title: 'Estimasi Panen', desc: `${analysis?.harvestDays} hari setelah tanam. Tanam di awal musim hujan.` },
              { title: 'Irigasi', desc: 'Kebutuhan air 400-600 mm/musim. Pastikan drainase baik.' },
              { title: 'Pemupukan', desc: 'Urea 200 kg/ha + KCl 100 kg/ha fase vegetatif.' },
              { title: 'Pengendalian Hama', desc: 'Pantau ulat grayak & penggerek batang.' },
              { title: 'Potensi Hasil', desc: `${analysis?.yieldPotential} pipilan kering.` },
            ].map((item, i) => (
              <div key={i} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.95rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

