const express = require('express');
const {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
} = require('../controllers/pedido.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('administrador'), listOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.put('/:id', authorize('administrador'), updateOrder);
router.delete('/:id', authorize('administrador'), deleteOrder);

module.exports = router;
