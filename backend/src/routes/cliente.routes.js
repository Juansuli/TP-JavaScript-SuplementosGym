const express = require('express');
const {
  listClients,
  getClient,
  login,
  createClient,
  updateClient,
  deleteClient,
  setClientStatus,
  enableClientProfile,
} = require('../controllers/cliente.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.post('/', createClient);

router.use(authenticate);

router.get('/', authorize('administrador'), listClients);
router.post('/perfil-cliente', authorize('administrador'), enableClientProfile);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.patch('/:id/estado', authorize('administrador'), setClientStatus);
router.delete('/:id', deleteClient);

module.exports = router;
