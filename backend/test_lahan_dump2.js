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
    const [rows] = await pool.query('SELECT * FROM lahan');
    console.log(JSON.stringify(rows, null, 2));
  } catch(e) {
    console.error('Failed:', e.message);
  }
  await pool.end();
}
run().catch(console.error);
