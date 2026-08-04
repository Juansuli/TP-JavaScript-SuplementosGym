// Test controller: just confirms the server is up and, if possible,
// that the database connection also works. It's meant as a starting
// point to copy the same pattern (routes -> controller) once the real
// controllers get added (producto, cliente, pedido, etc.).

const db = require('../config/db');

async function checkHealth(req, res) {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    // If the database isn't configured yet, the server still
    // responds (so the rest of the API can be tested), it just
    // reports that the connection failed.
    res.json({ status: 'ok', db: 'not connected', detail: error.message });
  }
}

module.exports = { checkHealth };
