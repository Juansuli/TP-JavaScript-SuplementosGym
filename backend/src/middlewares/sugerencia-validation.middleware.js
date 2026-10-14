// Validaciones de la sugerencia de IA: el carrito que acompaña el pedido
// de sugerencia, el id que llega por la URL y el estado con que el
// cliente responde. El controlador llama a estas funciones y solo se
// encarga de responder según el resultado.
// El cliente solo puede responder desde "pendiente" a uno de estos dos
// valores (ver CUU2 3.a/3.b).
const SUGGESTION_RESPONSES = ['aceptada', 'rechazada'];

function getPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function validateCart(cart) {
  // El carrito puede venir vacío o no venir: la sugerencia también
  // funciona cuando el cliente todavía no eligió nada.
  if (cart === undefined || cart === null) return [];
  if (!Array.isArray(cart)) return ['El carrito debe ser una lista de productos.'];

  const errors = [];

  for (const item of cart) {
    if (!getPositiveInteger(item?.id_producto) || !getPositiveInteger(item?.cantidad)) {
      errors.push('Cada producto del carrito debe tener id_producto y cantidad enteros mayores a 0.');
    }
  }

  return errors;
}

// Ids de productos que el cliente ya vio y no quiere que se repitan
// ("Solicitar otra sugerencia"). Es opcional.
function validateExcludedProducts(excludedProductIds) {
  if (excludedProductIds === undefined || excludedProductIds === null) return [];
  if (!Array.isArray(excludedProductIds)) {
    return ['Los productos a excluir deben ser una lista de ids.'];
  }

  const hasInvalidId = excludedProductIds.some((id) => !getPositiveInteger(id));
  return hasInvalidId ? ['Cada producto a excluir debe ser un id entero mayor a 0.'] : [];
}

function validateSuggestionStatus(estado) {
  return SUGGESTION_RESPONSES.includes(estado) ? [] : ['Estado inválido.'];
}

module.exports = {
  getPositiveInteger,
  validateCart,
  validateExcludedProducts,
  validateSuggestionStatus,
};
