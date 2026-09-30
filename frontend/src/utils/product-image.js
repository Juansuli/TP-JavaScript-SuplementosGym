import { API_ORIGIN } from '../config/api'

function getProductImageUrl(imageUrl) {
  return imageUrl ? `${API_ORIGIN}${imageUrl}` : null
}

export { getProductImageUrl }