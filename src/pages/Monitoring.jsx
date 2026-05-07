import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { SectionHeader } from '../components/Cards';
import { DetailChart } from '../components/Charts';
import { fetchLatestSensor, fetchSensorHistory, analyzeSoil } from '../services/sensorService';

export default function Monitoring() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [l, h] = await Promise.all([fetchLatestSensor(), fetchSensorHistory()]);
      setLatest(l?.data || null);
      setHistory(Array.isArray(h?.data) ? h.data : []);
    } catch (error) {
      console.error("Gagal memuat monitoring:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 menit
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <Navbar isOnline={latest !== null} lastUpdate={latest?.timestamp} />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <SectionHeader title="Monitoring Detail" subtitle="Grafik perubahan setiap parameter sensor secara historis" />
          <button onClick={fetchData} disabled={refreshing} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
            borderRadius: '10px', background: 'var(--primary-dark)', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
          }}>
            {refreshing ? 'Memuat...' : 'Refresh'}
          </button>
        </div>

        {latest && (
          <div style={{ background: 'var(--primary-dark)', color: 'white', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            {[
              { label: 'pH Saat Ini', val: latest?.ph, unit: '' },
              { label: 'Nitrogen', val: latest?.nitrogen, unit: 'mg/kg' },
              { label: 'Fosfor', val: latest?.phosphorus, unit: 'mg/kg' },
              { label: 'Kalium', val: latest?.kalium, unit: 'mg/kg' },
              { label: 'Suhu', val: latest?.suhu, unit: '°C' },
              { label: 'Kelembaban', val: latest?.kelembaban, unit: '%' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{item.val ?? '-'}<span style={{ fontSize: '0.875rem', fontWeight: 400 }}> {item.unit}</span></div>
              </div>
            ))}
          </div>
        )}

        {!latest && !loading && (
          <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '14px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Data sensor belum tersedia.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
          <DetailChart data={Array.isArray(history) ? history : []} dataKey="ph" label="pH" color="#2F4F2F" domain={[4, 9]} />
          <DetailChart data={Array.isArray(history) ? history : []} dataKey="nitrogen" label="Nitrogen" unit="mg/kg" color="#4A7C4A" domain={[0, 200]} />
          <DetailChart data={Array.isArray(history) ? history : []} dataKey="phosphorus" label="Fosfor" unit="mg/kg" color="#F4A261" domain={[0, 150]} />
          <DetailChart data={Array.isArray(history) ? history : []} dataKey="kalium" label="Kalium" unit="mg/kg" color="#2A9D8F" domain={[0, 150]} />
          <DetailChart data={Array.isArray(history) ? history : []} dataKey="suhu" label="Suhu" unit="°C" color="#E63946" domain={[20, 40]} />
          <DetailChart data={Array.isArray(history) ? history : []} dataKey="kelembaban" label="Kelembaban" unit="%" color="#457b9d" domain={[30, 100]} />
        </div>
      </div>
    </div>
  );
}

