// Backend entry point. Kept separate from app.js on purpose: this file
// only starts the server, the app's configuration lives in
// src/app.js.

require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/db');

// Registers every model with Sequelize so sync() knows about them. Order
// matters here: a table with a foreign key (e.g. cliente -> usuario) must
// be listed after the table it points to, or MySQL rejects the FK because
// the referenced table doesn't exist yet.
require('./src/models/usuario.model');
require('./src/models/administrador.model');
require('./src/models/descuento.model');
require('./src/models/cliente.model');
require('./src/models/producto.model');
require('./src/models/pedido.model');
require('./src/models/pedido_producto.model');
require('./src/models/sugerencia_ia.model');

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
