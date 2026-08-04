// Backend entry point. Kept separate from app.js on purpose: this file
// only starts the server, the app's configuration lives in
// src/app.js.

require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
