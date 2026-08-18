import { useEffect } from 'react'

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function ProductDetail({ product, onClose }) {
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

  const isAvailable = product.estado !== 'descontinuado' && Number(product.stock) > 0
  const shortName = product.nombre.split(' ').slice(0, 3).join(' ')

  return (
    <div className="product-detail-overlay" onMouseDown={onClose}>
      <article
        className="product-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
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
            <p className="product-meta">Stock actual · {product.stock} unidades</p>
            <p className="product-price tabnum">{priceFormatter.format(product.precio)}</p>
            <p className="product-description">
              {product.descripcion || 'Este producto todavía no tiene una descripción cargada.'}
            </p>
            <div className="nutrition-block">
              <span className="nutrition-title">Información nutricional</span>
              <p>{product.info_nutricional || 'Información nutricional pendiente de carga.'}</p>
            </div>
            <div className="availability-row">
              <span className={`availability-dot ${isAvailable ? '' : 'is-unavailable'}`} />
              <div>
                <strong>{isAvailable ? 'Disponible' : 'No disponible'}</strong>
                <span>{isAvailable ? `${product.stock} unidades en stock` : 'Sin stock para pedidos'}</span>
              </div>
            </div>
            <button type="button" className="btn btn-accent detail-done" onClick={onClose}>
              Volver al catálogo
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

export default ProductDetail
