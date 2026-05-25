import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import { SectionHeader } from '../components/Cards';
import { fetchSensorHistory, analyzeSoil } from '../services/sensorService';

function fmt(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

function StatusChip({ status }) {
  const colors = {
    Optimal: { bg: 'rgba(42,157,143,0.12)', color: '#2A9D8F' },
    Cukup: { bg: 'rgba(42,157,143,0.12)', color: '#2A9D8F' },
    Rendah: { bg: 'rgba(230,57,70,0.12)', color: '#E63946' },
    Tinggi: { bg: 'rgba(244,162,97,0.15)', color: '#d97706' },
    'Siap Tanam': { bg: 'rgba(42,157,143,0.12)', color: '#2A9D8F' },
    'Perlu Pupuk': { bg: 'rgba(244,162,97,0.15)', color: '#d97706' },
    'Terlalu Asam': { bg: 'rgba(230,57,70,0.12)', color: '#E63946' },
    'Terlalu Basa': { bg: 'rgba(244,162,97,0.15)', color: '#d97706' },
  };
  const s = colors[status] || colors['Cukup'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function Riwayat() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchSensorHistory();
        const rawData = Array.isArray(res?.data) ? res.data : [];
        
        setHistory(rawData.map((d, i) => ({
          ...d,
          id: `REC-${String(i + 1).padStart(3, '0')}`,
          analysis: analyzeSoil(d),
        })));
      } catch (error) {
        console.error("Gagal memuat riwayat:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const safeHistory = Array.isArray(history) ? history : [];
  const filtered = safeHistory.filter(r =>
    String(r.id || '').toLowerCase().includes(search.toLowerCase()) ||
    r.analysis?.soilStatus?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout isOnline={history.length > 0}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <SectionHeader title="Riwayat Data Sensor" subtitle="Seluruh rekaman data dari perangkat IoT" />
          <input
            type="text"
            placeholder="Cari rekaman..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '0.875rem', outline: 'none', width: '250px' }}
          />
        </div>

        <div className="card" style={{ overflowX: 'auto', padding: 0, transform: 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['ID', 'Waktu', 'pH', 'Nitrogen', 'Fosfor', 'Kalium', 'Suhu', 'Kelembaban', 'Status'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Tidak ada data ditemukan.</td></tr>
              ) : (Array.isArray(filtered) ? filtered : []).map((row, i) => (
                <tr key={row?.id || i} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? 'white' : '#fdfdf9', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f7f0'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fdfdf9'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-dark)' }}>{row?.id || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(row?.timestamp)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row?.ph ?? '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{row?.nitrogen ?? '-'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mg/kg</span></td>
                  <td style={{ padding: '12px 16px' }}>{row?.phosphorus ?? '-'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mg/kg</span></td>
                  <td style={{ padding: '12px 16px' }}>{row?.kalium ?? '-'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mg/kg</span></td>
                  <td style={{ padding: '12px 16px' }}>{row?.suhu ?? '-'}°C</td>
                  <td style={{ padding: '12px 16px' }}>{row?.kelembaban ?? '-'}%</td>
                  <td style={{ padding: '12px 16px' }}><StatusChip status={row?.analysis?.soilStatus || 'Optimal'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Menampilkan {filtered.length} dari {history.length} rekaman
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

