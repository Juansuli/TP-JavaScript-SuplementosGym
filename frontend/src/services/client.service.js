// Concentrates the calls to the backend's client-management endpoints
// (admin panel: list clients, enable/disable them; "Mi perfil": read and
// update the logged-in client's own data), same pattern as
// product.service.js and pedido.service.js.
import { API_ORIGIN } from '../config/api'

const API_BASE_URL = `${API_ORIGIN}/api/clientes`

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

// Le crea un perfil de cliente a un administrador ya logueado, para que
// pueda hacer pedidos como cualquier cliente sin dejar de ser administrador.
async function enableClientProfile(token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/perfil-cliente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

// Perfil del propio cliente ("Mi perfil"): leer y guardar sus datos.
async function getClient(id, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

async function updateClient(id, data, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

export { getClients, setClientStatus, enableClientProfile, getClient, updateClient }
