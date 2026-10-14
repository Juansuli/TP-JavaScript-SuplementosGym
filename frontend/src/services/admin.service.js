// Concentrates the calls to the backend's administrator-management
// endpoints (issue #58): list, create, edit and enable/disable
// administrators. Same pattern as client.service.js.
import { API_ORIGIN } from '../config/api'

const API_BASE_URL = `${API_ORIGIN}/api/administradores`

function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

async function sendRequest(url, token, { method = 'GET', data } = {}) {
  let response
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

function getAdmins(token) {
  return sendRequest(API_BASE_URL, token)
}

function createAdmin(data, token) {
  return sendRequest(API_BASE_URL, token, { method: 'POST', data })
}

function updateAdmin(id, data, token) {
  return sendRequest(`${API_BASE_URL}/${id}`, token, { method: 'PUT', data })
}

function setAdminStatus(id, activo, token) {
  return sendRequest(`${API_BASE_URL}/${id}/estado`, token, { method: 'PATCH', data: { activo } })
}

export { getAdmins, createAdmin, updateAdmin, setAdminStatus }
