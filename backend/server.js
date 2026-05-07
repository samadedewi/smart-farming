/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   SmartAgri IoT Backend — Express Server                ║
 * ║   Menerima data dari ESP32, menyimpan sementara          ║
 * ║   di memory (array), dan menyajikan via REST API         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const ML_URL = 'http://localhost:5000/predict';

// ─── Database Connection ──────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'smart_farming',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create tables if not exists
async function initDB() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Petani',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ph FLOAT NOT NULL,
        nitrogen INT NOT NULL,
        phosphorus INT NOT NULL,
        kalium INT NOT NULL,
        suhu FLOAT NOT NULL,
        kelembaban INT NOT NULL,
        rekomendasi VARCHAR(255),
        kekurangan_hara VARCHAR(255),
        hasil_panen FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[DB] Tabel users & sensor_data siap.');
    connection.release();
  } catch (err) {
    console.error('[DB] Gagal inisialisasi database:', err.message);
  }
}
initDB();

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ─── Authentication Middleware ─────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Sesi tidak valid atau telah berakhir.' });
    }
    req.user = user; // Set user login aktif
    next();
  });
}

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  console.log("BODY MASUK:", req.body);
  try {
    const { nama, email, password } = req.body;

    // Validasi input
    if (!nama || !email || !password) {
      console.log('⚠️ [AUTH] Register failed: Missing fields');
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    // Cek duplikasi email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('⚠️ [AUTH] Register failed: Email already exists');
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });
    }

    // Hash password & Simpan
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [nama, email, hashedPassword]
    );

    console.log('✅ [AUTH] Register success:', email);
    res.status(201).json({ success: true, message: 'Registrasi berhasil.' });
  } catch (err) {
    console.error('❌ [AUTH] Register ERROR:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password harus diisi.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
});

// ─── Helper: ML API Prediction ──────────────────────────────
async function getMLPrediction(data) {
  try {
    console.log("📡 [ML] Requesting prediction...");
    const response = await axios.post(ML_URL, {
      ph: parseFloat(data.ph),
      n: parseInt(data.nitrogen || data.n || 0),
      p: parseInt(data.phosphorus || data.p || 0),
      k: parseInt(data.kalium || data.k || 0)
    }, { timeout: 3000 });

    if (response.data) {
      console.log("✅ [ML] Prediction success:", response.data.rekomendasi_varietas);
      return {
        rekomendasi: response.data.rekomendasi_varietas,
        kekurangan_hara: response.data.kekurangan_hara,
        hasil_panen: response.data.hasil_panen,
        status: response.data.status || 'ML Active'
      };
    }
  } catch (err) {
    console.log("⚠️ [ML] ERROR or Timeout:", err.message);
  }

  // Fallback jika ML API gagal
  return {
    rekomendasi: "Sistem Cadangan: Perlu pengecekan manual",
    kekurangan_hara: "Tidak tersedia",
    hasil_panen: 0.0,
    status: "ML Offline"
  };
}

// ─── Sensor Routes ───────────────────────────────────────────
// Endpoint khusus untuk hardware ESP32 (tanpa JWT, menggunakan userId dari body)
app.post('/api/sensor/esp32', async (req, res) => {
  const { userId, ph, n, p, k, nitrogen, phosphorus, kalium, suhu, kelembaban } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId wajib diisi untuk request dari ESP32' });
  }

  const valPh = ph;
  const valN = n !== undefined ? n : nitrogen;
  const valP = p !== undefined ? p : phosphorus;
  const valK = k !== undefined ? k : kalium;
  const valSuhu = suhu;
  const valKelembaban = kelembaban;

  if (valPh === undefined || valN === undefined) {
    return res.status(400).json({ success: false, message: 'Data ph dan n (nitrogen) wajib diisi' });
  }

  const prediction = await getMLPrediction(req.body);

  try {
    const [result] = await pool.query(
      `INSERT INTO sensor_data 
       (user_id, ph, nitrogen, phosphorus, kalium, suhu, kelembaban, rekomendasi, kekurangan_hara, hasil_panen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        parseFloat(Number(valPh).toFixed(1)), 
        Math.round(Number(valN)), 
        valP !== undefined ? Math.round(Number(valP)) : 0, 
        valK !== undefined ? Math.round(Number(valK)) : 0, 
        valSuhu !== undefined ? parseFloat(Number(valSuhu).toFixed(1)) : 28.0, 
        valKelembaban !== undefined ? Math.round(Number(valKelembaban)) : 70,
        prediction.rekomendasi,
        prediction.kekurangan_hara,
        prediction.hasil_panen
      ]
    );

    res.status(201).json({ success: true, message: 'Data ESP32 berhasil disimpan' });
  } catch (error) {
    console.error('❌ [DB] Error saving ESP32 sensor data:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data sensor' });
  }
});

app.post('/api/sensor', authenticateToken, async (req, res) => {
  const { ph, n, p, k, nitrogen, phosphorus, kalium, suhu, kelembaban } = req.body;
  const userId = req.user.id;

  const valPh = ph;
  const valN = n !== undefined ? n : nitrogen;
  const valP = p !== undefined ? p : phosphorus;
  const valK = k !== undefined ? k : kalium;
  const valSuhu = suhu;
  const valKelembaban = kelembaban;

  if (valPh === undefined || valN === undefined) {
    return res.status(400).json({ success: false, message: 'Data ph dan n (nitrogen) wajib diisi' });
  }

  const prediction = await getMLPrediction(req.body);

  try {
    const [result] = await pool.query(
      `INSERT INTO sensor_data 
       (user_id, ph, nitrogen, phosphorus, kalium, suhu, kelembaban, rekomendasi, kekurangan_hara, hasil_panen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        parseFloat(Number(valPh).toFixed(1)), 
        Math.round(Number(valN)), 
        valP !== undefined ? Math.round(Number(valP)) : 0, 
        valK !== undefined ? Math.round(Number(valK)) : 0, 
        valSuhu !== undefined ? parseFloat(Number(valSuhu).toFixed(1)) : 28.0, 
        valKelembaban !== undefined ? Math.round(Number(valKelembaban)) : 70,
        prediction.rekomendasi,
        prediction.kekurangan_hara,
        prediction.hasil_panen
      ]
    );

    const [newRecord] = await pool.query('SELECT * FROM sensor_data WHERE id = ?', [result.insertId]);
    const record = {
      ...newRecord[0],
      timestamp: newRecord[0].created_at,
      source: 'live',
      prediksi: {
        rekomendasi: newRecord[0].rekomendasi,
        kekurangan_hara: newRecord[0].kekurangan_hara,
        hasil_panen: newRecord[0].hasil_panen,
      }
    };
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('❌ [DB] Error saving sensor data:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data sensor' });
  }
});

app.get('/api/sensor/latest', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensor_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    if (rows.length === 0) return res.json({ success: true, data: null, message: 'Belum ada data' });
    
    const record = { 
      ...rows[0], 
      timestamp: rows[0].created_at,
      prediksi: { 
        rekomendasi: rows[0].rekomendasi, 
        kekurangan_hara: rows[0].kekurangan_hara, 
        hasil_panen: rows[0].hasil_panen 
      } 
    };
    res.json({ success: true, data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/sensor/my-data', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  try {
    const [rows] = await pool.query('SELECT * FROM sensor_data WHERE user_id = ? ORDER BY created_at ASC LIMIT ?', [req.user.id, limit]);
    const data = rows.map(r => ({ 
      ...r, 
      timestamp: r.created_at, 
      prediksi: { 
        rekomendasi: r.rekomendasi, 
        kekurangan_hara: r.kekurangan_hara, 
        hasil_panen: r.hasil_panen 
      } 
    }));
    res.json({ success: true, total: rows.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/sensor/stats', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sensor_data WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) return res.json({ success: true, stats: null, message: 'Belum ada data' });

    const fields = ['ph', 'nitrogen', 'phosphorus', 'kalium', 'suhu', 'kelembaban'];
    const stats = {};

    fields.forEach(field => {
      const values = rows.map(d => d[field]).filter(v => v !== null);
      if (values.length === 0) return;
      stats[field] = {
        avg: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });

    res.json({ success: true, stats, totalRecords: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.delete('/api/sensor/clear', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM sensor_data WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Data cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🌱 SmartAgri Backend running on http://localhost:${PORT}`);
});

module.exports = app;

