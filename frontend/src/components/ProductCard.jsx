function ProductCard({ product, onSelect, onAddToCart }) {
  const isAvailable = product.estado === 'disponible' && product.stock > 0

  return (
    <article className="product-card">
      <h3>{product.nombre}</h3>
      <p className="product-card-description">{product.descripcion}</p>
      <div className="product-card-footer">
        <span className="product-price">${product.precio}</span>
        <span className="product-stock">Stock: {product.stock}</span>
      </div>
      <div className="product-card-actions">
        <button
          type="button"
          className="product-card-select"
          onClick={() => onSelect(product.id_producto)}
        >
          Ver detalle
        </button>
        {onAddToCart && (
          <button
            type="button"
            className="product-card-add"
            disabled={!isAvailable}
            onClick={() => onAddToCart(product)}
          >
            Agregar al carrito
          </button>
        )}
      </div>
    </article>
  )
}

export default ProductCard
