function ProductDetail({ product, onClose, onAddToCart }) {
  const isAvailable = product.estado === 'disponible' && product.stock > 0

  return (
    <div className="product-detail-overlay">
      <div className="product-detail" role="dialog" aria-modal="true">
        <button type="button" className="product-detail-close" onClick={onClose}>
          Cerrar
        </button>

        <h2>{product.nombre}</h2>
        <p>{product.descripcion}</p>
        <p className="product-detail-price">${product.precio}</p>
        <p>Stock disponible: {product.stock}</p>

        {product.info_nutricional && (
          <>
            <h3>Información nutricional</h3>
            <p>{product.info_nutricional}</p>
          </>
        )}

        {onAddToCart && (
          <button
            type="button"
            className="product-detail-add"
            disabled={!isAvailable}
            onClick={() => onAddToCart(product)}
          >
            Agregar al carrito
          </button>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
