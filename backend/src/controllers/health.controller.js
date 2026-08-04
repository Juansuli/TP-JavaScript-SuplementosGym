// Controller de prueba: solo confirma que el servidor está levantado y,
// si puede, que la conexión a la base de datos también funciona.
// Sirve como punto de partida para copiar el mismo patrón (routes ->
// controller) cuando se agreguen los controllers reales (producto,
// cliente, pedido, etc.).

const db = require('../config/db');

async function checkHealth(req, res) {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (error) {
    // Si la base de datos no está configurada todavía, el servidor
    // igual responde (para poder probar el resto de la API), solo
    // avisa que la conexión falló.
    res.json({ status: 'ok', db: 'sin conexión', detalle: error.message });
  }
}

module.exports = { checkHealth };
