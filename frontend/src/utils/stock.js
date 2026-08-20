function getRemainingStock(product, quantityInCart = 0) {
  return Math.max(0, Number(product.stock) - quantityInCart)
}

export { getRemainingStock }
