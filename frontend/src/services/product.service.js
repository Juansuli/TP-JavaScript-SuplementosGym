// Concentrates every call to the backend's producto endpoints so the
// components never talk to fetch() directly.
const API_BASE_URL = 'http://localhost:3001/api/productos'

// The backend's error shape isn't consistent: some routes send a single
// string ({ error: 'Product not found.' }), others send an array of
// validation messages ({ error: ['Name is required.', ...] }).
function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join(' ') : body.error
}

async function getProducts(filters = {}) {
  const { minPrice, maxPrice } = filters
  const params = new URLSearchParams()

  // The backend expects Spanish query param names (precioMin/precioMax)
  // even though everything on the frontend side stays in English.
  if (minPrice) params.set('precioMin', minPrice)
  if (maxPrice) params.set('precioMax', maxPrice)

  const query = params.toString()
  const url = query ? `${API_BASE_URL}?${query}` : API_BASE_URL

  let response
  try {
    response = await fetch(url)
  } catch {
    // fetch() itself rejects (server down, sin red, CORS) antes de
    // llegar a response.ok, así que se maneja aparte.
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!response.ok) {
    throw new Error('No se pudieron cargar los productos.')
  }

  return response.json()
}

async function getProductById(id) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`)
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!response.ok) {
    throw new Error('No se pudo cargar el detalle del producto.')
  }

  return response.json()
}

async function createProduct(data) {
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

async function updateProduct(id, data) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
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

async function deleteProduct(id) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(parseErrorMessage(body))
  }

  // 204 = borrado físico, sin contenido. 200 = baja lógica (CUU1): el
  // backend devuelve el producto ya marcado "descontinuado" en vez de
  // borrarlo, porque tiene pedidos asociados.
  if (response.status === 204) {
    return null
  }

  return response.json()
}

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}
