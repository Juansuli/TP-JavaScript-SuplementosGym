require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/db');
const { signToken } = require('./controllers/cliente.controller');
const healthRoutes = require('./routes/health.routes');
const productRoutes = require('./routes/producto.routes');
const clientRoutes = require('./routes/cliente.routes');
const orderRoutes = require('./routes/pedido.routes');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe estar definido en .env y tener al menos 32 caracteres.');
  process.exit(1);
}

if (process.env.JWT_EXPIRES_IN && /^\d+$/.test(process.env.JWT_EXPIRES_IN)) {
  console.error('JWT_EXPIRES_IN debe incluir una unidad (ej. "2h", "7200s"), no un número solo.');
  process.exit(1);
}

try {
  signToken({ id_usuario: 0, rol: 'test' });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

require('./models/usuario.model');
require('./models/administrador.model');
require('./models/descuento.model');
require('./models/cliente.model');
require('./models/producto.model');
require('./models/pedido.model');
require('./models/pedido_producto.model');
require('./models/sugerencia_ia.model');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', healthRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/pedidos', orderRoutes);

async function startServer() {
  try {
    await sequelize.sync();
    console.log('Database synced (tables created if missing)');

    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Could not sync database:', error.message);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
