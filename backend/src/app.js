// Acá se arma la aplicación Express: middlewares + rutas. No se levanta
// el servidor en este archivo (eso lo hace server.js) para poder
// testear la app sin necesidad de que esté escuchando en un puerto.

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Todas las rutas de la API quedan bajo el prefijo /api. A medida que
// se agreguen entidades (producto, cliente, pedido...) cada una suma
// su propio archivo de rutas acá, siguiendo el mismo patrón que health.
app.use('/api', healthRoutes);

module.exports = app;
