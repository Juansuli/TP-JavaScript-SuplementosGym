import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRemainingStock } from '../utils/stock'
import ProductImage from './ProductImage'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function getStatus(product, remainingStock) {
  if (['inhabilitado', 'descontinuado'].includes(product.estado)) return 'Descontinuado'
  if (product.estado === 'agotado' || remainingStock === 0) return 'Agotado'
  return 'Disponible'
}

function ProductCard({ product, detailPath, quantityInCart = 0, onAddToCart }) {
  const [isAdded, setIsAdded] = useState(false)
  const remainingStock = getRemainingStock(product, quantityInCart)
  const status = getStatus(product, remainingStock)
  const isCartLimitReached = ['habilitado', 'disponible'].includes(product.estado) && Number(product.stock) > 0 && remainingStock === 0
  const statusLabel = isCartLimitReached ? 'Máximo en pedido' : status
  const isAvailable = ['habilitado', 'disponible'].includes(product.estado) && remainingStock > 0

  useEffect(() => {
    if (!isAdded) return undefined

    const timeoutId = window.setTimeout(() => setIsAdded(false), 550)
    return () => window.clearTimeout(timeoutId)
  }, [isAdded])

  function handleAddToCart() {
    if (!isAvailable || isAdded) return
    onAddToCart(product)
    setIsAdded(true)
  }

  return (
    <article className={`product-card product-state-${product.estado ?? 'disponible'}`}>
      <div className="product-card-visual">
        <ProductImage product={product} className="product-card-image" />
      </div>

      <div className="product-card-content">
        <div className="product-card-top">
          <span className={`status-tag status-${status.toLowerCase()}`}>{statusLabel}</span>
          <span className="card-price tabnum">{priceFormatter.format(product.precio)}</span>
        </div>
        <Link className="product-card-title" to={detailPath}>
          {product.nombre}
        </Link>
        <p className="product-card-description">
          {product.descripcion || 'Producto deportivo con ficha técnica disponible.'}
        </p>
        <dl className="product-card-facts">
          <div><dt>Stock</dt><dd className="tabnum">{remainingStock} un.</dd></div>
          <div><dt>Estado</dt><dd>{statusLabel}</dd></div>
        </dl>
        <div className="product-card-actions">
          <Link className="btn btn-outline product-card-select" to={detailPath}>
            Ver detalle
          </Link>
          {onAddToCart && (
            <button
              type="button"
              className={`btn btn-accent product-card-add ${isAdded ? 'is-added' : ''}`}
              disabled={!isAvailable || isAdded}
              onClick={handleAddToCart}
            >
              {isAdded ? '✓ Agregado' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default ProductCard
