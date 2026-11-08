import { API_ORIGIN } from '../config/api'

const API_BASE_URL = `${API_ORIGIN}/api/descuentos`

function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

async function request(path, options, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (response.status === 204) return null

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

function getDiscounts(token) {
  return request('', {}, token)
}

function createDiscount(data, token) {
  return request('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token)
}

function updateDiscount(category, data, token) {
  return request(`/${encodeURIComponent(category)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token)
}

function deleteDiscount(category, token) {
  return request(`/${encodeURIComponent(category)}`, { method: 'DELETE' }, token)
}

export { getDiscounts, createDiscount, updateDiscount, deleteDiscount }
