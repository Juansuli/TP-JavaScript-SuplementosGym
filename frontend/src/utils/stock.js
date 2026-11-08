function getRemainingStock(product, quantityInCart = 0) {
  return Math.max(0, Number(product.stock) - quantityInCart)
}

// A product can only be bought while it is "disponible" and has stock:
// it may have run out or been discontinued since it was displayed.
function isProductAvailable(product) {
  return ['habilitado', 'disponible'].includes(product.estado) && product.stock > 0
}

// The backend rejects orders with these products even if they have stock.
const UNORDERABLE_STATUSES = ['inhabilitado', 'descontinuado']

// Applies the real stock and price to the cart: quantities above the stock
// are lowered, and products that ran out, were disabled or disappeared are
// removed and returned in removedItems.
function revalidateCartStock(cart, products) {
  let didClamp = false
  let didChangePrice = false
  const removedItems = []

  const nextCart = cart.flatMap((item) => {
    const product = products.find((p) => p.id_producto === item.id_producto)
    const isOrderable = product && !UNORDERABLE_STATUSES.includes(product.estado)
    const nextQuantity = isOrderable ? Math.min(item.cantidad, product.stock) : 0
    if (nextQuantity !== item.cantidad) didClamp = true

    if (nextQuantity <= 0) {
      removedItems.push(item)
      return []
    }

    const price = Number(product.precio)
    if (price !== item.precio) didChangePrice = true

    return [{ ...item, stock: product.stock, precio: price, cantidad: nextQuantity }]
  })

  return { cart: nextCart, didClamp, didChangePrice, removedItems }
}

export { getRemainingStock, isProductAvailable, revalidateCartStock }
