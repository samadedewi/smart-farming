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
      clearNotifications: () => {}
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Function to add or update notifications with deep equality check
  const updateNotifications = (newNotifs) => {
    // Only update if the content has actually changed to prevent unnecessary re-renders
    if (JSON.stringify(newNotifs) !== JSON.stringify(notifications)) {
      setNotifications(newNotifs);
    }
  };

  const removeNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      updateNotifications, 
      removeNotification, 
      clearNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
