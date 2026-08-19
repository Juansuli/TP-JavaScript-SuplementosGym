import { useEffect, useState } from 'react'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function ProductDetail({ product, quantityInCart = 0, onClose, onAddToCart }) {
  const [isAdded, setIsAdded] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [onClose])

  useEffect(() => {
    if (!isAdded) return undefined

    const timeoutId = window.setTimeout(() => setIsAdded(false), 550)
    return () => window.clearTimeout(timeoutId)
  }, [isAdded])

  const remainingStock = Math.max(0, Number(product.stock) - quantityInCart)
  const isAvailable = product.estado === 'disponible' && remainingStock > 0
  const shortName = product.nombre.split(' ').slice(0, 3).join(' ')

  function handleAddToCart() {
    if (!isAvailable || isAdded) return
    onAddToCart(product)
    setIsAdded(true)
  }

  return (
    <div className="product-detail-overlay" onMouseDown={onClose}>
      <article className="product-detail" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="detail-toolbar">
          <span className="detail-kicker">Ficha de producto</span>
          <button type="button" className="product-detail-close" onClick={onClose} aria-label="Cerrar detalle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="detail-grid">
          <div className="product-visual">
            <div className="product-tub">
              <span className="tub-brand">DOSIS</span>
              <span className="tub-name">{shortName}</span>
              <span className="tub-flavor">Producto deportivo</span>
            </div>
          </div>

          <div className="product-info">
            <p className="eyebrow">Producto #{String(product.id_producto).padStart(4, '0')}</p>
            <h2 className="product-title" id="product-detail-title">{product.nombre}</h2>
            <p className="product-meta">Stock actual · {remainingStock} unidades</p>
            <p className="product-price tabnum">{priceFormatter.format(product.precio)}</p>
            <p className="product-description">{product.descripcion || 'Este producto todavía no tiene una descripción cargada.'}</p>
            <div className="nutrition-block">
              <span className="nutrition-title">Información nutricional</span>
              <p>{product.info_nutricional || 'Información nutricional pendiente de carga.'}</p>
            </div>
            <div className="availability-row">
              <span className={`availability-dot ${isAvailable ? '' : 'is-unavailable'}`} />
              <div>
                <strong>{isAvailable ? 'Disponible' : 'No disponible'}</strong>
                <span>{isAvailable ? `${remainingStock} unidades en stock` : 'Sin stock para pedidos'}</span>
              </div>
            </div>
            <div className="detail-actions">
              {onAddToCart && (
                <button
                  type="button"
                  className={`btn btn-accent product-detail-add ${isAdded ? 'is-added' : ''}`}
                  disabled={!isAvailable || isAdded}
                  onClick={handleAddToCart}
                >
                  {isAdded ? '✓ Agregado' : 'Agregar al pedido'}
                </button>
              )}
              <button type="button" className="btn btn-ghost detail-done" onClick={onClose}>Volver al catálogo</button>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

export default ProductDetail
