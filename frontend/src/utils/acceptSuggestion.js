import { getSuggestion, updateSuggestionStatus } from '../services/suggestion.service'
import { getRemainingStock, isProductAvailable } from './stock'

// Accepts a pending suggestion: marks it "aceptada" in the backend and
// adds one unit of each suggested product that can still be bought.
// Returns how many products were added and how many were skipped (and why:
// out of stock, or the cart already holds all the available stock), so the
// caller can show a single summary toast. Used by both the AI block in
// the cart and the "Agregar al carrito" action in "Mis sugerencias".
async function acceptSuggestionIntoCart(suggestionId, cartQuantities, addProductsToCart, token) {
  // The suggestion on screen can be days old (e.g. opened from
  // "Mis sugerencias"), so it is fetched again to work with the CURRENT
  // stock and estado of each product instead of a stale copy.
  const suggestion = await getSuggestion(suggestionId, token)

  const addableProducts = []
  let outOfStockCount = 0
  let alreadyInCartCount = 0

  suggestion.productos.forEach((product) => {
    if (!isProductAvailable(product)) {
      outOfStockCount += 1
    } else if (getRemainingStock(product, cartQuantities[product.id_producto] ?? 0) === 0) {
      alreadyInCartCount += 1
    } else {
      addableProducts.push(product)
    }
  })

  // Nothing can be added: the PATCH is skipped and the suggestion stays
  // "pendiente", so the client can still answer it later.
  if (addableProducts.length === 0) {
    throw new Error(buildNothingToAddMessage(outOfStockCount, alreadyInCartCount))
  }

  // First tell the backend, then touch the cart: if the request fails
  // nothing was added, so trying again cannot duplicate the products.
  await updateSuggestionStatus(suggestionId, 'aceptada', token)
  addProductsToCart(addableProducts)

  return {
    addedCount: addableProducts.length,
    outOfStockCount,
    alreadyInCartCount,
  }
}

// Error shown when none of the suggested products can be added.
function buildNothingToAddMessage(outOfStockCount, alreadyInCartCount) {
  if (outOfStockCount > 0 && alreadyInCartCount > 0) {
    return 'Los productos de esta sugerencia están sin stock o ya tenés en el carrito todo el stock disponible.'
  }

  if (alreadyInCartCount > 0) {
    return 'Ya tenés en el carrito todo el stock disponible de los productos de esta sugerencia.'
  }

  return 'Ningún producto de esta sugerencia tiene stock disponible.'
}

// Builds the single summary toast shown after accepting a suggestion.
function buildAcceptedToast(addedCount, outOfStockCount, alreadyInCartCount) {
  const addedText =
    addedCount === 1
      ? 'Se agregó 1 producto al carrito'
      : `Se agregaron ${addedCount} productos al carrito`

  const skippedTexts = []

  if (outOfStockCount > 0) {
    skippedTexts.push(
      outOfStockCount === 1
        ? '1 sin stock no se agregó'
        : `${outOfStockCount} sin stock no se agregaron`
    )
  }

  if (alreadyInCartCount > 0) {
    skippedTexts.push(
      alreadyInCartCount === 1
        ? '1 ya tenía todo su stock en el carrito'
        : `${alreadyInCartCount} ya tenían todo su stock en el carrito`
    )
  }

  if (skippedTexts.length === 0) return addedText

  return `${addedText} (${skippedTexts.join(', ')})`
}

export { acceptSuggestionIntoCart, buildAcceptedToast }
