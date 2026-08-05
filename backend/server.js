// Backend entry point. Kept separate from app.js on purpose: this file
// only starts the server, the app's configuration lives in
// src/app.js.

require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/db');
require('./src/models/producto.model'); // registers the Producto model with Sequelize

const PORT = process.env.PORT || 3001;

// sequelize.sync() looks at every registered model and creates the
// matching table if it doesn't exist yet. It does NOT touch a table
// that already exists (no data loss risk), so it's safe to run every
// time the server starts.
sequelize
  .sync()
  .then(() => {
    console.log('Database synced (tables created if missing)');
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Could not sync database:', error.message);
  });
