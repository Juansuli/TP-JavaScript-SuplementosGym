const { Op } = require('sequelize');
const Producto = require('../models/producto.model');
const PedidoProducto = require('../models/pedido_producto.model');

const EDITABLE_FIELDS = [
  'nombre',
  'descripcion',
  'precio',
  'stock',
  'info_nutricional',
];

function getProductId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateProduct(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.nombre !== undefined) {
    if (typeof data.nombre !== 'string') {
      errors.push('El nombre ingresado no es válido.');
    } else if (data.nombre.trim() === '') {
      errors.push('Name is required.');
    }
  }

  if (!isUpdate || data.precio !== undefined) {
    if (data.precio === undefined || data.precio === '' || Number.isNaN(Number(data.precio)) || Number(data.precio) < 0) {
      errors.push('Price must be a number greater than or equal to 0.');
    }
  }

  if (!isUpdate || data.stock !== undefined) {
    if (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) {
      errors.push('Stock must be a whole number greater than or equal to 0.');
    }
  }

  return errors;
}

function getEditableData(body) {
  return Object.fromEntries(
    EDITABLE_FIELDS
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, field === 'nombre' ? body[field].trim() : body[field]])
  );
}

async function listProducts(req, res) {
  try {
    const { precioMin, precioMax } = req.query;
    const where = {};

    if (precioMin !== undefined || precioMax !== undefined) {
      const minimo = precioMin === undefined ? undefined : Number(precioMin);
      const maximo = precioMax === undefined ? undefined : Number(precioMax);

      if ((minimo !== undefined && (Number.isNaN(minimo) || minimo < 0)) ||
          (maximo !== undefined && (Number.isNaN(maximo) || maximo < 0)) ||
          (minimo !== undefined && maximo !== undefined && minimo > maximo)) {
        return res.status(400).json({ error: 'The price range is not valid.' });
      }

      where.precio = {};
      if (minimo !== undefined) where.precio[Op.gte] = minimo;
      if (maximo !== undefined) where.precio[Op.lte] = maximo;
    }

    const products = await Producto.findAll({ where, order: [['id_producto', 'ASC']] });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ error: 'Products could not be retrieved.' });
  }
}

async function getProduct(req, res) {
  const id = getProductId(req.params.id);
  if (!id) return res.status(400).json({ error: 'The product id is not valid.' });

  try {
    const product = await Producto.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'Product could not be retrieved.' });
  }
}

async function createProduct(req, res) {
  const errors = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ error: errors });

  try {
    const product = await Producto.create(getEditableData(req.body));
    return res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ error: 'Product could not be created.' });
  }
}

async function updateProduct(req, res) {
  const id = getProductId(req.params.id);
  if (!id) return res.status(400).json({ error: 'The product id is not valid.' });

  const errors = validateProduct(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors });

  const data = getEditableData(req.body);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Send at least one editable field.' });
  }

  try {
    const product = await Producto.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    await product.update(data);
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'Product could not be updated.' });
  }
}

async function deleteProduct(req, res) {
  const id = getProductId(req.params.id);
  if (!id) return res.status(400).json({ error: 'The product id is not valid.' });

  try {
    const product = await Producto.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    // CUU1: a product with associated orders can't be physically deleted —
    // it gets marked "descontinuado" (soft delete) instead.
    const orderCount = await PedidoProducto.count({ where: { id_producto: id } });
    if (orderCount > 0) {
      await product.update({ estado: 'descontinuado' });
      return res.json(product);
    }

    await product.destroy();
    return res.status(204).send();
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ error: 'A product with associated orders cannot be deleted.' });
    }
    return res.status(500).json({ error: 'Product could not be deleted.' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
