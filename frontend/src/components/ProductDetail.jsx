function ProductDetail({ product, onClose }) {
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
      </div>
    </div>
  )
}

export default ProductDetail
