// This is where the Express application gets assembled: middlewares +
// routes. The server isn't started in this file (that's server.js's
// job) so the app can be tested without needing it to be listening on
// a port.

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const productRoutes = require('./routes/producto.routes');
const clientRoutes = require('./routes/cliente.routes');

const app = express();

app.use(cors());
app.use(express.json());

// All API routes live under the /api prefix. As entities get added
// (producto, cliente, pedido...) each one adds its own routes file
// here, following the same pattern as health.
app.use('/api', healthRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/clientes', clientRoutes);

module.exports = app;
