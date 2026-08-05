// Test controller: just confirms the server is up and, if possible,
// that the database connection also works. It's meant as a starting
// point to copy the same pattern (routes -> controller) once the real
// controllers get added (producto, cliente, pedido, etc.).

const sequelize = require('../config/db');

async function checkHealth(req, res) {
  try {
    // .authenticate() is Sequelize's built-in way to check the
    // connection actually works, instead of writing a raw query by hand.
    await sequelize.authenticate();
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    // If the database isn't configured yet, the server still
    // responds (so the rest of the API can be tested), it just
    // reports that the connection failed.
    res.json({ status: 'ok', db: 'not connected', detail: error.message });
  }
}

module.exports = { checkHealth };
