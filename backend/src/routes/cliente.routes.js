const express = require('express');
const {
  listClients,
  getClient,
  login,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/cliente.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/', createClient);

router.use(authenticate);

router.get('/', authorize('administrador'), listClients);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
