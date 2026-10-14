function getRemainingStock(product, quantityInCart = 0) {
  return Math.max(0, Number(product.stock) - quantityInCart)
}

// A product can only be bought while it is "disponible" and has stock:
// it may have run out or been discontinued since it was displayed.
function isProductAvailable(product) {
  return product.estado === 'disponible' && product.stock > 0
}

export { getRemainingStock, isProductAvailable }
