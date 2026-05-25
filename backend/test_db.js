const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log(`Connecting to ${process.env.DB_HOST} with user ${process.env.DB_USER}...`);
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    console.log('Database connected successfully!');
    await connection.end();
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();
