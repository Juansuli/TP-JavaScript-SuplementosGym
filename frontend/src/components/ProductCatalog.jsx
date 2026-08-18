import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'
import { getProducts, getProductById } from '../services/product.service'

function ProductCatalog({ onAddToCart }) {
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

  // Load the full catalog once, when the page first mounts.
  useEffect(() => {
    loadProducts()
  }, [])

  function handleFilterSubmit(event) {
    event.preventDefault()
    loadProducts({ minPrice, maxPrice })
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
    <>
      <header className="catalog-header">
        <h1>Catálogo de productos</h1>

        <form className="price-filter" onSubmit={handleFilterSubmit}>
          <label>
            Precio mínimo
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
          </label>
          <label>
            Precio máximo
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </label>
          <button type="submit">Filtrar</button>
        </form>
      </header>

      <main className="catalog-main">
        {isLoading && <p className="catalog-message">Cargando productos...</p>}

        {!isLoading && error && (
          <p className="catalog-message catalog-error">{error}</p>
        )}

        {!isLoading && !error && products.length === 0 && (
          <p className="catalog-message">No hay productos para mostrar</p>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id_producto}
                product={product}
                onSelect={handleSelectProduct}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </>
  )
}

export default ProductCatalog
