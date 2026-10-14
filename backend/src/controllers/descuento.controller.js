const Descuento = require('../models/descuento.model');
const Cliente = require('../models/cliente.model');

function getCategory(value) {
  if (typeof value !== 'string') return null;

  const category = value.trim().toUpperCase();
  return category.length >= 2 && category.length <= 50 ? category : null;
}

function getPercentage(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const normalizedValue = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) return null;

  const percentage = Number(normalizedValue);
  return percentage > 0 && percentage <= 100 ? percentage : null;
}

function serializeDiscount(discount) {
  const data = discount.toJSON();
  return {
    categoria: data.categoría,
    porcentaje: Number(data.porcentaje),
  };
}

function validateBody(body, allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const unknownFields = Object.keys(body).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length > 0) {
    return 'Se enviaron campos no permitidos.';
  }

  return null;
}

async function listDiscounts(req, res) {
  try {
    const discounts = await Descuento.findAll({ order: [['categoría', 'ASC']] });
    return res.json(discounts.map(serializeDiscount));
  } catch {
    return res.status(500).json({ error: 'No se pudieron obtener los descuentos.' });
  }
}

async function getDiscount(req, res) {
  const category = getCategory(req.params.categoria);
  if (!category) {
    return res.status(400).json({ error: 'La categoría de descuento no es válida.' });
  }

  try {
    const discount = await Descuento.findByPk(category);
    if (!discount) return res.status(404).json({ error: 'Descuento no encontrado.' });

    return res.json(serializeDiscount(discount));
  } catch {
    return res.status(500).json({ error: 'No se pudo obtener el descuento.' });
  }
}

async function createDiscount(req, res) {
  const bodyError = validateBody(req.body, ['categoria', 'porcentaje']);
  if (bodyError) return res.status(400).json({ error: bodyError });

  const category = getCategory(req.body.categoria);
  const percentage = getPercentage(req.body.porcentaje);
  if (!category || percentage === null) {
    return res.status(400).json({
      error: 'La categoría debe tener entre 2 y 50 caracteres y el porcentaje debe ser mayor que 0 y menor o igual a 100.',
    });
  }

  try {
    const discount = await Descuento.create({ categoría: category, porcentaje: percentage });
    return res.status(201).json(serializeDiscount(discount));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre.' });
    }

    return res.status(500).json({ error: 'No se pudo crear el descuento.' });
  }
}

async function updateDiscount(req, res) {
  const category = getCategory(req.params.categoria);
  if (!category) {
    return res.status(400).json({ error: 'La categoría de descuento no es válida.' });
  }

  const bodyError = validateBody(req.body, ['porcentaje']);
  if (bodyError) return res.status(400).json({ error: bodyError });

  const percentage = getPercentage(req.body.porcentaje);
  if (percentage === null) {
    return res.status(400).json({ error: 'El porcentaje debe ser mayor que 0 y menor o igual a 100.' });
  }

  try {
    const discount = await Descuento.findByPk(category);
    if (!discount) return res.status(404).json({ error: 'Descuento no encontrado.' });

    await discount.update({ porcentaje: percentage });
    return res.json(serializeDiscount(discount));
  } catch {
    return res.status(500).json({ error: 'No se pudo actualizar el descuento.' });
  }
}

async function deleteDiscount(req, res) {
  const category = getCategory(req.params.categoria);
  if (!category) {
    return res.status(400).json({ error: 'La categoría de descuento no es válida.' });
  }

  try {
    const discount = await Descuento.findByPk(category);
    if (!discount) return res.status(404).json({ error: 'Descuento no encontrado.' });

    const assignedClientCount = await Cliente.count({ where: { descuento_categoria: category } });
    if (assignedClientCount > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar una categoría asignada a uno o más clientes.',
      });
    }

    await discount.destroy();
    return res.status(204).send();
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        error: 'No se puede eliminar una categoría asignada a uno o más clientes.',
      });
    }

    return res.status(500).json({ error: 'No se pudo eliminar el descuento.' });
  }
}

module.exports = {
  listDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
};
