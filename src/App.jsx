import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Riwayat from './pages/Riwayat';
import Laporan from './pages/Laporan';
import Pengaturan from './pages/Pengaturan';
import RegisterPage from './pages/RegisterPage';

// Protected route wrapper
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/monitoring" element={<PrivateRoute><Monitoring /></PrivateRoute>} />
      <Route path="/riwayat" element={<PrivateRoute><Riwayat /></PrivateRoute>} />
      <Route path="/laporan" element={<PrivateRoute><Laporan /></PrivateRoute>} />
      <Route path="/pengaturan" element={<PrivateRoute><Pengaturan /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  console.log("🚀 Smart Farming: NotificationProvider Loaded");
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppRoutes />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
