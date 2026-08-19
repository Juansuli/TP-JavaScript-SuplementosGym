// Concentrates every call to the backend's pedido endpoints so the
// components never talk to fetch() directly.
const API_BASE_URL = 'http://localhost:3001/api/pedidos'

// Same inconsistent error shape as product.service.js: sometimes a single
// string, sometimes an array of validation messages.
function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

async function createOrder(data, token) {
  let response
  try {
    response = await fetch(API_BASE_URL, {
      method: 'POST',
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
  if (!response.ok) {
    throw new Error(parseErrorMessage(body))
  }

  return body
}

export { createOrder }
