import { useEffect, useRef, useState } from 'react'
import ProductCard from './ProductCard'
import ProductDetail from './ProductDetail'
import { getProducts, getProductById } from '../services/product.service'

function ProductCatalog({ cartQuantities, onAddToCart, showToast }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [filterErrors, setFilterErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const selectedProductIdRef = useRef(null)

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

  function validatePriceRange() {
    const nextErrors = {}
    const minimum = minPrice === '' ? null : Number(minPrice)
    const maximum = maxPrice === '' ? null : Number(maxPrice)

    if (minimum !== null && (Number.isNaN(minimum) || minimum < 0)) {
      nextErrors.minPrice = 'El precio mínimo debe ser mayor o igual a 0.'
    }

    if (maximum !== null && (Number.isNaN(maximum) || maximum < 0)) {
      nextErrors.maxPrice = 'El precio máximo debe ser mayor o igual a 0.'
    }

    if (!nextErrors.minPrice && !nextErrors.maxPrice && minimum !== null && maximum !== null && minimum > maximum) {
      nextErrors.range = 'El precio mínimo no puede superar al máximo.'
    }

    return nextErrors
  }

  function handleFilterSubmit(event) {
    event.preventDefault()
    const nextErrors = validatePriceRange()
    setFilterErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    loadProducts({ minPrice, maxPrice })
  }

  function handleClearFilters() {
    setMinPrice('')
    setMaxPrice('')
    setFilterErrors({})
    loadProducts()
  }

  function handlePriceChange(field, setValue) {
    return (event) => {
      setValue(event.target.value)
      setFilterErrors((prev) => ({ ...prev, [field]: undefined, range: undefined }))
    }
  }

  async function handleSelectProduct(id) {
    selectedProductIdRef.current = id

    try {
      const product = await getProductById(id)
      if (selectedProductIdRef.current === id) setSelectedProduct(product)
    } catch (err) {
      if (selectedProductIdRef.current === id) showToast(err.message, 'error')
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

        <form className="price-filter" noValidate onSubmit={handleFilterSubmit}>
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
                <input type="number" min="0" aria-invalid={Boolean(filterErrors.minPrice)} aria-describedby={filterErrors.minPrice ? 'min-price-error' : undefined} placeholder="0" value={minPrice} onChange={handlePriceChange('minPrice', setMinPrice)} />
              </span>
              {filterErrors.minPrice && <span id="min-price-error" className="filter-field-error">{filterErrors.minPrice}</span>}
            </label>
            <label>
              Hasta
              <span className="price-input">
                <span>$</span>
                <input type="number" min="0" aria-invalid={Boolean(filterErrors.maxPrice)} aria-describedby={filterErrors.maxPrice ? 'max-price-error' : undefined} placeholder="Sin límite" value={maxPrice} onChange={handlePriceChange('maxPrice', setMaxPrice)} />
              </span>
              {filterErrors.maxPrice && <span id="max-price-error" className="filter-field-error">{filterErrors.maxPrice}</span>}
            </label>
            <button className="btn btn-accent filter-submit" type="submit">Aplicar</button>
          </div>
          {filterErrors.range && <p className="filter-range-error">{filterErrors.range}</p>}
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
          onClose={() => {
            selectedProductIdRef.current = null
            setSelectedProduct(null)
          }}
          onAddToCart={onAddToCart}
        />
      )}
    </section>
  )
}

export default ProductCatalog
