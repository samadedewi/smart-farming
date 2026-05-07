import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import Navbar from '../components/Navbar';
import { StatCard, InfoCard, StatusBanner } from '../components/Cards';
import { PhChart, NPKChart } from '../components/Charts';
import { fetchLatestSensor, fetchSensorHistory, analyzeSoil } from '../services/sensorService';
import { useNotifications } from '../context/NotificationContext';
import { generateNotifications } from '../components/Notifications';

const REFRESH_INTERVAL = 300000; // 5 menit

// Memoized Refresh Button to prevent unnecessary re-renders
const RefreshButton = memo(({ onClick, refreshing, dataSource }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {dataSource === 'demo' && (
        <span style={{ padding: '6px 12px', background: '#fff3cd', color: '#856404', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
          MODE DEMO
        </span>
      )}
      <button onClick={() => onClick(true)} disabled={refreshing} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
        borderRadius: '10px', background: 'var(--primary-dark)', color: 'white',
        border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
        opacity: refreshing ? 0.7 : 1,
        transition: 'all 0.2s ease'
      }}>
        {refreshing ? 'Memperbarui...' : 'Refresh'}
      </button>
    </div>
  );
});

export default function Dashboard() {
  console.log("Render Dashboard: " + new Date().toLocaleTimeString());
  
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [dataSource, setDataSource] = useState('demo');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { updateNotifications } = useNotifications();
  
  // Refs for deep data comparison to avoid unnecessary re-renders
  const prevLatestRef = useRef(null);
  const prevHistoryRef = useRef(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetchLatestSensor(),
        fetchSensorHistory(),
      ]);

      const latestData = latestRes?.data || null;
      const historyData = Array.isArray(historyRes?.data) ? historyRes.data : [];

      // 1. Periksa kesamaan data LATEST sebelum update state
      if (JSON.stringify(latestData) !== JSON.stringify(prevLatestRef.current)) {
        setLatest(latestData);
        prevLatestRef.current = latestData;
        
        if (latestData) {
          setAnalysis(analyzeSoil(latestData));
          setDataSource(latestRes.source);
          setLastUpdate(latestData.timestamp);
          
          // Update global notifications (hanya jika ada data baru)
          const newNotifs = generateNotifications(latestData);
          updateNotifications(newNotifs);
        }
      }
      
      // 2. Periksa kesamaan data HISTORY sebelum update state
      if (JSON.stringify(historyData) !== JSON.stringify(prevHistoryRef.current)) {
        setHistory(historyData);
        prevHistoryRef.current = historyData;
      }

    } catch (error) {
      console.error("Gagal mengambil data sensor:", error);
    } finally {
      if (isManual) setRefreshing(false);
      setLoading(false);
    }
  }, [updateNotifications]);

  // Auto-refresh: Jalankan secara diam-diam di background (isManual = false)
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !latest) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Memuat data sistem smart farming...</p>
        </div>
      </div>
    );
  }

  // Jika data tetap null setelah loading selesai (berarti user baru belum ada data)
  if (!latest) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌱</div>
          <h2 style={{ marginBottom: '8px' }}>Belum Ada Data Sensor</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Sistem belum menerima data dari perangkat sensor untuk akun Anda. Pastikan perangkat ESP32 telah menyala dan mulai mengirim data.
          </p>
          <button onClick={() => fetchData(true)} style={{
             padding: '10px 24px', borderRadius: '8px', background: 'var(--primary-dark)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600
          }}>Refresh Dashboard</button>
        </div>
      </div>
    );
  }

  const getBarColor = (status) =>
    status === 'Rendah' ? 'var(--danger)' : status === 'Tinggi' ? 'var(--warning)' : 'var(--success)';
  const getStatusColor = (status) =>
    status === 'Rendah' ? '#E63946' : status === 'Tinggi' ? '#F4A261' : '#2A9D8F';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <Navbar isOnline={dataSource === 'live'} lastUpdate={lastUpdate} />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Dashboard Monitoring</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lahan Jagung - Sektor A1</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ccc' }}></span>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Auto update setiap 5 menit</span>
            </div>
          </div>
          <RefreshButton onClick={fetchData} refreshing={refreshing} dataSource={dataSource} />
        </div>

        {/* Status Banner */}
        <StatusBanner message={analysis?.notifMessage} variant={analysis?.soilVariant} />

        {/* Stat Cards - NPK & pH */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard
            label="pH Tanah" value={latest?.ph} unit=""
            status={analysis?.phStatus}
            statusColor={getStatusColor(analysis?.phStatus === 'Optimal' ? 'Cukup' : analysis?.phStatus)}
            barPercent={(latest?.ph / 14) * 100}
            barColor={analysis?.phStatus === 'Optimal' ? 'var(--success)' : 'var(--warning)'}
          />
          <StatCard
            label="Nitrogen (N)" value={latest?.nitrogen} unit="mg/kg"
            status={analysis?.nStatus} statusColor={getStatusColor(analysis?.nStatus)}
            barPercent={(latest?.nitrogen / 200) * 100} barColor={getBarColor(analysis?.nStatus)}
          />
          <StatCard
            label="Fosfor (P)" value={latest?.phosphorus} unit="mg/kg"
            status={analysis?.pStatus} statusColor={getStatusColor(analysis?.pStatus)}
            barPercent={(latest?.phosphorus / 150) * 100} barColor={getBarColor(analysis?.pStatus)}
          />
          <StatCard
            label="Kalium (K)" value={latest?.kalium} unit="mg/kg"
            status={analysis?.kStatus} statusColor={getStatusColor(analysis?.kStatus)}
            barPercent={(latest?.kalium / 150) * 100} barColor={getBarColor(analysis?.kStatus)}
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <PhChart data={Array.isArray(history) ? history : []} />
          <NPKChart data={Array.isArray(history) ? history : []} />
        </div>

        {/* Bottom Row: Cuaca & Rekomendasi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Cuaca & Estimasi */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              Estimasi Panen
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Suhu</span>
                <strong>{latest?.suhu}°C</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Kelembaban</span>
                <strong>{latest?.kelembaban}%</strong>
              </div>
              <div style={{ borderTop: '1px dashed #e0e0e0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Umur Panen</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>{latest?.prediksi?.umur_panen || analysis?.harvestDays} Hari</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Prediksi Hasil</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>{latest?.prediksi?.hasil_panen || analysis?.yieldPotential} Ton/Ha</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rekomendasi */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              Rekomendasi Lahan
            </h3>
            <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#2f855a', fontWeight: 700, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                REKOMENDASI SISTEM
              </div>
              <div style={{ fontWeight: 700, color: '#276749', fontSize: '1.05rem' }}>{latest?.prediksi?.rekomendasi || analysis?.variety}</div>
            </div>
            {latest?.prediksi?.kekurangan_hara && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>DETEKSI KEKURANGAN HARA</div>
                <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '0.95rem' }}>{latest.prediksi.kekurangan_hara}</div>
              </div>
            )}
            <h4 style={{ fontSize: '0.875rem', marginBottom: '10px', color: 'var(--text-muted)' }}>Status Terkini:</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {analysis?.notifMessage}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

