const { Op } = require('sequelize');
const Producto = require('../models/producto.model');
const PedidoProducto = require('../models/pedido_producto.model');
const { getProductStatus } = require('../utils/product-status');

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
      errors.push('El nombre es obligatorio.');
    }
  }

  if (!isUpdate || data.precio !== undefined) {
    if (data.precio === undefined || data.precio === '' || Number.isNaN(Number(data.precio)) || Number(data.precio) < 0) {
      errors.push('El precio debe ser un número mayor o igual a 0.');
    }
  }

  if (!isUpdate || data.stock !== undefined) {
    if (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) {
      errors.push('El stock debe ser un número entero mayor o igual a 0.');
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
        return res.status(400).json({ error: 'El rango de precio no es válido.' });
      }

      where.precio = {};
      if (minimo !== undefined) where.precio[Op.gte] = minimo;
      if (maximo !== undefined) where.precio[Op.lte] = maximo;
    }

    const products = await Producto.findAll({ where, order: [['id_producto', 'ASC']] });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudieron obtener los productos.' });
  }
}

async function getProduct(req, res) {
  const id = getProductId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de producto no es válido.' });

  try {
    const product = await Producto.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo obtener el producto.' });
  }
}

async function createProduct(req, res) {
  const errors = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ error: errors });

  try {
    const data = getEditableData(req.body);
    data.estado = getProductStatus(data.stock);

    const product = await Producto.create(data);
    return res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo crear el producto.' });
  }
}

async function updateProduct(req, res) {
  const id = getProductId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de producto no es válido.' });

  const errors = validateProduct(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors });

  const data = getEditableData(req.body);
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Enviá al menos un campo editable.' });
  }

  try {
    const product = await Producto.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

    if (data.stock !== undefined) {
      data.estado = getProductStatus(data.stock, product.estado);
    }

    await product.update(data);
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo actualizar el producto.' });
  }
}

async function deleteProduct(req, res) {
  const id = getProductId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id de producto no es válido.' });

  try {
    const product = await Producto.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

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
      return res.status(409).json({ error: 'No se puede eliminar un producto con pedidos asociados.' });
    }
    return res.status(500).json({ error: 'No se pudo eliminar el producto.' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
