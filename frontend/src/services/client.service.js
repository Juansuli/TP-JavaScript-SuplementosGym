// Concentrates the calls to the backend's client-management endpoints
// (panel de administración: listar clientes y habilitar/inhabilitar),
// mismo patrón que product.service.js y pedido.service.js.
const API_BASE_URL = 'http://localhost:3001/api/clientes'

function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

async function getClients(token) {
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

async function setClientStatus(id, activo, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ activo }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

export { getClients, setClientStatus }
