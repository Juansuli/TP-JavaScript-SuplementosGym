const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'suplementos_gym',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    ...(process.env.DB_SSL === 'true'
      ? {
          dialectOptions: {
            ssl: {
              ca: process.env.DB_SSL_CA,
              rejectUnauthorized: true,
            },
          },
        }
      : {}),
  }
);

module.exports = sequelize;