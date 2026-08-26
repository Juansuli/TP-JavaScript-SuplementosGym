// Validaciones de los datos de pedido: campos del pedido en sí y los productos que incluye.
// El controlador llama a estas funciones y solo se encarga de responder según el resultado.
const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

function getPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
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

module.exports = { ORDER_STATUSES, validateOrderData, validateOrderItems };
