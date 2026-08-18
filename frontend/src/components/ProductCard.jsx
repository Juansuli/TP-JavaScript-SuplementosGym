const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function getStatus(product) {
  if (product.estado === 'descontinuado') return 'Descontinuado'
  if (product.estado === 'agotado' || Number(product.stock) === 0) return 'Agotado'
  return 'Disponible'
}

function ProductCard({ product, onSelect }) {
  const status = getStatus(product)
  const shortName = product.nombre.split(' ').slice(0, 3).join(' ')

  return (
    <article className="product-card">
      <div className="product-card-visual" aria-hidden="true">
        <div className="mini-tub">
          <span>DOSIS</span>
          <strong>{shortName}</strong>
        </div>
      </div>

      <div className="product-card-content">
        <div className="product-card-top">
          <span className={`status-tag status-${status.toLowerCase()}`}>{status}</span>
          <span className="card-price tabnum">{priceFormatter.format(product.precio)}</span>
        </div>
        <button type="button" className="product-card-title" onClick={() => onSelect(product.id_producto)}>
          {product.nombre}
        </button>
        <p className="product-card-description">
          {product.descripcion || 'Producto deportivo con ficha técnica disponible.'}
        </p>
        <dl className="product-card-facts">
          <div><dt>Stock</dt><dd className="tabnum">{product.stock} un.</dd></div>
          <div><dt>Estado</dt><dd>{status}</dd></div>
          <div><dt>Ficha</dt><dd>{product.info_nutricional ? 'Disponible' : '—'}</dd></div>
        </dl>
        <button type="button" className="btn btn-outline product-card-select" onClick={() => onSelect(product.id_producto)}>
          Ver detalle
        </button>
      </div>
    </article>
  )
}

export default ProductCard
