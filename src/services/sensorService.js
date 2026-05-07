import axios from 'axios';

// Base URL - ganti dengan URL backend ESP32/server Anda saat integrasi nyata
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const saved = localStorage.getItem('smartagri_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Dummy Data Generator Dihapus (Kini murni menggunakan data dari Database per Akun)

// ─── Analisis Kondisi Tanah ──────────────────────────────────────────────────
export function analyzeSoil(data) {
  if (!data) return null;
  const { ph, nitrogen, phosphorus, kalium } = data;

  const phStatus = ph < 5.5 ? 'Rendah' : ph > 7.5 ? 'Tinggi' : 'Optimal';
  const nStatus = nitrogen < 80 ? 'Rendah' : nitrogen > 150 ? 'Tinggi' : 'Cukup';
  const pStatus = phosphorus < 50 ? 'Rendah' : phosphorus > 100 ? 'Tinggi' : 'Cukup';
  const kStatus = kalium < 60 ? 'Rendah' : kalium > 120 ? 'Tinggi' : 'Cukup';

  let soilStatus = 'Siap Tanam';
  let soilColor = '#2A9D8F';
  let soilVariant = 'optimal';
  let notifMessage = 'Tanah sudah subur. Silakan tanam jagung varietas BISI-18.';

  if (ph < 5.5) {
    soilStatus = 'Terlalu Asam';
    soilColor = '#E63946';
    soilVariant = 'danger';
    notifMessage = 'pH tanah terlalu asam. Tambahkan kapur dolomit 2 ton/ha untuk menetralkan.';
  } else if (ph > 7.5) {
    soilStatus = 'Terlalu Basa';
    soilColor = '#F4A261';
    soilVariant = 'warning';
    notifMessage = 'pH tanah terlalu basa. Tambahkan belerang 200 kg/ha untuk menurunkan pH.';
  } else if (nitrogen < 80 || phosphorus < 50 || kalium < 60) {
    soilStatus = 'Perlu Pupuk';
    soilColor = '#F4A261';
    soilVariant = 'warning';
    notifMessage = 'Kandungan nutrisi tanah kurang. Disarankan pemupukan NPK sebelum tanam.';
  }

  const variety = ph >= 5.5 && ph <= 7.5 ? 'BISI-18 (Hibrida)' : 'NK-212 (Toleran Asam)';
  const harvestDays = 90;
  const yieldPotential = soilVariant === 'optimal' ? '8–10 Ton/Ha' : '5–7 Ton/Ha';

  return {
    phStatus, nStatus, pStatus, kStatus,
    soilStatus, soilColor, soilVariant, notifMessage,
    variety, harvestDays, yieldPotential,
  };
}

// ─── API Calls ───────────────────────────────────────────────────────────────
export async function fetchLatestSensor() {
  try {
    const res = await api.get('/sensor/latest');
    const actualData = res.data?.data || res.data;
    return { data: actualData, source: actualData?.source || 'live' };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { data: null, source: 'live' }; // Belum ada data
    }
    console.warn("[API] Gagal mengambil data terbaru:", error.message);
    return { data: null, source: 'error' };
  }
}

export async function fetchSensorHistory() {
  try {
    const res = await api.get('/sensor/my-data');
    const actualData = res.data?.data || res.data;
    return { data: Array.isArray(actualData) ? actualData : [], source: 'live' };
  } catch (error) {
    console.warn("[API] Gagal mengambil riwayat:", error.message);
    return { data: [], source: 'error' };
  }
}

export async function fetchSensorStats() {
  try {
    const res = await api.get('/sensor/stats');
    return { data: res.data?.stats || res.data, source: 'live' };
  } catch (error) {
    return { data: null, source: 'error' };
  }
}

