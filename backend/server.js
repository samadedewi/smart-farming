/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   SiTani IoT Backend — Express Server                   ║
 * ║   Menerima data dari ESP32, menyimpan ke MySQL DB,       ║
 * ║   menghitung logika agronomis & pemupukan cerdas.        ║
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
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
require('dotenv').config();

const app = express();

// Helper fungsi pembantu untuk parsing numerik yang aman dan bebas crash NaN
function safeParseFloat(val, fallback = 0.0) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : parseFloat(num.toFixed(1));
}

function safeParseInt(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : Math.round(num);
}
const PORT = process.env.PORT || 3001;
const ML_URL = process.env.ML_URL || 'http://localhost:5000/predict';

// ─── Database Connection ──────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'smart_farming',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create tables if not exists
async function initDB() {
  try {
    const connection = await pool.getConnection();
    
    // 1. Table users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'manager_user', -- 'manager_user' vs 'operator'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Table lahan (Block config)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lahan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        nama_blok VARCHAR(255) NOT NULL,
        luas_lahan FLOAT NOT NULL,
        jenis_tanah VARCHAR(100) DEFAULT 'Andosol',
        tekstur VARCHAR(100) DEFAULT 'Sedang',
        kecamatan VARCHAR(100) DEFAULT 'Tomohon',
        id_varietas VARCHAR(255) DEFAULT 'Bisi 2', -- 'Bisi 2', 'NK Perkasa', 'Pertiwi', 'Pioneer Sweet Corn'
        tanggal_tanam DATE NULL,
        umur_tanaman_aktif INT DEFAULT 0,
        n_dasar FLOAT DEFAULT 50,
        p_dasar FLOAT DEFAULT 40,
        k_dasar FLOAT DEFAULT 30,
        benih_per_lubang INT DEFAULT 2,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Table pemupukan (Fertilization orders/schedules)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pemupukan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lahan_id INT NOT NULL,
        jenis_fase VARCHAR(100) NOT NULL, -- 'Pemupukan Dasar', 'Pemupukan Susulan I', 'Pemupukan Susulan II', 'Pemupukan Susulan III'
        umur_target_hst INT NOT NULL,
        dosis_urea FLOAT DEFAULT 0,
        dosis_sp36 FLOAT DEFAULT 0,
        dosis_kcl FLOAT DEFAULT 0,
        status_eksekusi VARCHAR(50) DEFAULT 'pending', -- 'pending', 'taken', 'completed'
        id_operator_eksekutor INT NULL,
        realisasi_pupuk_digunakan VARCHAR(500) NULL,
        catatan VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Table sensor_data
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        lahan_id INT NULL,
        ph FLOAT NOT NULL,
        nitrogen INT NOT NULL,
        phosphorus INT NOT NULL,
        kalium INT NOT NULL,
        suhu FLOAT NOT NULL,
        kelembaban INT NOT NULL,
        rekomendasi VARCHAR(255),
        kekurangan_hara VARCHAR(255),
        hasil_panen FLOAT,
        dosis_urea FLOAT DEFAULT 0,
        dosis_sp36 FLOAT DEFAULT 0,
        dosis_kcl FLOAT DEFAULT 0,
        sisa_hari_panen FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Schema alterations for backwards compatibility
    try {
      await connection.query(`ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'manager_user'`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE sensor_data ADD COLUMN lahan_id INT NULL`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE sensor_data ADD COLUMN dosis_urea FLOAT DEFAULT 0`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE sensor_data ADD COLUMN dosis_sp36 FLOAT DEFAULT 0`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE sensor_data ADD COLUMN dosis_kcl FLOAT DEFAULT 0`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE sensor_data ADD COLUMN sisa_hari_panen FLOAT DEFAULT 0`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE lahan ADD COLUMN benih_per_lubang INT DEFAULT 2`);
    } catch (err) {}
    try {
      await connection.query(`ALTER TABLE pemupukan ADD COLUMN catatan VARCHAR(500) NULL`);
    } catch (err) {}

    console.log('[DB] Tabel users, lahan, pemupukan & sensor_data siap (Mode Relational Cerdas).');
    connection.release();
  } catch (err) {
    console.error('[DB] Gagal inisialisasi database:', err.message);
  }
}
initDB();

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE'],
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
    req.user = user;
    next();
  });
}

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  console.log("BODY REGISTER MASUK:", req.body);
  try {
    const { nama, email, password, role } = req.body;

    if (!nama || !email || !password) {
      console.log('⚠️ [AUTH] Register failed: Missing fields');
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('⚠️ [AUTH] Register failed: Email already exists');
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const targetRole = role || 'manager_user';
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [nama, email, hashedPassword, targetRole]
    );

    console.log('✅ [AUTH] Register success:', email, 'Role:', targetRole);
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

// GET list of all users/operators
app.get('/api/operators', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Helper: ML API Prediction ──────────────────────────────
async function getMLPrediction(data, lahanDetails = {}) {
  try {
    console.log("📡 [ML] Requesting prediction with 4 models...");
    
    // hitung umur hst secara dinamis
    let calculatedAge = lahanDetails.umur_tanaman_aktif || 15;
    let currentPhase = 'Vegetatif Awal';
    
    if (lahanDetails.tanggal_tanam) {
      const parsedDate = new Date(lahanDetails.tanggal_tanam);
      if (!isNaN(parsedDate.getTime())) {
        const diffTime = Math.abs(new Date() - parsedDate);
        calculatedAge = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const varName = lahanDetails.id_varietas || 'Bisi 2';
        let vAwal = 25, vAkhir = 55;
        if (varName === 'Bisi 2') { vAwal = 30; vAkhir = 60; }
        else if (varName === 'Pertiwi') { vAwal = 25; vAkhir = 50; }
        else if (varName === 'Pioneer Sweet Corn') { vAwal = 20; vAkhir = 45; }
        
        if (calculatedAge <= vAwal) currentPhase = 'Vegetatif Awal';
        else if (calculatedAge <= vAkhir) currentPhase = 'Vegetatif Aktif';
        else currentPhase = 'Generatif';
      }
    }

    const payload = {
      ph: safeParseFloat(data.ph, 6.0),
      n: safeParseInt(data.nitrogen !== undefined && data.nitrogen !== null ? data.nitrogen : data.n, 100),
      p: safeParseInt(data.phosphorus !== undefined && data.phosphorus !== null ? data.phosphorus : data.p, 50),
      k: safeParseInt(data.kalium !== undefined && data.kalium !== null ? data.kalium : data.k, 80),
      kecamatan: lahanDetails.kecamatan || 'Tomohon',
      jenis_tanah: lahanDetails.jenis_tanah || 'Andosol',
      tekstur: lahanDetails.tekstur || 'Lempung',
      varietas: lahanDetails.id_varietas || '',
      total_n_dasar: safeParseFloat(lahanDetails.n_dasar, 50.0),
      total_p_dasar: safeParseFloat(lahanDetails.p_dasar, 40.0),
      total_k_dasar: safeParseFloat(lahanDetails.k_dasar, 30.0),
      umur_hst: calculatedAge,
      fase_tanaman: currentPhase
    };

    const response = await axios.post(ML_URL, payload, { timeout: 4000 });

    if (response.data) {
      console.log("✅ [ML] Prediction success:", response.data);
      return {
        rekomendasi: response.data.rekomendasi_varietas,
        kekurangan_hara: "Normal", // default, bisa dikalkulasi
        hasil_panen: response.data.hasil_panen,
        dosis_urea: response.data.dosis_urea,
        dosis_sp36: response.data.dosis_sp36,
        dosis_kcl: response.data.dosis_kcl,
        sisa_hari_panen: response.data.sisa_hari_panen,
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
    dosis_urea: 150.0,
    dosis_sp36: 100.0,
    dosis_kcl: 50.0,
    sisa_hari_panen: 45.0,
    status: "ML Offline"
  };
}

// ─── Lahan Endpoints ─────────────────────────────────────────
app.get('/api/lahan', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lahan ORDER BY created_at DESC');
    
    // Hitung umur secara dinamis
    const updatedRows = rows.map(r => {
      let age = 0;
      if (r.tanggal_tanam) {
        const parsedDate = new Date(r.tanggal_tanam);
        if (!isNaN(parsedDate.getTime())) {
          const diffTime = new Date() - parsedDate;
          age = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
      }
      return { ...r, umur_tanaman_aktif: age };
    });
    
    res.json({ success: true, data: updatedRows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/lahan', authenticateToken, async (req, res) => {
  let { nama_blok, luas_lahan, jenis_tanah, tekstur, kecamatan, id_varietas, tanggal_tanam, n_dasar, p_dasar, k_dasar, ph, benih_per_lubang } = req.body;
  try {
    let finalVarietas = id_varietas;
    if (!finalVarietas || finalVarietas === 'rekomendasi' || finalVarietas === '') {
      const pred = await getMLPrediction({ ph: ph !== undefined ? ph : 6.0 }, { kecamatan, jenis_tanah, tekstur });
      finalVarietas = pred.rekomendasi || 'Bisi 2';
    }

    let finalNamaBlok = nama_blok;
    if (!finalNamaBlok || finalNamaBlok.trim() === '') {
      finalNamaBlok = `Lahan ${kecamatan} (${jenis_tanah})`;
    }

    const [result] = await pool.query(
      `INSERT INTO lahan (user_id, nama_blok, luas_lahan, jenis_tanah, tekstur, kecamatan, id_varietas, tanggal_tanam, n_dasar, p_dasar, k_dasar, benih_per_lubang)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, 
        finalNamaBlok, 
        safeParseFloat(luas_lahan, 0.0), 
        jenis_tanah, 
        tekstur, 
        kecamatan, 
        finalVarietas, 
        tanggal_tanam, 
        safeParseFloat(n_dasar, 50.0), 
        safeParseFloat(p_dasar, 40.0), 
        safeParseFloat(k_dasar, 30.0),
        safeParseInt(benih_per_lubang, 2)
      ]
    );
    
    // Inisialisasi otomatis Pemupukan Dasar
    const acreage = safeParseFloat(luas_lahan, 0.0);
    const basicUrea = Math.round((acreage * 0.01) * 100) / 100; // urea dasar 100kg/ha
    const basicSp36 = Math.round((acreage * 0.02) * 100) / 100; // npk/sp36 dasar 200kg/ha
    
    await pool.query(
      `INSERT INTO pemupukan (lahan_id, jenis_fase, umur_target_hst, dosis_urea, dosis_sp36, dosis_kcl, status_eksekusi, realisasi_pupuk_digunakan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [result.insertId, 'Pemupukan Dasar', 0, basicUrea, basicSp36, 0, 'completed', `Telah ditebar secara dasar: Urea: ${basicUrea} kg, SP36: ${basicSp36} kg`]
    );
    
    res.status(201).json({ success: true, message: 'Lahan baru berhasil dikonfigurasi & Pemupukan Dasar tercatat.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/lahan/:id', authenticateToken, async (req, res) => {
  const { nama_blok, luas_lahan, jenis_tanah, tekstur, kecamatan, id_varietas, tanggal_tanam, n_dasar, p_dasar, k_dasar, benih_per_lubang } = req.body;
  try {
    await pool.query(
      `UPDATE lahan SET nama_blok=?, luas_lahan=?, jenis_tanah=?, tekstur=?, kecamatan=?, id_varietas=?, tanggal_tanam=?, n_dasar=?, p_dasar=?, k_dasar=?, benih_per_lubang=? WHERE id=?`,
      [
        nama_blok, 
        safeParseFloat(luas_lahan, 0.0), 
        jenis_tanah, 
        tekstur, 
        kecamatan, 
        id_varietas, 
        tanggal_tanam, 
        safeParseFloat(n_dasar, 50.0), 
        safeParseFloat(p_dasar, 40.0), 
        safeParseFloat(k_dasar, 30.0), 
        safeParseInt(benih_per_lubang, 2),
        req.params.id
      ]
    );
    res.json({ success: true, message: 'Konfigurasi lahan berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/lahan/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM lahan WHERE id=?', [req.params.id]);
    await pool.query('DELETE FROM pemupukan WHERE lahan_id=?', [req.params.id]);
    res.json({ success: true, message: 'Lahan beserta riwayat pemupukan berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Pemupukan Endpoints ─────────────────────────────────────
app.get('/api/pemupukan', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, l.nama_blok, l.id_varietas, l.luas_lahan, u.name as nama_operator 
      FROM pemupukan p 
      JOIN lahan l ON p.lahan_id = l.id
      LEFT JOIN users u ON p.id_operator_eksekutor = u.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/pemupukan', authenticateToken, async (req, res) => {
  const { lahan_id, jenis_fase, umur_target_hst, dosis_urea, dosis_sp36, dosis_kcl, id_operator_eksekutor, catatan } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO pemupukan (lahan_id, jenis_fase, umur_target_hst, dosis_urea, dosis_sp36, dosis_kcl, id_operator_eksekutor, status_eksekusi, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [lahan_id, jenis_fase, umur_target_hst, dosis_urea, dosis_sp36, dosis_kcl, id_operator_eksekutor || null, catatan || null]
    );
    res.status(201).json({ success: true, message: 'Instruksi pemupukan berhasil dibuat & dikirim.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/pemupukan/:id/take', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE pemupukan SET status_eksekusi='taken', id_operator_eksekutor=? WHERE id=?`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true, message: 'Tugas eksekusi pemupukan diambil.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/pemupukan/:id/assign', authenticateToken, async (req, res) => {
  const { id_operator_eksekutor } = req.body;
  try {
    await pool.query(
      `UPDATE pemupukan SET id_operator_eksekutor=? WHERE id=?`,
      [id_operator_eksekutor ? parseInt(id_operator_eksekutor) : null, req.params.id]
    );
    res.json({ success: true, message: 'Petugas pelaksana berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/pemupukan/:id/send', authenticateToken, async (req, res) => {
  const { id_operator_eksekutor } = req.body;
  if (!id_operator_eksekutor) {
    return res.status(400).json({ success: false, message: 'Harap pilih operator pelaksana terlebih dahulu.' });
  }
  try {
    await pool.query(
      `UPDATE pemupukan SET status_eksekusi='taken', id_operator_eksekutor=? WHERE id=?`,
      [parseInt(id_operator_eksekutor), req.params.id]
    );
    res.json({ success: true, message: 'Perintah pemupukan berhasil dikirim ke petugas pelaksana.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/pemupukan/:id/complete', authenticateToken, async (req, res) => {
  const { realisasi_pupuk_digunakan } = req.body;
  try {
    await pool.query(
      `UPDATE pemupukan SET status_eksekusi='review', realisasi_pupuk_digunakan=? WHERE id=?`,
      [realisasi_pupuk_digunakan, req.params.id]
    );
    res.json({ success: true, message: 'Laporan pengerjaan berhasil dikirim ke Manager untuk validasi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/pemupukan/:id/verify', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE pemupukan SET status_eksekusi='completed' WHERE id=?`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Tugas pemupukan berhasil divalidasi & diselesaikan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/pemupukan/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM pemupukan WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Instruksi pemupukan berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Sensor Routes ───────────────────────────────────────────
app.post('/api/sensor/esp32', async (req, res) => {
  const { userId, lahanId, ph, n, p, k, nitrogen, phosphorus, kalium, suhu, kelembaban } = req.body;

  const valPh = ph;
  const valN = n !== undefined ? n : nitrogen;
  const valP = p !== undefined ? p : phosphorus;
  const valK = k !== undefined ? k : kalium;
  const valSuhu = suhu;
  const valKelembaban = kelembaban;

  if (valPh === undefined || valN === undefined) {
    return res.status(400).json({ success: false, message: 'Data ph dan n (nitrogen) wajib diisi' });
  }

  // Cari detail lahan
  let lahanDetails = {};
  const targetLahanId = lahanId || null;
  if (targetLahanId) {
    const [rows] = await pool.query('SELECT * FROM lahan WHERE id = ?', [targetLahanId]);
    if (rows.length > 0) lahanDetails = rows[0];
  } else {
    const [rows] = await pool.query('SELECT * FROM lahan ORDER BY created_at DESC LIMIT 1');
    if (rows.length > 0) lahanDetails = rows[0];
  }

  const prediction = await getMLPrediction(req.body, lahanDetails);

  try {
    const [result] = await pool.query(
      `INSERT INTO sensor_data 
       (user_id, lahan_id, ph, nitrogen, phosphorus, kalium, suhu, kelembaban, rekomendasi, kekurangan_hara, hasil_panen, dosis_urea, dosis_sp36, dosis_kcl, sisa_hari_panen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null, 
        lahanDetails.id || null,
        safeParseFloat(valPh, 6.5), 
        safeParseInt(valN, 100), 
        safeParseInt(valP, 0), 
        safeParseInt(valK, 0), 
        safeParseFloat(valSuhu, 28.0), 
        safeParseInt(valKelembaban, 70),
        prediction.rekomendasi,
        prediction.kekurangan_hara,
        prediction.hasil_panen,
        prediction.dosis_urea,
        prediction.dosis_sp36,
        prediction.dosis_kcl,
        prediction.sisa_hari_panen
      ]
    );

    res.status(201).json({ success: true, message: 'Data ESP32 berhasil disimpan (Mode Global)' });
  } catch (error) {
    console.error('❌ [DB] Error saving ESP32 sensor data:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data sensor' });
  }
});

app.post('/api/sensor', authenticateToken, async (req, res) => {
  const { lahanId, ph, n, p, k, nitrogen, phosphorus, kalium, suhu, kelembaban } = req.body;
  const userId = req.user.id;

  const valPh = ph;
  const valN = n !== undefined ? n : nitrogen;
  const valP = p !== undefined ? p : phosphorus;
  const valK = k !== undefined ? k : kalium;

  if (valPh === undefined || valN === undefined) {
    return res.status(400).json({ success: false, message: 'Data ph dan n (nitrogen) wajib diisi' });
  }

  let lahanDetails = {};
  const targetLahanId = lahanId || null;
  if (targetLahanId) {
    const [rows] = await pool.query('SELECT * FROM lahan WHERE id = ?', [targetLahanId]);
    if (rows.length > 0) lahanDetails = rows[0];
  } else {
    const [rows] = await pool.query('SELECT * FROM lahan ORDER BY created_at DESC LIMIT 1');
    if (rows.length > 0) lahanDetails = rows[0];
  }

  const prediction = await getMLPrediction(req.body, lahanDetails);

  try {
    const [result] = await pool.query(
      `INSERT INTO sensor_data 
       (user_id, lahan_id, ph, nitrogen, phosphorus, kalium, suhu, kelembaban, rekomendasi, kekurangan_hara, hasil_panen, dosis_urea, dosis_sp36, dosis_kcl, sisa_hari_panen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        lahanDetails.id || null,
        safeParseFloat(valPh, 6.5), 
        safeParseInt(valN, 100), 
        safeParseInt(valP, 0), 
        safeParseInt(valK, 0), 
        safeParseFloat(suhu, 28.0), 
        safeParseInt(kelembaban, 70),
        prediction.rekomendasi,
        prediction.kekurangan_hara,
        prediction.hasil_panen,
        prediction.dosis_urea,
        prediction.dosis_sp36,
        prediction.dosis_kcl,
        prediction.sisa_hari_panen
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
        dosis_urea: newRecord[0].dosis_urea,
        dosis_sp36: newRecord[0].dosis_sp36,
        dosis_kcl: newRecord[0].dosis_kcl,
        sisa_hari_panen: newRecord[0].sisa_hari_panen
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
    const [rows] = await pool.query('SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 1');
    if (rows.length === 0) return res.json({ success: true, data: null, message: 'Belum ada data' });
    
    const record = { 
      ...rows[0], 
      timestamp: rows[0].created_at,
      prediksi: { 
        rekomendasi: rows[0].rekomendasi, 
        kekurangan_hara: rows[0].kekurangan_hara, 
        hasil_panen: rows[0].hasil_panen,
        dosis_urea: rows[0].dosis_urea,
        dosis_sp36: rows[0].dosis_sp36,
        dosis_kcl: rows[0].dosis_kcl,
        sisa_hari_panen: rows[0].sisa_hari_panen
      } 
    };
    res.json({ success: true, data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/sensor/my-data', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM (
        SELECT * FROM sensor_data 
        ORDER BY created_at DESC 
        LIMIT ?
      ) sub ORDER BY created_at ASC`, 
      [limit]
    );
    
    const data = rows.map(r => ({ 
      ...r, 
      timestamp: r.created_at, 
      timeLabel: new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      prediksi: { 
        rekomendasi: r.rekomendasi, 
        kekurangan_hara: r.kekurangan_hara, 
        hasil_panen: r.hasil_panen,
        dosis_urea: r.dosis_urea,
        dosis_sp36: r.dosis_sp36,
        dosis_kcl: r.dosis_kcl,
        sisa_hari_panen: r.sisa_hari_panen
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
    const [rows] = await pool.query('SELECT * FROM sensor_data');
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
    await pool.query('DELETE FROM sensor_data');
    res.json({ success: true, message: 'Semua riwayat data berhasil dibersihkan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal menghapus data di database.' });
  }
});

// ─── Serial Port Listener (USB Mode) ──────────────────────────
const SERIAL_PORT_NAME = 'COM10';

let serialPort;
let parser;

function connectSerial() {
  serialPort = new SerialPort({
    path: SERIAL_PORT_NAME,
    baudRate: 115200,
    autoOpen: false, 
  });

  parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  serialPort.open((err) => {
    if (err) {
      console.log('⚠️ [Serial] Menunggu USB ' + SERIAL_PORT_NAME + '... (' + err.message + ')');
      setTimeout(connectSerial, 5000);
      return;
    }
    console.log('🔌 [Serial] Terhubung ke USB (' + SERIAL_PORT_NAME + ')');
  });

  serialPort.on('close', () => {
    console.log('❌ [Serial] Koneksi USB terputus. Mencoba hubungkan kembali...');
    setTimeout(connectSerial, 5000);
  });

  parser.on('data', async (line) => {
    try {
      const cleanLine = line.trim();
      if (!cleanLine.startsWith('{')) return; 
      
      console.log('📥 [Serial] Data masuk:', cleanLine);
      const data = JSON.parse(cleanLine);
      
      // Ambil lahan terbaru untuk konteks
      const [lahanRows] = await pool.query('SELECT * FROM lahan ORDER BY created_at DESC LIMIT 1');
      let lahanDetails = lahanRows.length > 0 ? lahanRows[0] : {};

      const prediction = await getMLPrediction(data, lahanDetails);
      
      await pool.query(
        `INSERT INTO sensor_data 
         (user_id, lahan_id, ph, nitrogen, phosphorus, kalium, suhu, kelembaban, rekomendasi, kekurangan_hara, hasil_panen, dosis_urea, dosis_sp36, dosis_kcl, sisa_hari_panen) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          null, 
          lahanDetails.id || null,
          parseFloat(data.ph || 0).toFixed(1),
          Math.round(data.n || 0),
          Math.round(data.p || 0),
          Math.round(data.k || 0),
          parseFloat(data.suhu || 28.0).toFixed(1),
          Math.round(data.kelembaban || 70),
          prediction.rekomendasi,
          prediction.kekurangan_hara,
          prediction.hasil_panen,
          prediction.dosis_urea,
          prediction.dosis_sp36,
          prediction.dosis_kcl,
          prediction.sisa_hari_panen
        ]
      );
      console.log('✅ [Serial] Data USB berhasil disimpan.');
    } catch (err) {
      console.error('❌ [Serial] Gagal memproses data JSON:', err.message);
    }
  });
}

// connectSerial(); // Dinonaktifkan karena ESP32 kini menggunakan WiFi (HTTP POST) untuk mengirim data

app.listen(PORT, () => {
  console.log(`\n🌱 SiTani Backend running on http://localhost:${PORT}`);
});

module.exports = app;
