const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const productImagesDirectory = path.resolve(__dirname, '../../uploads/productos');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(productImagesDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: productImagesDirectory,
  filename(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!allowedImageTypes.has(file.mimetype)) {
      const error = new Error('INVALID_IMAGE_TYPE');
      error.code = 'INVALID_IMAGE_TYPE';
      callback(error);
      return;
    }

    callback(null, true);
  },
});

function uploadProductImage(req, res, next) {
  upload.single('imagen')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'La imagen no puede superar los 5 MB.' });
      return;
    }

    if (error.code === 'INVALID_IMAGE_TYPE') {
      res.status(400).json({ error: 'La imagen debe ser JPG, PNG o WebP.' });
      return;
    }

    res.status(400).json({ error: 'No se pudo cargar la imagen del producto.' });
  });
}

module.exports = { uploadProductImage, productImagesDirectory };