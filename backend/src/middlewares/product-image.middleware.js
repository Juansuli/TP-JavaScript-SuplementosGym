const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const productImagesDirectory = path.resolve(__dirname, '../../uploads/productos');
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageHeaderLength = 12;

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

function hasJpegSignature(header) {
  return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

function hasPngSignature(header) {
  return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function hasWebpSignature(header) {
  return header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP';
}

async function hasAllowedImageContent(filePath) {
  let fileHandle;

  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const header = Buffer.alloc(imageHeaderLength);
    const { bytesRead } = await fileHandle.read(header, 0, imageHeaderLength, 0);

    if (bytesRead < 3) return false;

    return hasJpegSignature(header) ||
      (bytesRead >= 8 && hasPngSignature(header)) ||
      (bytesRead >= imageHeaderLength && hasWebpSignature(header));
  } catch {
    return false;
  } finally {
    await fileHandle?.close().catch(() => {});
  }
}

async function removeUploadedFile(file) {
  if (!file) return;
  await fs.promises.unlink(file.path).catch(() => {});
}

function sendUploadError(res, error) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'La imagen no puede superar los 5 MB.' });
    return;
  }

  if (error.code === 'INVALID_IMAGE_TYPE') {
    res.status(400).json({ error: 'La imagen debe ser JPG, PNG o WebP.' });
    return;
  }

  res.status(400).json({ error: 'No se pudo cargar la imagen del producto.' });
}

function uploadProductImage(req, res, next) {
  upload.single('imagen')(req, res, async (error) => {
    if (error) {
      sendUploadError(res, error);
      return;
    }

    if (!req.file) {
      next();
      return;
    }

    if (!await hasAllowedImageContent(req.file.path)) {
      await removeUploadedFile(req.file);
      res.status(400).json({ error: 'El archivo no contiene una imagen JPG, PNG o WebP válida.' });
      return;
    }

    next();
  });
}

module.exports = { uploadProductImage, productImagesDirectory };