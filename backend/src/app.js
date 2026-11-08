require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/db');
const { signToken } = require('./controllers/client.controller');
const healthRoutes = require('./routes/health.routes');
const productRoutes = require('./routes/product.routes');
const clientRoutes = require('./routes/client.routes');
const orderRoutes = require('./routes/order.routes');
const discountRoutes = require('./routes/discount.routes');
const adminRoutes = require('./routes/admin.routes');
const suggestionRoutes = require('./routes/suggestion.routes');

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

require('./models/user.model');
require('./models/admin.model');
require('./models/discount.model');
require('./models/client.model');
require('./models/client_goal.model');
require('./models/product.model');
require('./models/order.model');
require('./models/order_product.model');
require('./models/suggestion.model');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders(response) {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

app.use('/api', healthRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/pedidos', orderRoutes);
app.use('/api/descuentos', discountRoutes);
app.use('/api/administradores', adminRoutes);
app.use('/api/sugerencias', suggestionRoutes);

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
