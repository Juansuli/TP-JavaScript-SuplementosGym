const express = require('express');
const {
  listProducts,
  listAdminProducts,
  restoreProduct,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/producto.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadProductImage } = require('../middlewares/product-image.middleware');

const router = express.Router();

router.get('/', listProducts);
router.get('/administracion', authenticate, authorize('administrador'), listAdminProducts);
router.get('/:id', getProduct);
router.patch('/:id/restablecer', authenticate, authorize('administrador'), restoreProduct);
router.post('/', authenticate, authorize('administrador'), uploadProductImage, createProduct);
router.put('/:id', authenticate, authorize('administrador'), uploadProductImage, updateProduct);
router.delete('/:id', authenticate, authorize('administrador'), deleteProduct);

module.exports = router;
