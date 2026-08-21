const API_BASE_URL = 'http://localhost:3001/api/productos'

function parseErrorMessage(body) {
  if (!body || !body.error) return 'Ocurrió un error inesperado.'
  return Array.isArray(body.error) ? body.error.join('\n') : body.error
}

function buildProductFormData(data) {
  const formData = new FormData()

  Object.entries(data).forEach(([field, value]) => {
    if (field !== 'imagen' && value !== undefined && value !== null) {
      formData.append(field, value)
    }
  })

  if (data.imagen) formData.append('imagen', data.imagen)
  return formData
}

async function getProducts(filters = {}) {
  const { minPrice, maxPrice } = filters
  const params = new URLSearchParams()

  if (minPrice) params.set('precioMin', minPrice)
  if (maxPrice) params.set('precioMax', maxPrice)

  const query = params.toString()
  const url = query ? `${API_BASE_URL}?${query}` : API_BASE_URL

  let response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!response.ok) throw new Error('No se pudieron cargar los productos.')
  return response.json()
}

async function getProductById(id) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`)
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  if (!response.ok) throw new Error('No se pudo cargar el detalle del producto.')
  return response.json()
}

async function createProduct(data, token) {
  let response
  try {
    response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: buildProductFormData(data),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

async function updateProduct(id, data, token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: buildProductFormData(data),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseErrorMessage(body))
  return body
}

async function deleteProduct(id, token) {
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

  if (response.status === 204) return null
  return response.json()
}

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}