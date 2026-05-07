import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationCard } from './Notifications';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/monitoring', label: 'Monitoring' },
  { path: '/riwayat', label: 'Riwayat' },
  { path: '/laporan', label: 'Laporan' },
  { path: '/pengaturan', label: 'Pengaturan' },
];

const Navbar = React.memo(({ isOnline = true, lastUpdate = null }) => {
  const { user, logout } = useAuth();
  const { notifications, removeNotification } = useNotifications();
  const location = useLocation();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  const activeNotifs = notifications || [];

  return (
    <header style={{
      background: 'var(--bg-white)',
      borderBottom: '1px solid #e8e8e8',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {/* Brand */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.1rem', lineHeight: 1 }}>SmartAgri</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>IOT FARMING SYSTEM</div>
          </div>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: 'flex', gap: '4px' }}>
          {NAV_ITEMS.map(({ path, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center',
                padding: '8px 14px', borderRadius: '8px', fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--primary-dark)' : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'var(--transition)',
              }}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* IoT Status */}
          <div style={{
            padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
            background: isOnline ? 'rgba(42,157,143,0.1)' : 'rgba(230,57,70,0.1)',
            color: isOnline ? 'var(--success)' : 'var(--danger)',
          }}>
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {lastUpdate && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(lastUpdate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}

          {/* Bell with Badge */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              style={{ 
                background: isNotifOpen ? '#f5f5f5' : 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '8px 12px', 
                borderRadius: '8px', 
                color: activeNotifs.length > 0 ? 'var(--primary-dark)' : 'var(--text-muted)',
                position: 'relative',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Notifikasi
              {activeNotifs.length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {activeNotifs.length > 9 ? '9+' : activeNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid #e8e8e8',
                padding: '16px',
                zIndex: 1000,
                animation: 'fadeIn 0.25s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Daftar Notifikasi</h4>
                  <button onClick={() => setIsNotifOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Tutup</button>
                </div>

                <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {activeNotifs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '0.875rem' }}>Kosong</p>
                    </div>
                  ) : (
                    activeNotifs.map((n, i) => (
                      <NotificationCard 
                        key={i} 
                        notif={n} 
                        onClose={() => removeNotification(i)} 
                      />
                    ))
                  )}
                </div>
                
                {activeNotifs.length > 0 && (
                  <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '8px', textAlign: 'center' }}>
                    <Link to="/dashboard" onClick={() => setIsNotifOpen(false)} style={{ fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 600 }}>Lihat Semua</Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: '#f5f5f5' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{user?.name?.split(' ')[0]}</span>
          </div>

          {/* Logout */}
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600 }}>
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
});

export default Navbar;
