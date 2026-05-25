import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * AppLayout — wraps all authenticated pages with Sidebar + Topbar.
 * Usage:
 *   <AppLayout isOnline={...} lastUpdate={...}>
 *     <YourPageContent />
 *   </AppLayout>
 */
const AppLayout = ({ children, isOnline = true, lastUpdate = null }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color, #f0f2f5)' }}>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main area */}
      <div className="app-main-area" style={{
        flex: 1,
        marginLeft: sidebarCollapsed ? '68px' : '220px',
        transition: 'margin-left 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Topbar */}
        <Topbar isOnline={isOnline} lastUpdate={lastUpdate} sidebarCollapsed={sidebarCollapsed} />

        {/* Page content */}
        <main style={{
          flex: 1,
          marginTop: '64px', /* topbar height */
          padding: '24px',
          overflow: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
