const API_ORIGIN = 'http://localhost:3001'

function getProductImageUrl(imageUrl) {
  return imageUrl ? `${API_ORIGIN}${imageUrl}` : null
}

export { getProductImageUrl }