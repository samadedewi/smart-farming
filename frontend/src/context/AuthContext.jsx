import React, { createContext, useContext, useState } from 'react';
import { BASE_URL } from '../services/sensorService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sitani_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (data.success) {
        const userData = { ...data.user, token: data.token };
        setUser(userData);
        localStorage.setItem('sitani_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login gagal.' };
      }
    } catch (error) {
      return { success: false, message: 'Koneksi ke server gagal.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'Koneksi ke server gagal.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sitani_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
