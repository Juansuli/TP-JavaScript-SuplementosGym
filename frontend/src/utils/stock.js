function getRemainingStock(product, quantityInCart = 0) {
  return Math.max(0, Number(product.stock) - quantityInCart)
}

// A product can only be bought while it is "disponible" and has stock:
// it may have run out or been discontinued since it was displayed.
function isProductAvailable(product) {
  return product.estado === 'disponible' && product.stock > 0
}

// Applies the real stock to the cart: quantities above it are lowered, and
// products that disappeared or ran out are removed.
function revalidateCartStock(cart, products) {
  let didClamp = false

  const nextCart = cart
    .map((item) => {
      const product = products.find((p) => p.id_producto === item.id_producto)
      if (!product) {
        didClamp = true
        return null
      }

      const nextQuantity = Math.min(item.cantidad, product.stock)
      if (nextQuantity !== item.cantidad) didClamp = true

      return { ...item, stock: product.stock, cantidad: nextQuantity }
    })
    .filter((item) => item !== null && item.cantidad > 0)

  return { cart: nextCart, didClamp }
}

export { getRemainingStock, isProductAvailable, revalidateCartStock }
