const express = require('express');
const {
  listDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} = require('../controllers/descuento.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate, authorize('administrador'));

router.get('/', listDiscounts);
router.get('/:categoria', getDiscount);
router.post('/', createDiscount);
router.put('/:categoria', updateDiscount);
router.delete('/:categoria', deleteDiscount);

module.exports = router;
