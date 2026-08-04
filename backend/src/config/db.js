// MySQL connection setup.
// For now this uses mysql2 directly (no ORM yet — not decided which
// one to use). Once one is picked (Sequelize, Prisma, etc.) this file
// is what changes, but the rest of the code shouldn't need to know
// about that: controllers only use whatever this file exports.

const mysql = require('mysql2/promise');
require('dotenv').config();

// A "pool" reuses connections instead of opening a new one for every
// query, which is much more expensive. The real credentials (host,
// user, password) live in the .env file, which is never committed to
// the repo (see .gitignore) — this only reads those variables.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'suplementos_gym',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
