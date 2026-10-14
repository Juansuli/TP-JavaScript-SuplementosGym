import { getSuggestion, updateSuggestionStatus } from '../services/suggestion.service'
import { getRemainingStock } from './stock'

// Accepts a pending suggestion: marks it "aceptada" in the backend and
// adds one unit of each suggested product that can still be bought.
// Returns how many products were added and how many were skipped, so the
// caller can show a single summary toast. Used by both the AI block in
// the cart and the "Agregar al carrito" action in "Mis sugerencias".
async function acceptSuggestionIntoCart(suggestionId, cartQuantities, addProductsToCart, token) {
  // The suggestion on screen can be days old (e.g. opened from
  // "Mis sugerencias"), so it is fetched again to work with the CURRENT
  // stock and estado of each product instead of a stale copy.
  const suggestion = await getSuggestion(suggestionId, token)

  const addableProducts = suggestion.productos.filter(
    (product) =>
      product.estado === 'disponible' &&
      getRemainingStock(product, cartQuantities[product.id_producto] ?? 0) > 0
  )

  // Nothing can be added: the PATCH is skipped and the suggestion stays
  // "pendiente", so the client can still answer it later.
  if (addableProducts.length === 0) {
    throw new Error('Ningún producto de esta sugerencia tiene stock disponible.')
  }

  // First tell the backend, then touch the cart: if the request fails
  // nothing was added, so trying again cannot duplicate the products.
  await updateSuggestionStatus(suggestionId, 'aceptada', token)
  addProductsToCart(addableProducts)

  return {
    addedCount: addableProducts.length,
    skippedCount: suggestion.productos.length - addableProducts.length,
  }
}

// Builds the single summary toast shown after accepting a suggestion.
function buildAcceptedToast(addedCount, skippedCount) {
  const addedText =
    addedCount === 1
      ? 'Se agregó 1 producto al carrito'
      : `Se agregaron ${addedCount} productos al carrito`

  if (skippedCount === 0) return addedText

  const skippedText =
    skippedCount === 1
      ? '1 sin stock no se agregó'
      : `${skippedCount} sin stock no se agregaron`
  return `${addedText} (${skippedText})`
}

export { acceptSuggestionIntoCart, buildAcceptedToast }
