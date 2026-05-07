import React, { useState, useEffect } from 'react';

/**
 * Notifications Component
 * Menampilkan daftar notifikasi sensor berdasarkan kondisi real-time.
 */
export default function Notifications({ data = [] }) {
  const [activeNotifs, setActiveNotifs] = React.useState(data);

  // Sinkronisasi data saat props berubah
  React.useEffect(() => {
    setActiveNotifs(data);
  }, [data]);

  const removeNotif = (index) => {
    setActiveNotifs(prev => prev.filter((_, i) => i !== index));
  };

  if (activeNotifs.length === 0) return null;

  return (
    <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Notifikasi Sensor
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeNotifs.length} Peringatan Aktif
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px' }}>
        {activeNotifs.map((n, i) => (
          <NotificationCard key={i} notif={n} onClose={() => removeNotif(i)} />
        ))}
      </div>
    </div>
  );
}

export function NotificationCard({ notif, onClose }) {
  const config = {
    critical: {
      bg: '#FFF5F5',
      border: '#FEB2B2',
      accent: '#E53E3E',
      label: 'Kritis'
    },
    warning: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      accent: '#D97706',
      label: 'Peringatan'
    },
    info: {
      bg: '#F0FFF4',
      border: '#C6F6D5',
      accent: '#38A169',
      label: 'Info'
    }
  };

  const style = config[notif.type] || config.info;

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderLeft: `4px solid ${style.accent}`,
      borderRadius: '12px',
      padding: '16px',
      position: 'relative',
      display: 'flex',
      gap: '12px',
      animation: 'fadeIn 0.3s ease',
      marginBottom: '8px'
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', background: style.accent, color: 'white', borderRadius: '4px', height: 'fit-content', marginTop: '2px' }}>
        {style.label}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2D3748' }}>{notif.title}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{notif.time}</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#4A5568', lineHeight: 1.4 }}>
          {notif.message}
        </p>
        <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 700, color: style.accent }}>
          Nilai: {notif.value}
        </div>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#2D3748',
          opacity: 0.6
        }}
        onMouseOver={e => e.currentTarget.style.opacity = 1}
        onMouseOut={e => e.currentTarget.style.opacity = 0.6}
      >
        Tutup
      </button>
    </div>
  );
}

/**
 * Logic untuk generate notifikasi berdasarkan data sensor
 */
export const generateNotifications = (data) => {
  if (!data) return [];
  const notif = [];
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Validasi pH
  if (data.ph < 5.6) {
    notif.push({
      type: "critical",
      title: "pH Tanah",
      message: "pH sangat asam terdeteksi. Segera tambahkan kapur dolomit.",
      value: data.ph,
      time: currentTime
    });
  } else if (data.ph < 6) {
    notif.push({
      type: "warning",
      title: "pH Tanah",
      message: "pH mendekati batas asam. Pantau kondisi tanah secara berkala.",
      value: data.ph,
      time: currentTime
    });
  }

  // Validasi Nitrogen
  if (data.nitrogen > 120) {
    notif.push({
      type: "info",
      title: "Nitrogen (N)",
      message: "Kandungan Nitrogen meningkat signifikan. Pemupukan sudah mencukupi.",
      value: data.nitrogen + " mg/kg",
      time: currentTime
    });
  }

  // Validasi Kelembaban
  if (data.kelembaban < 50) {
    notif.push({
      type: "warning",
      title: "Kelembaban",
      message: "Tanah mulai kering. Disarankan untuk melakukan penyiraman.",
      value: data.kelembaban + "%",
      time: currentTime
    });
  }

  // Fallback jika semua normal (Hanya jika ingin notifikasi 'OK' muncul)
  /*
  if (notif.length === 0) {
    notif.push({
      type: "info",
      title: "Sistem",
      message: "Semua parameter sensor dalam rentang optimal. Tanaman tumbuh dengan baik.",
      value: "OK",
      time: currentTime
    });
  }
  */

  return notif.slice(0, 5); // Limit 5 notifikasi terbaru
};
