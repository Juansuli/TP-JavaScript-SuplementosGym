// Configuración de la conexión a MySQL.
// Por ahora se usa mysql2 "a mano" (sin ORM, todavía no decidido cuál
// usar). Cuando se elija uno (Sequelize, Prisma, etc.) este archivo va
// a cambiar, pero el resto del código no debería enterarse de eso: los
// controllers solo van a usar lo que exporta este archivo.

const mysql = require('mysql2/promise');
require('dotenv').config();

// Un "pool" reutiliza conexiones en vez de abrir una nueva por cada
// consulta, que es mucho más caro. Los datos reales (host, usuario,
// contraseña) viven en el archivo .env, que no se sube al repositorio
// (ver .gitignore) — acá solo se leen esas variables.
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
