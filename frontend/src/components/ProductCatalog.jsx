import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'
import { getProducts, getProductById } from '../services/product.service'

function ProductCatalog({ cartQuantities, onAddToCart }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadProducts(filters) {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getProducts(filters)
      setProducts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function handleFilterSubmit(event) {
    event.preventDefault()
    loadProducts({ minPrice, maxPrice })
  }

  function handleClearFilters() {
    setMinPrice('')
    setMaxPrice('')
    loadProducts()
  }

  async function handleSelectProduct(id) {
    setError(null)

    try {
      const product = await getProductById(id)
      setSelectedProduct(product)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="catalog-page wrap" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">Catálogo DOSIS</p>
          <h1 id="catalog-title">Elegí lo que suma a tu entrenamiento.</h1>
          <p className="catalog-lede">Productos con precio, disponibilidad y ficha nutricional sin vueltas.</p>
        </div>

        <form className="price-filter" onSubmit={handleFilterSubmit}>
          <div className="filter-title">
            <span>Filtrar por precio</span>
            {(minPrice || maxPrice) && (
              <button type="button" onClick={handleClearFilters}>Limpiar</button>
            )}
          </div>
          <div className="filter-fields">
            <label>
              Desde
              <span className="price-input">
                <span>$</span>
                <input type="number" min="0" placeholder="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
              </span>
            </label>
            <label>
              Hasta
              <span className="price-input">
                <span>$</span>
                <input type="number" min="0" placeholder="Sin límite" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
              </span>
            </label>
            <button className="btn btn-accent filter-submit" type="submit">Aplicar</button>
          </div>
        </form>
      </div>

      <div className="catalog-results-head">
        <h2>Productos</h2>
        {!isLoading && !error && <span className="result-count tabnum">{products.length} resultados</span>}
      </div>

      {isLoading && <p className="catalog-message">Cargando productos...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && products.length === 0 && (
        <p className="catalog-message">No hay productos para mostrar con ese rango.</p>
      )}
      {!isLoading && !error && products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id_producto}
              product={product}
              quantityInCart={cartQuantities[product.id_producto] ?? 0}
              onSelect={handleSelectProduct}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          quantityInCart={cartQuantities[selectedProduct.id_producto] ?? 0}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </section>
  )
}

export default ProductCatalog
