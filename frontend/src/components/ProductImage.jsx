import { useEffect, useState } from 'react'
import { getProductImageUrl } from '../utils/product-image'

function ProductImage({ product, className }) {
  const [hasLoadError, setHasLoadError] = useState(false)
  const imageUrl = getProductImageUrl(product.imagen_url)

  useEffect(() => {
    setHasLoadError(false)
  }, [imageUrl])

  if (!imageUrl || hasLoadError) {
    return (
      <div className={`${className} product-image-fallback`} aria-hidden="true">
        <span>DOSIS</span>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={imageUrl}
      alt={product.nombre}
      onError={() => setHasLoadError(true)}
    />
  )
}

export default ProductImage