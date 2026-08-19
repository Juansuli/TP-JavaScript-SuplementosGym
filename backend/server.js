// Backend entry point. Kept separate from app.js on purpose: this file
// only starts the server, the app's configuration lives in
// src/app.js.

require('dotenv').config();

// Fail fast on JWT misconfiguration: better a loud startup error than a
// generic 500 on the first login attempt, or (worse) silently minting
// tokens that expire in milliseconds because JWT_EXPIRES_IN was a bare
// number instead of a unit string like "2h".
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe estar definido en .env y tener al menos 32 caracteres.');
  process.exit(1);
}

if (process.env.JWT_EXPIRES_IN && /^\d+$/.test(process.env.JWT_EXPIRES_IN)) {
  console.error('JWT_EXPIRES_IN debe incluir una unidad (ej. "2h", "7200s"), no un número solo (se interpretaría en milisegundos).');
  process.exit(1);
}

// Complementa el chequeo de arriba: la regex atrapa el caso que NO tira
// excepción (número sin unidad, se toma como milisegundos en silencio).
// Este chequeo reutiliza la función real que arma los tokens en
// producción para atrapar cualquier otro valor que SÍ tire excepción
// (typos, formatos que la librería no puede parsear), en vez de
// reimplementar a mano qué hace signToken.
const { signToken } = require('./src/controllers/cliente.controller');

try {
  signToken({ id_usuario: 0, rol: 'test' });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

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
