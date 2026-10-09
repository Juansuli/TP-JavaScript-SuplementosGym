import { useState } from 'react'
import ProductImage from './ProductImage'
import { requestSuggestion, updateSuggestionStatus } from '../services/suggestion.service'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

// La respuesta del backend trae el stock y el estado actuales de cada
// producto: uno sugerido pudo agotarse o discontinuarse desde que la IA
// lo eligió, así que solo se puede agregar al carrito si sigue disponible.
function isProductAvailable(product) {
  return product.estado === 'disponible' && product.stock > 0
}

function AiSuggestion({ cart, token, onAddToCart, onGoToProfile, showToast }) {
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState(null)
  const [missingFields, setMissingFields] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)

  const availableProducts = suggestion ? suggestion.productos.filter(isProductAvailable) : []

  async function handleRequest() {
    setIsLoading(true)
    setError(null)
    setMissingFields([])
    try {
      setSuggestion(await requestSuggestion(cart, token))
    } catch (err) {
      setError(err.message)
      setMissingFields(err.missingFields ?? [])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAccept() {
    setIsAnswering(true)
    setError(null)
    try {
      // First tell the backend, then touch the cart: if the request fails
      // nothing was added, so trying again cannot duplicate the products.
      await updateSuggestionStatus(suggestion.id_sugerencia, 'aceptada', token)
      availableProducts.forEach((product) => onAddToCart(product))
      showToast('Se agregaron las sugerencias al carrito')
      setSuggestion(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAnswering(false)
    }
  }

  async function handleReject() {
    setIsAnswering(true)
    setError(null)
    try {
      await updateSuggestionStatus(suggestion.id_sugerencia, 'rechazada', token)
      setSuggestion(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAnswering(false)
    }
  }

  return (
    <section className="ai-suggestion" aria-label="Sugerencias de IA">
      <p className="eyebrow">Sugerencias de IA</p>

      {!suggestion ? (
        <>
          <p className="ai-suggestion-intro">
            La IA puede recomendarte productos según tu perfil y lo que ya elegiste.
          </p>
          <button type="button" className="btn btn-outline" onClick={handleRequest} disabled={isLoading}>
            {isLoading ? 'Pensando tu sugerencia…' : 'Pedir sugerencia de IA'}
          </button>
        </>
      ) : (
        <>
          <ul className="ai-suggestion-products">
            {suggestion.productos.map((product) => (
              <li
                key={product.id_producto}
                className={isProductAvailable(product) ? undefined : 'is-unavailable'}
              >
                <ProductImage product={product} className="cart-item-thumb" />
                <div className="ai-suggestion-info">
                  <span className="cart-item-name">{product.nombre}</span>
                  <span className="cart-item-meta tabnum">{priceFormatter.format(product.precio)}</span>
                  <p className="ai-suggestion-motivo">{product.motivo}</p>
                </div>
                {!isProductAvailable(product) && (
                  <span className="status-tag status-agotado">Sin stock</span>
                )}
              </li>
            ))}
          </ul>

          <div className="ai-suggestion-actions">
            <button
              type="button"
              className="btn btn-accent"
              onClick={handleAccept}
              disabled={isAnswering || availableProducts.length === 0}
            >
              Agregar al carrito
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReject}
              disabled={isAnswering}
            >
              No, gracias
            </button>
          </div>
        </>
      )}

      {error && <p className="cart-field-error ai-suggestion-error" role="alert">{error}</p>}

      {missingFields.length > 0 && (
        <button type="button" className="btn btn-ghost" onClick={onGoToProfile}>
          Completar mi perfil
        </button>
      )}
    </section>
  )
}

export default AiSuggestion
