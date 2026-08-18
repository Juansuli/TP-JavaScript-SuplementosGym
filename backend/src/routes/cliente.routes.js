const express = require('express');
const {
  listClients,
  getClient,
  login,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/cliente.controller');

const router = express.Router();

router.get('/', listClients);
router.get('/:id', getClient);
router.post('/login', login);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
