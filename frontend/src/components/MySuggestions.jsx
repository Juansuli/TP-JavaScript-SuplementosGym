import { useEffect, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import { deleteSuggestion, getSuggestions } from '../services/suggestion.service'

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

function MySuggestions({ token, showToast }) {
  const [suggestions, setSuggestions] = useState([])
  const [suggestionPendingDelete, setSuggestionPendingDelete] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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

  return (
    <div className="admin-orders my-suggestions">
      <div className="admin-products-header my-suggestions-header">
        <h1>Mis sugerencias</h1>
      </div>

      {isLoading && <p className="catalog-message">Cargando tus sugerencias...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && suggestions.length === 0 && (
        <p className="catalog-message">Todavía no pediste sugerencias. Podés pedir una desde el carrito.</p>
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
                    <button
                      type="button"
                      className="admin-order-delete"
                      onClick={() => setSuggestionPendingDelete(suggestion)}
                    >
                      Borrar
                    </button>
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
