// Concentrates the calls to the backend's login/registration endpoints,
// same pattern as product.service.js.
const API_BASE_URL = 'http://localhost:3001/api/clientes'

function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

async function login(email, password) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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

async function registerClient(data) {
  let response
  try {
    response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

export { login, registerClient }
