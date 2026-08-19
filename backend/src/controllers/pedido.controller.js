const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Pedido = require('../models/pedido.model');
const PedidoProducto = require('../models/pedido_producto.model');
const Cliente = require('../models/cliente.model');
const Producto = require('../models/producto.model');
const Usuario = require('../models/usuario.model');

const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
const STOCK_RESERVED_STATUSES = ['pendiente', 'procesando'];
const CREATE_ORDER_FIELDS = ['nombre_receptor', 'direccion_entrega', 'metodo_pago'];
const ORDER_FIELDS = ['nombre_receptor', 'direccion_entrega', 'metodo_pago', 'estado'];

function getPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function getAllowedData(body, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, typeof body[field] === 'string' ? body[field].trim() : body[field]])
  );
}

function validateOrderData(data, isUpdate = false) {
  const errors = [];

  for (const field of ['nombre_receptor', 'direccion_entrega', 'metodo_pago']) {
    if ((!isUpdate || data[field] !== undefined) &&
        (typeof data[field] !== 'string' || data[field].trim() === '')) {
      errors.push(`El campo ${field} es obligatorio.`);
    }
  }

  if (data.estado !== undefined && !ORDER_STATUSES.includes(data.estado)) {
    errors.push('El estado del pedido no es válido.');
  }

  return errors;
}

function validateOrderItems(items) {
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    return ['El pedido debe incluir al menos un producto.'];
  }

  const productIds = new Set();

  for (const item of items) {
    const productId = getPositiveInteger(item?.id_producto);
    const quantity = getPositiveInteger(item?.cantidad);

    if (!productId || !quantity) {
      errors.push('Cada producto debe tener id_producto y cantidad enteros mayores a 0.');
      continue;
    }

    if (productIds.has(productId)) {
      errors.push('Un producto no puede repetirse dentro del mismo pedido.');
      continue;
    }

    productIds.add(productId);
  }

  return errors;
}

function calculateTotal(items) {
  const total = items.reduce(
    (currentTotal, item) => currentTotal + Number(item.precio_unitario) * item.cantidad,
    0
  );

  return Math.round(total * 100) / 100;
}

async function buildOrderResponse(order, transaction) {
  const orderItems = await PedidoProducto.findAll({
    where: { id_pedido: order.id_pedido },
    order: [['id_producto', 'ASC']],
    transaction,
  });

  const productIds = orderItems.map((item) => item.id_producto);
  const products = productIds.length === 0
    ? []
    : await Producto.findAll({
      where: { id_producto: { [Op.in]: productIds } },
      transaction,
    });
  const productsById = new Map(products.map((product) => [product.id_producto, product]));

  return {
    ...order.toJSON(),
    productos: orderItems.map((item) => ({
      ...item.toJSON(),
      producto: productsById.get(item.id_producto)?.toJSON() ?? null,
    })),
  };
}

async function restoreOrderStock(orderId, transaction) {
  const orderItems = await PedidoProducto.findAll({
    where: { id_pedido: orderId },
    transaction,
  });

  for (const item of orderItems) {
    const product = await Producto.findByPk(item.id_producto, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    await product.update(
      {
        stock: product.stock + item.cantidad,
        estado: product.estado === 'descontinuado' ? 'descontinuado' : 'disponible',
      },
      { transaction }
    );
  }
}

async function listOrders(req, res) {
  const { estado } = req.query;
  if (estado !== undefined && !ORDER_STATUSES.includes(estado)) {
    return res.status(400).json({ error: 'El estado del pedido no es válido.' });
  }

  try {
    const orders = await Pedido.findAll({
      where: estado === undefined ? {} : { estado },
      order: [['id_pedido', 'ASC']],
    });

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudieron obtener los pedidos.' });
  }
}

async function getOrder(req, res) {
  const orderId = getPositiveInteger(req.params.id);
  if (!orderId) return res.status(400).json({ error: 'El id de pedido no es válido.' });

  try {
    const order = await Pedido.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.json(await buildOrderResponse(order));
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo obtener el pedido.' });
  }
}

async function createOrder(req, res) {
  const clientId = getPositiveInteger(req.body.usuario_id);
  const orderData = getAllowedData(req.body, CREATE_ORDER_FIELDS);
  const orderErrors = validateOrderData(orderData);
  const itemErrors = validateOrderItems(req.body.productos);
  const errors = [...orderErrors, ...itemErrors];

  if (!clientId) errors.push('El id de cliente es obligatorio y debe ser válido.');
  if (errors.length) return res.status(400).json({ error: errors });

  try {
    const order = await sequelize.transaction(async (transaction) => {
      const client = await Cliente.findByPk(clientId, { transaction });
      if (!client) {
        throw new Error('CLIENT_NOT_FOUND');
      }

      const user = await Usuario.findByPk(clientId, { transaction });
      if (!user || user.rol !== 'cliente') {
        throw new Error('CLIENT_ROLE_INVALID');
      }

      const orderItems = [];

      for (const item of req.body.productos) {
        const quantity = getPositiveInteger(item.cantidad);
        const product = await Producto.findByPk(item.id_producto, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!product || product.estado === 'descontinuado') {
          const error = new Error('PRODUCT_NOT_AVAILABLE');
          error.productId = item.id_producto;
          throw error;
        }

        if (product.stock < quantity) {
          const error = new Error('INSUFFICIENT_STOCK');
          error.productId = item.id_producto;
          throw error;
        }

        orderItems.push({
          id_producto: product.id_producto,
          cantidad: quantity,
          precio_unitario: Number(product.precio),
          product,
        });
      }

      const order = await Pedido.create(
        {
          usuario_id: clientId,
          ...orderData,
          total: calculateTotal(orderItems),
        },
        { transaction }
      );

      for (const item of orderItems) {
        await PedidoProducto.create(
          {
            id_pedido: order.id_pedido,
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          },
          { transaction }
        );

        const remainingStock = item.product.stock - item.cantidad;
        await item.product.update(
          {
            stock: remainingStock,
            estado: remainingStock === 0 ? 'agotado' : 'disponible',
          },
          { transaction }
        );
      }

      return buildOrderResponse(order, transaction);
    });

    return res.status(201).json(order);
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    if (error.message === 'CLIENT_ROLE_INVALID') {
      return res.status(403).json({ error: 'Solo los clientes pueden crear pedidos.' });
    }

    if (error.message === 'PRODUCT_NOT_AVAILABLE') {
      return res.status(409).json({ error: `El producto ${error.productId} no está disponible.` });
    }

    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: `El producto ${error.productId} no tiene stock suficiente.` });
    }

    return res.status(500).json({ error: 'No se pudo crear el pedido.' });
  }
}

async function updateOrder(req, res) {
  const orderId = getPositiveInteger(req.params.id);
  if (!orderId) return res.status(400).json({ error: 'El id de pedido no es válido.' });


  const orderData = getAllowedData(req.body, ORDER_FIELDS);
  const errors = validateOrderData(orderData, true);

  if (errors.length) return res.status(400).json({ error: errors });
  if (Object.keys(orderData).length === 0) {
    return res.status(400).json({ error: 'Enviá al menos un campo editable.' });
  }

  try {
    const order = await sequelize.transaction(async (transaction) => {
      const existingOrder = await Pedido.findByPk(orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!existingOrder) return null;

      if (orderData.estado === 'cancelado') {
        if (!STOCK_RESERVED_STATUSES.includes(existingOrder.estado)) {
          throw new Error('ORDER_CANNOT_BE_CANCELLED');
        }

        await restoreOrderStock(existingOrder.id_pedido, transaction);
      } else if (existingOrder.estado === 'cancelado' && orderData.estado !== undefined) {
        throw new Error('CANCELLED_ORDER_CANNOT_BE_REACTIVATED');
      }

      await existingOrder.update(orderData, { transaction });
      return buildOrderResponse(existingOrder, transaction);
    });

    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.json(order);
  } catch (error) {
    if (error.message === 'ORDER_CANNOT_BE_CANCELLED') {
      return res.status(409).json({ error: 'Solo se pueden cancelar pedidos pendientes o en proceso.' });
    }

    if (error.message === 'CANCELLED_ORDER_CANNOT_BE_REACTIVATED') {
      return res.status(409).json({ error: 'Un pedido cancelado no puede volver a estar activo.' });
    }

    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(409).json({ error: 'No se pudo devolver el stock porque falta un producto asociado.' });
    }

    return res.status(500).json({ error: 'No se pudo actualizar el pedido.' });
  }
}

async function deleteOrder(req, res) {
  const orderId = getPositiveInteger(req.params.id);
  if (!orderId) return res.status(400).json({ error: 'El id de pedido no es válido.' });

  try {
    const deleted = await sequelize.transaction(async (transaction) => {
      const order = await Pedido.findByPk(orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) return false;

      if (STOCK_RESERVED_STATUSES.includes(order.estado)) {
        await restoreOrderStock(order.id_pedido, transaction);
      } else if (order.estado !== 'cancelado') {
        throw new Error('ORDER_CANNOT_BE_DELETED');
      }

      await PedidoProducto.destroy({
        where: { id_pedido: orderId },
        transaction,
      });
      await order.destroy({ transaction });
      return true;
    });

    if (!deleted) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.status(204).send();
  } catch (error) {
    if (error.message === 'ORDER_CANNOT_BE_DELETED') {
      return res.status(409).json({ error: 'No se pueden eliminar pedidos enviados o entregados.' });
    }

    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(409).json({ error: 'No se pudo devolver el stock porque falta un producto asociado.' });
    }

    return res.status(500).json({ error: 'No se pudo eliminar el pedido.' });
  }
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
};
