// Concentrates every call to the backend's sugerencias endpoints (the
// AI product suggestions) so the components never talk to fetch()
// directly. Same pattern as pedido.service.js.
import { API_ORIGIN } from '../config/api'

const API_BASE_URL = `${API_ORIGIN}/api/sugerencias`

// Same inconsistent error shape as pedido.service.js: sometimes a single
// string, sometimes an array of validation messages.
function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

async function requestSuggestion(cart, token) {
  let response
  try {
    response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        carrito: cart.map((item) => ({ id_producto: item.id_producto, cantidad: item.cantidad })),
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(parseErrorMessage(body))
    // When the profile is incomplete the backend also sends "campos" with
    // one message per missing field; the cart uses them to link to Mi perfil.
    error.missingFields = Array.isArray(body?.campos) ? body.campos : []
    throw error
  }

  return body
}

async function getSuggestions(token) {
  let response
  try {
    response = await fetch(API_BASE_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

async function updateSuggestionStatus(id, estado, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ estado }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

async function deleteSuggestion(id, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(parseErrorMessage(body))
  }
}

export { requestSuggestion, getSuggestions, updateSuggestionStatus, deleteSuggestion }
