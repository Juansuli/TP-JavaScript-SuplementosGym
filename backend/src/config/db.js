// MySQL connection, set up through Sequelize (our chosen ORM).
// Sequelize still needs a low-level driver to actually talk to MySQL —
// that's what the "mysql2" package (already installed) is for.
// Sequelize uses it automatically underneath, we don't call mysql2
// directly anywhere anymore.

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'suplementos_gym',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    // Set this to console.log while learning, to see the real SQL
    // Sequelize generates for each call. Keep it false normally, it's noisy.
    logging: false,
  }
);

module.exports = sequelize;
