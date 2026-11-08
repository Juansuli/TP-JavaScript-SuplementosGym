const express = require('express');
const {
  listDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} = require('../controllers/discount.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate, authorize('administrador'));

router.get('/', listDiscounts);
router.get('/:category', getDiscount);
router.post('/', createDiscount);
router.put('/:category', updateDiscount);
router.delete('/:category', deleteDiscount);

module.exports = router;
