function ProductCard({ product, onSelect }) {
  return (
    <article className="product-card">
      <h3>{product.nombre}</h3>
      <p className="product-card-description">{product.descripcion}</p>
      <div className="product-card-footer">
        <span className="product-price">${product.precio}</span>
        <span className="product-stock">Stock: {product.stock}</span>
      </div>
      <button
        type="button"
        className="product-card-select"
        onClick={() => onSelect(product.id_producto)}
      >
        Ver detalle
      </button>
    </article>
  )
}

export default ProductCard
