import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/monitoring',
    label: 'Monitoring',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    path: '/riwayat',
    label: 'Riwayat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    path: '/laporan',
    label: 'Laporan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },

];

const Sidebar = React.memo(({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199,
          }}
          className="sidebar-overlay"
        />
      )}

      <aside className={`app-sidebar ${!collapsed ? 'open' : ''}`} style={{
        width: collapsed ? '68px' : '220px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1B3A1B 0%, #2F4F2F 60%, #3a6b3a 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 200,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>

        {/* Logo Area */}
        <div style={{
          padding: collapsed ? '20px 14px' : '20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '64px',
          transition: 'padding 0.25s ease',
        }}>
          {!collapsed && (
            <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.2rem', letterSpacing: '-0.5px', lineHeight: 1 }}>SiTani</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', marginTop: '2px' }}>IOT FARMING</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <span style={{ fontWeight: 800, color: '#a8d5a8', fontSize: '1.1rem' }}>S</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {collapsed
                ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', padding: '8px 10px 4px', textTransform: 'uppercase' }}>
              MENU
            </div>
          )}
          {NAV_ITEMS.map(({ path, label, icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '11px 14px' : '10px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  background: active
                    ? 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)'
                    : 'transparent',
                  borderLeft: active ? '3px solid #a8d5a8' : '3px solid transparent',
                  fontWeight: active ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
              >
                <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout at Bottom */}
        <div style={{
          padding: collapsed ? '12px 8px' : '12px 8px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {!collapsed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              marginBottom: '6px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #a8d5a8, #4a7c4a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name?.split(' ')[0] || 'User'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>Petani</div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            title="Keluar"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
              padding: collapsed ? '11px 14px' : '10px 12px',
              borderRadius: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,100,100,0.8)',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,100,100,0.12)'; e.currentTarget.style.color = '#ff8080'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,100,100,0.8)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;
