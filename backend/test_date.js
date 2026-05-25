const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_farming',
  });
  try {
    const isoString = new Date().toISOString();
    console.log("Testing ISO string:", isoString);
    await pool.query('UPDATE lahan SET tanggal_tanam=? WHERE id=1', [isoString]);
    console.log('Update successful!');
  } catch(e) {
    console.error('Update failed:', e.message);
  }
  await pool.end();
}
run().catch(console.error);
