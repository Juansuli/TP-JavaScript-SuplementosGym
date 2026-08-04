const express = require('express');
const { checkHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health -> confirma que el servidor (y de paso, la base de
// datos) están respondiendo. Útil para probar que todo el esqueleto
// arranca bien antes de escribir lógica de negocio real.
router.get('/health', checkHealth);

module.exports = router;
