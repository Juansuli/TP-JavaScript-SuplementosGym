import { useEffect, useRef, useState } from 'react'
import AiSuggestion from './AiSuggestion'
import ConfirmModal from './ConfirmModal'
import { deleteSuggestion, getSuggestions, updateSuggestionStatus } from '../services/suggestion.service'
import { acceptSuggestionIntoCart, buildAcceptedToast } from '../utils/acceptSuggestion'
import { isProductAvailable } from '../utils/stock'

const SUGGESTION_STATE_LABELS = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

// Reusa los mismos colores de badge que los pedidos: pendiente y
// rechazada ya tienen estilo propio; aceptada queda con el color base
// de .status-tag, igual que un pedido confirmado.
function getStatusBadgeModifier(estado) {
  if (estado === 'rechazada') return 'cancelado'
  if (estado === 'aceptada') return 'confirmado'
  return 'pendiente'
}

function MySuggestions({ cart, cartQuantities, token, addProductsToCart, onGoToProfile, showToast }) {
  const [suggestions, setSuggestions] = useState([])
  const [suggestionPendingDelete, setSuggestionPendingDelete] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAnswering, setIsAnswering] = useState(false)
  // A ref changes immediately, while disabled buttons only update after
  // the next render: it stops a very fast double click from sending two
  // requests.
  const isBusyRef = useRef(false)

  useEffect(() => {
    let isStale = false

    async function loadSuggestions() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getSuggestions(token)
        if (!isStale) setSuggestions(data)
      } catch (err) {
        if (!isStale) setError(err.message)
      } finally {
        if (!isStale) setIsLoading(false)
      }
    }

    loadSuggestions()
    return () => {
      isStale = true
    }
  }, [token])

  // Reloads the list without touching the "Cargando..." state: used after
  // row actions and after the header box creates or answers a suggestion,
  // so the table stays fresh without flashing the loading message.
  async function reloadSuggestions() {
    try {
      setSuggestions(await getSuggestions(token))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function confirmDelete() {
    const suggestion = suggestionPendingDelete
    if (!suggestion) return

    setSuggestionPendingDelete(null)
    try {
      await deleteSuggestion(suggestion.id_sugerencia, token)
      setSuggestions((prev) => prev.filter((item) => item.id_sugerencia !== suggestion.id_sugerencia))
      showToast('La sugerencia se eliminó correctamente.')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function updateRowEstado(suggestionId, estado) {
    setSuggestions((prev) =>
      prev.map((item) =>
        item.id_sugerencia === suggestionId ? { ...item, estado } : item
      )
    )
  }

  async function handleAcceptSuggestion(suggestion) {
    if (isBusyRef.current) return
    isBusyRef.current = true
    setIsAnswering(true)
    try {
      const { addedCount, skippedCount } = await acceptSuggestionIntoCart(
        suggestion.id_sugerencia,
        cartQuantities,
        addProductsToCart,
        token
      )
      updateRowEstado(suggestion.id_sugerencia, 'aceptada')
      showToast(buildAcceptedToast(addedCount, skippedCount))
    } catch (err) {
      showToast(err.message, 'error')
      reloadSuggestions()
    } finally {
      setIsAnswering(false)
      isBusyRef.current = false
    }
  }

  async function handleDiscardSuggestion(suggestion) {
    if (isBusyRef.current) return
    isBusyRef.current = true
    setIsAnswering(true)
    try {
      await updateSuggestionStatus(suggestion.id_sugerencia, 'rechazada', token)
      updateRowEstado(suggestion.id_sugerencia, 'rechazada')
    } catch (err) {
      showToast(err.message, 'error')
      reloadSuggestions()
    } finally {
      setIsAnswering(false)
      isBusyRef.current = false
    }
  }

  return (
    <div className="admin-orders my-suggestions">
      <div className="admin-products-header my-suggestions-header">
        <h1>Mis sugerencias</h1>
        <AiSuggestion
          cart={cart}
          cartQuantities={cartQuantities}
          token={token}
          addProductsToCart={addProductsToCart}
          onGoToProfile={onGoToProfile}
          showToast={showToast}
          onSuggestionsChanged={reloadSuggestions}
        />
      </div>

      {isLoading && <p className="catalog-message">Cargando tus sugerencias...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && suggestions.length === 0 && (
        <p className="catalog-message">Todavía no pediste sugerencias. Pedí una con el botón “Sugerime un producto”.</p>
      )}

      {!isLoading && !error && suggestions.length > 0 && (
        <div className="admin-orders-table-wrap">
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>Sugerencia</th>
                <th>Fecha</th>
                <th>Productos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => (
                <tr key={suggestion.id_sugerencia}>
                  <td className="tabnum">#{suggestion.id_sugerencia}</td>
                  <td className="tabnum">{dateFormatter.format(new Date(suggestion.fecha_generacion))}</td>
                  <td>
                    {suggestion.productos.length === 0 ? (
                      '—'
                    ) : (
                      <ul className="suggestion-products">
                        {suggestion.productos.map((product) => (
                          <li key={product.id_producto}>
                            <strong>{product.nombre}</strong>
                            {!isProductAvailable(product) && (
                              <span className="status-tag status-agotado">Sin stock</span>
                            )}
                            <span>{product.motivo}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <span className={`status-tag status-${getStatusBadgeModifier(suggestion.estado)}`}>
                      {SUGGESTION_STATE_LABELS[suggestion.estado] ?? suggestion.estado}
                    </span>
                  </td>
                  <td>
                    <div className="suggestion-actions">
                      {suggestion.estado === 'pendiente' && (
                        <>
                          <button
                            type="button"
                            className="admin-order-detail-button"
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            disabled={isAnswering}
                          >
                            Agregar al carrito
                          </button>
                          <button
                            type="button"
                            className="admin-order-detail-button"
                            onClick={() => handleDiscardSuggestion(suggestion)}
                            disabled={isAnswering}
                          >
                            Descartar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="admin-order-delete"
                        onClick={() => setSuggestionPendingDelete(suggestion)}
                        disabled={isAnswering}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {suggestionPendingDelete && (
        <ConfirmModal
          title="Borrar sugerencia"
          message="¿Borrar esta sugerencia?"
          confirmLabel="Borrar"
          isDanger
          onConfirm={confirmDelete}
          onCancel={() => setSuggestionPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default MySuggestions
