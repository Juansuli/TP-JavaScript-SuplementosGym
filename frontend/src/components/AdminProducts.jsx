import { useCallback, useEffect, useRef, useState } from 'react'
import ProductForm from './ProductForm'
import ConfirmModal from './ConfirmModal'
import ProductImage from './ProductImage'
import {
  getAdminProducts,
  restoreProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service'

function AdminProducts({ token, showToast }) {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [productPendingRestore, setProductPendingRestore] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const restoreBusy = useRef(false)
  const [productPendingDelete, setProductPendingDelete] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [isBulkDeletePending, setIsBulkDeletePending] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const selectAllRef = useRef(null)

  const normalizedFilter = nameFilter.trim().toLocaleLowerCase('es')
  const minimum = minPrice === '' ? null : Number(minPrice)
  const maximum = maxPrice === '' ? null : Number(maxPrice)
  const priceFilterError = (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) ||
    (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) ||
    (minimum !== null && maximum !== null && minimum > maximum)
  const filteredProducts = priceFilterError ? [] : products.filter((product) => (
    product.nombre.toLocaleLowerCase('es').includes(normalizedFilter) &&
    (minimum === null || Number(product.precio) >= minimum) &&
    (maximum === null || Number(product.precio) <= maximum)
  ))
  const visibleIds = filteredProducts.map((product) => product.id_producto)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getAdminProducts(token)
      setProducts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [allVisibleSelected, someVisibleSelected])

  function openCreateForm() {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  function openEditForm(product) {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingProduct(null)
  }

  async function handleFormSubmit(values) {
    const payload = {
      ...values,
      precio: Number(values.precio),
      stock: Number(values.stock),
    }

    if (editingProduct) {
      // El producto en memoria puede estar desactualizado (por ejemplo, si
      // se vendió stock por un pedido mientras el formulario seguía
      // abierto). Si el admin no tocó el campo de stock, no lo mandamos:
      // así no pisamos cambios de stock que pasaron después de abrir el
      // formulario.
      if (payload.stock === editingProduct.stock) {
        delete payload.stock
      }

      const updated = await updateProduct(editingProduct.id_producto, payload, token)
      setProducts((prev) =>
        prev.map((product) => (product.id_producto === updated.id_producto ? updated : product))
      )
      showToast(`"${updated.nombre}" se actualizó correctamente.`)
    } else {
      const created = await createProduct(payload, token)
      setProducts((prev) => [...prev, created])
      showToast(`"${created.nombre}" se creó correctamente.`)
    }

    closeForm()
  }

  function requestDelete(product) {
    setProductPendingDelete(product)
  }

  function cancelDelete() {
    setProductPendingDelete(null)
  }

  async function confirmDelete() {
    const product = productPendingDelete
    if (!product) return

    setProductPendingDelete(null)

    try {
      const result = await deleteProduct(product.id_producto, token)

      setProducts((prev) => prev.map((item) => item.id_producto === result.id_producto ? result : item))
      showToast('El producto fue dado de baja. Podés restablecerlo cuando quieras.')
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id_producto)
        return next
      })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function confirmRestore() {
    if (!productPendingRestore || restoreBusy.current) return
    restoreBusy.current = true
    setIsRestoring(true)
    const product = productPendingRestore
    setProductPendingRestore(null)
    try {
      const restored = await restoreProduct(product.id_producto, token)
      setProducts((prev) => prev.map((item) => item.id_producto === restored.id_producto ? restored : item))
      showToast('El producto fue restablecido correctamente.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      restoreBusy.current = false
      setIsRestoring(false)
    }
  }

  function toggleProductSelection(productId) {
    if (isBulkDeleting) return

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  function toggleAllVisible() {
    if (isBulkDeleting) return

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  async function confirmBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    setIsBulkDeletePending(false)
    setIsBulkDeleting(true)

    const results = await Promise.allSettled(ids.map((id) => deleteProduct(id, token)))
    const discontinuedProducts = new Map()
    const failedIds = new Set()
    const failureMessages = new Set()

    results.forEach((result, index) => {
      const id = ids[index]
      if (result.status === 'rejected') {
        failedIds.add(id)
        failureMessages.add(result.reason.message)
      } else {
        discontinuedProducts.set(id, result.value)
      }
    })

    setProducts((prev) => prev
      .map((product) => discontinuedProducts.get(product.id_producto) ?? product))
    setSelectedIds(failedIds)

    const summary = []
    if (discontinuedProducts.size > 0) {
      summary.push(discontinuedProducts.size === 1
        ? '1 inhabilitado'
        : `${discontinuedProducts.size} inhabilitados`)
    }
    if (summary.length > 0) showToast(`${summary.join(', ')}.`)
    if (failedIds.size > 0) {
      const failedSummary = failedIds.size === 1
        ? '1 producto no pudo procesarse.'
        : `${failedIds.size} productos no pudieron procesarse.`
      showToast(`${failedSummary} ${[...failureMessages].join(' ')}`, 'error')
    }

    setIsBulkDeleting(false)
  }

  return (
    <div className="admin-products">
      <div className="admin-products-header">
        <h1>Productos</h1>
        <button type="button" onClick={openCreateForm}>
          Nuevo producto
        </button>
      </div>

      {isLoading && <p className="catalog-message">Cargando productos...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p className="catalog-message">No hay productos para mostrar</p>
      )}

      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="admin-products-toolbar">
            <div className="admin-products-filters">
              <label className="admin-products-search">
                Buscar por nombre
                <input
                  type="search"
                  value={nameFilter}
                  placeholder="Ej. proteína"
                  onChange={(event) => setNameFilter(event.target.value)}
                />
              </label>
              <label className="admin-products-search admin-products-price">
                Precio desde
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  placeholder="0"
                  onChange={(event) => setMinPrice(event.target.value)}
                />
              </label>
              <label className="admin-products-search admin-products-price">
                Precio hasta
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  placeholder="Sin límite"
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
              {(nameFilter || minPrice || maxPrice) && (
                <button type="button" onClick={() => {
                  setNameFilter('')
                  setMinPrice('')
                  setMaxPrice('')
                }}>Limpiar</button>
              )}
              {priceFilterError && <p className="admin-products-filter-error">Ingresá un rango de precio válido.</p>}
            </div>
            <div className="admin-products-bulk-actions">
              <span>{selectedIds.size} seleccionados</span>
              <button
                type="button"
                disabled={selectedIds.size === 0 || isBulkDeleting || isRestoring}
                onClick={() => setIsBulkDeletePending(true)}
              >
                {isBulkDeleting ? 'Eliminando...' : 'Eliminar seleccionados'}
              </button>
            </div>
          </div>

          {priceFilterError ? null : filteredProducts.length === 0 ? (
            <p className="catalog-message">No hay productos que coincidan con los filtros.</p>
          ) : (
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th className="admin-products-checkbox">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      disabled={isBulkDeleting || isRestoring}
                      onChange={toggleAllVisible}
                      aria-label="Seleccionar todos los productos visibles"
                    />
                  </th>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id_producto} className={`product-state-${product.estado ?? 'disponible'}`}>
                    <td className="admin-products-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id_producto)}
                        disabled={isBulkDeleting || isRestoring}
                        onChange={() => toggleProductSelection(product.id_producto)}
                        aria-label={`Seleccionar ${product.nombre}`}
                      />
                    </td>
                    <td className="admin-product-image"><ProductImage product={product} className="admin-product-thumbnail" /></td>
                    <td>{product.nombre}</td>
                    <td>${product.precio}</td>
                    <td>{product.stock}</td>
                    <td><span className="admin-product-status">{product.estado ?? '—'}</span></td>
                    <td className="admin-products-actions">
                      <button type="button" disabled={isBulkDeleting || isRestoring} onClick={() => openEditForm(product)}>
                        Editar
                      </button>
                      {['inhabilitado', 'descontinuado'].includes(product.estado) ? (
                        <button type="button" disabled={isBulkDeleting || isRestoring} onClick={() => setProductPendingRestore(product)}>
                          Restablecer
                        </button>
                      ) : (
                        <button type="button" disabled={isBulkDeleting || isRestoring} onClick={() => requestDelete(product)}>
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {isFormOpen && (
        <ProductForm product={editingProduct} onSubmit={handleFormSubmit} onCancel={closeForm} />
      )}

      {productPendingRestore && (
        <ConfirmModal
          title="Restablecer producto"
          message={`Restablecer "${productPendingRestore.nombre}"? Se habilitar\u00e1 y volver\u00e1 a mostrarse en el cat\u00e1logo.`}
          confirmLabel="Restablecer"
          onConfirm={confirmRestore}
          onCancel={() => setProductPendingRestore(null)}
        />
      )}

      {productPendingDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`Dar de baja "${productPendingDelete.nombre}"? Se ocultar\u00e1 del cat\u00e1logo y podr\u00e1s restablecerlo m\u00e1s adelante.`}
          confirmLabel="Borrar"
          isDanger
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {isBulkDeletePending && (
        <ConfirmModal
          title="Eliminar productos"
          message={`Dar de baja ${selectedIds.size} productos? Se ocultar\u00e1n del cat\u00e1logo y podr\u00e1s restablecerlos m\u00e1s adelante.`}
          confirmLabel="Eliminar seleccionados"
          isDanger
          onConfirm={confirmBulkDelete}
          onCancel={() => setIsBulkDeletePending(false)}
        />
      )}
    </div>
  )
}

export default AdminProducts
