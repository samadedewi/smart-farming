import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { NotificationCard } from './Notifications';

// Bell Icon SVG
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const Topbar = React.memo(({ isOnline = true, lastUpdate = null, sidebarCollapsed, setSidebarCollapsed }) => {
  const { notifications, removeNotification } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const activeNotifs = notifications || [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-topbar" style={{
      position: 'fixed',
      top: 0,
      left: sidebarCollapsed ? '68px' : '220px',
      right: 0,
      height: '64px',
      background: 'var(--bg-white, #ffffff)',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'left 0.25s ease',
    }}>

      {/* Left: Hamburger, Page title / brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger Menu (visible on mobile only via CSS or just keep it for collapsed) */}
        <button 
          className="hamburger-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px', color: 'var(--primary-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div className="topbar-divider" style={{ width: '1px', height: '24px', background: '#e0e0e0' }} />
        <div className="topbar-welcome">
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-dark, #2F4F2F)', lineHeight: 1.1 }}>
            Selamat Datang
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Right: Status, Last Update, Bell, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* IoT Status Pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
          background: isOnline ? 'rgba(42,157,143,0.1)' : 'rgba(230,57,70,0.1)',
          color: isOnline ? '#2A9D8F' : '#E63946',
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: isOnline ? '#2A9D8F' : '#E63946',
            display: 'inline-block',
            boxShadow: isOnline ? '0 0 0 2px rgba(42,157,143,0.3)' : 'none',
            animation: isOnline ? 'pulse 2s infinite' : 'none',
          }} />
          {isOnline ? 'Online' : 'Offline'}
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div style={{
            fontSize: '0.72rem', color: '#9ca3af',
            padding: '5px 10px', borderRadius: '8px',
            background: '#f9fafb',
          }}>
            {new Date(lastUpdate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}

        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            style={{
              background: isNotifOpen ? '#f0f5f0' : 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              color: activeNotifs.length > 0 ? 'var(--primary-dark, #2F4F2F)' : '#9ca3af',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
              width: '38px', height: '38px',
            }}
            onMouseEnter={e => { if (!isNotifOpen) e.currentTarget.style.background = '#f5f5f5'; }}
            onMouseLeave={e => { if (!isNotifOpen) e.currentTarget.style.background = 'none'; }}
            title="Notifikasi"
          >
            <BellIcon />
            {activeNotifs.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px', right: '4px',
                background: '#E63946',
                color: 'white',
                fontSize: '0.6rem',
                fontWeight: 800,
                width: '16px', height: '16px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid white',
                lineHeight: 1,
              }}>
                {activeNotifs.length > 9 ? '9+' : activeNotifs.length}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotifOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '360px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              border: '1px solid #e8e8e8',
              padding: '16px',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Notifikasi</h4>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>
                    {activeNotifs.length === 0 ? 'Tidak ada notifikasi' : `${activeNotifs.length} peringatan aktif`}
                  </p>
                </div>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  style={{ background: '#f5f5f5', border: 'none', color: '#6b7280', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}
                >
                  Tutup
                </button>
              </div>

              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {activeNotifs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔔</div>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>Semua parameter normal</p>
                  </div>
                ) : (
                  activeNotifs.map((n, i) => (
                    <NotificationCard key={i} notif={n} onClose={() => removeNotification(i)} />
                  ))
                )}
              </div>

              {activeNotifs.length > 0 && (
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '10px', paddingTop: '8px', textAlign: 'center' }}>
                  <Link to="/dashboard" onClick={() => setIsNotifOpen(false)} style={{ fontSize: '0.8rem', color: 'var(--primary-dark, #2F4F2F)', fontWeight: 600, textDecoration: 'none' }}>
                    Lihat Semua →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

export default Topbar;
