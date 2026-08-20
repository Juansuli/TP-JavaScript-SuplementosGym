import { useEffect, useRef, useState } from 'react'
import ProductForm from './ProductForm'
import ConfirmModal from './ConfirmModal'
import {
  getProducts,
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
  const [productPendingDelete, setProductPendingDelete] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [isBulkDeletePending, setIsBulkDeletePending] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const selectAllRef = useRef(null)

  const normalizedFilter = nameFilter.trim().toLocaleLowerCase('es')
  const filteredProducts = products.filter((product) => (
    product.nombre.toLocaleLowerCase('es').includes(normalizedFilter)
  ))
  const visibleIds = filteredProducts.map((product) => product.id_producto)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))

  async function loadProducts() {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getProducts()
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

      if (result) {
        // El backend no lo borró: tiene pedidos asociados y lo marcó
        // "descontinuado" en vez de eliminarlo (CUU1).
        setProducts((prev) =>
          prev.map((item) => (item.id_producto === result.id_producto ? result : item))
        )
        showToast(`"${product.nombre}" tiene pedidos asociados: quedó marcado como "descontinuado" en vez de eliminarse.`)
      } else {
        setProducts((prev) => prev.filter((item) => item.id_producto !== product.id_producto))
        showToast(`"${product.nombre}" se eliminó correctamente.`)
      }
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id_producto)
        return next
      })
    } catch (err) {
      showToast(err.message, 'error')
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
    const deletedIds = new Set()
    const discontinuedProducts = new Map()
    const failedIds = new Set()
    const failureMessages = new Set()

    results.forEach((result, index) => {
      const id = ids[index]
      if (result.status === 'rejected') {
        failedIds.add(id)
        failureMessages.add(result.reason.message)
      } else if (result.value) {
        discontinuedProducts.set(id, result.value)
      } else {
        deletedIds.add(id)
      }
    })

    setProducts((prev) => prev
      .filter((product) => !deletedIds.has(product.id_producto))
      .map((product) => discontinuedProducts.get(product.id_producto) ?? product))
    setSelectedIds(failedIds)

    const summary = []
    if (deletedIds.size > 0) {
      summary.push(deletedIds.size === 1 ? '1 eliminado' : `${deletedIds.size} eliminados`)
    }
    if (discontinuedProducts.size > 0) {
      summary.push(discontinuedProducts.size === 1
        ? '1 marcado como descontinuado'
        : `${discontinuedProducts.size} marcados como descontinuados`)
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
        <h1>Administrar productos</h1>
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
            <label className="admin-products-search">
              Buscar por nombre
              <input
                type="search"
                value={nameFilter}
                placeholder="Ej. proteína"
                onChange={(event) => setNameFilter(event.target.value)}
              />
            </label>
            <div className="admin-products-bulk-actions">
              <span>{selectedIds.size} seleccionados</span>
              <button
                type="button"
                disabled={selectedIds.size === 0 || isBulkDeleting}
                onClick={() => setIsBulkDeletePending(true)}
              >
                {isBulkDeleting ? 'Eliminando...' : 'Eliminar seleccionados'}
              </button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="catalog-message">No hay productos que coincidan con la búsqueda.</p>
          ) : (
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th className="admin-products-checkbox">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      disabled={isBulkDeleting}
                      onChange={toggleAllVisible}
                      aria-label="Seleccionar todos los productos visibles"
                    />
                  </th>
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
                        disabled={isBulkDeleting}
                        onChange={() => toggleProductSelection(product.id_producto)}
                        aria-label={`Seleccionar ${product.nombre}`}
                      />
                    </td>
                    <td>{product.nombre}</td>
                    <td>${product.precio}</td>
                    <td>{product.stock}</td>
                    <td><span className="admin-product-status">{product.estado ?? '—'}</span></td>
                    <td className="admin-products-actions">
                      <button type="button" disabled={isBulkDeleting} onClick={() => openEditForm(product)}>
                        Editar
                      </button>
                      <button type="button" disabled={isBulkDeleting} onClick={() => requestDelete(product)}>
                        Eliminar
                      </button>
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

      {productPendingDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Seguro que querés eliminar "${productPendingDelete.nombre}"?`}
          confirmLabel="Eliminar"
          isDanger
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {isBulkDeletePending && (
        <ConfirmModal
          title="Eliminar productos"
          message={`¿Seguro que querés eliminar ${selectedIds.size} productos?`}
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
