const express = require('express');
const { checkHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health -> confirms the server (and, along the way, the
// database) are responding. Useful to check the whole skeleton boots
// correctly before writing real business logic.
router.get('/health', checkHealth);

module.exports = router;
