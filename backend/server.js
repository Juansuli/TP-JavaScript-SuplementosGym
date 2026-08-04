// Punto de entrada del backend. Separado de app.js a propósito: acá
// solo se pone en marcha el servidor, la configuración de la app vive
// en src/app.js.

require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
