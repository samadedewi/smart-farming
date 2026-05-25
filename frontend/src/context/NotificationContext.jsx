import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    console.error('useNotifications must be used within a NotificationProvider. Providing fallback.');
    return {
      notifications: [],
      updateNotifications: () => {},
      removeNotification: () => {},
      clearNotifications: () => {},
      pushSystemNotification: () => {}
    };
  }
  return context;
};

import { useAuth } from './AuthContext';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth() || {};
  const [sensorNotifs, setSensorNotifs] = useState([]);
  const [sysNotifs, setSysNotifs] = useState([]);

  // Load system notifications from localStorage
  useEffect(() => {
    const loadSysNotifs = () => {
      try {
        const stored = localStorage.getItem('sitani_sys_notifs');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Filter out old notifications (older than 24h)
          const now = Date.now();
          const valid = parsed.filter(n => (now - n.timestamp) < 24 * 60 * 60 * 1000);
          
          if (valid.length !== parsed.length) {
             localStorage.setItem('sitani_sys_notifs', JSON.stringify(valid));
          }
          setSysNotifs(valid);
        }
      } catch (e) {
        console.error("Failed to load sys notifs", e);
      }
    };

    loadSysNotifs();
    window.addEventListener('storage', loadSysNotifs);
    return () => window.removeEventListener('storage', loadSysNotifs);
  }, []);

  // Filter sysNotifs based on user role
  const roleSpecificNotifs = sysNotifs.filter(n => {
    if (!n.targetRole) return true;
    if (!user) return false;
    
    if (n.targetRole === 'operator_user') {
      return user.role !== 'manager_user';
    }
    return n.targetRole === user.role;
  });
  
  // Merge and sort (newest first)
  const notifications = [...roleSpecificNotifs, ...sensorNotifs].sort((a, b) => {
    const tA = a.timestamp || 0;
    const tB = b.timestamp || 0;
    return tB - tA; // descending
  });

  const updateNotifications = (newNotifs) => {
    // sensorNotifs don't typically have timestamps, add a dummy one so they sort properly or just rely on them being new
    const timestampedNotifs = newNotifs.map(n => ({ ...n, timestamp: Date.now() }));
    if (JSON.stringify(timestampedNotifs) !== JSON.stringify(sensorNotifs)) {
      setSensorNotifs(timestampedNotifs);
    }
  };

  const pushSystemNotification = (targetRole, title, message, type = 'info') => {
    const newNotif = {
      targetRole,
      title,
      message,
      type,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9),
      isSystem: true,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const stored = JSON.parse(localStorage.getItem('sitani_sys_notifs') || '[]');
    const updated = [newNotif, ...stored].slice(0, 50); // Keep last 50
    localStorage.setItem('sitani_sys_notifs', JSON.stringify(updated));
    setSysNotifs(updated);
  };

  const removeNotification = (indexOrId) => {
    // If it's a string, it's an ID from system notification
    if (typeof indexOrId === 'string') {
      const updated = sysNotifs.filter(n => n.id !== indexOrId);
      localStorage.setItem('sitani_sys_notifs', JSON.stringify(updated));
      setSysNotifs(updated);
    } else {
      // Otherwise it's an index from the merged array.
      // For simplicity, if we remove by index, we need to know if it's sensor or system.
      // The easiest way is to pass the object or its ID.
      // In Notifications.jsx, it passes the index of the mapped array.
      // Let's just find the item in the merged array:
      const item = notifications[indexOrId];
      if (item?.isSystem) {
        const updated = sysNotifs.filter(n => n.id !== item.id);
        localStorage.setItem('sitani_sys_notifs', JSON.stringify(updated));
        setSysNotifs(updated);
      } else {
        // It's a sensor notif
        setSensorNotifs(prev => prev.filter(n => n !== item));
      }
    }
  };

  const clearNotifications = () => {
    setSensorNotifs([]);
    const updatedSys = sysNotifs.filter(n => n.targetRole !== user?.role);
    localStorage.setItem('sitani_sys_notifs', JSON.stringify(updatedSys));
    setSysNotifs(updatedSys);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      updateNotifications, 
      removeNotification, 
      clearNotifications,
      pushSystemNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
