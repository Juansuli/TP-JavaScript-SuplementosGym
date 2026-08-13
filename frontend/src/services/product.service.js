// Concentrates every call to the backend's producto endpoints so the
// components never talk to fetch() directly.
const API_BASE_URL = 'http://localhost:3001/api/productos'

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

export { getProducts, getProductById }
