const express = require('express');
const {
  listAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  setAdminStatus,
} = require('../controllers/administrador.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Solo un administrador logueado puede gestionar administradores.
router.use(authenticate, authorize('administrador'));

router.get('/', listAdmins);
router.get('/:id', getAdmin);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.patch('/:id/estado', setAdminStatus);

module.exports = router;
