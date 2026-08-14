import { useEffect, useState } from 'react'
import ProductForm from './ProductForm'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service'

function AdminProducts() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

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

  function openCreateForm() {
    setActionError(null)
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  function openEditForm(product) {
    setActionError(null)
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
      const updated = await updateProduct(editingProduct.id_producto, payload)
      setProducts((prev) =>
        prev.map((product) => (product.id_producto === updated.id_producto ? updated : product))
      )
      setNotice(`"${updated.nombre}" se actualizó correctamente.`)
    } else {
      const created = await createProduct(payload)
      setProducts((prev) => [...prev, created])
      setNotice(`"${created.nombre}" se creó correctamente.`)
    }

    closeForm()
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`¿Seguro que querés eliminar "${product.nombre}"?`)
    if (!confirmed) return

    setNotice(null)
    setActionError(null)

    try {
      const result = await deleteProduct(product.id_producto)

      if (result) {
        // El backend no lo borró: tiene pedidos asociados y lo marcó
        // "descontinuado" en vez de eliminarlo (CUU1).
        setProducts((prev) =>
          prev.map((item) => (item.id_producto === result.id_producto ? result : item))
        )
        setNotice(`"${product.nombre}" tiene pedidos asociados: quedó marcado como "descontinuado" en vez de eliminarse.`)
      } else {
        setProducts((prev) => prev.filter((item) => item.id_producto !== product.id_producto))
        setNotice(`"${product.nombre}" se eliminó correctamente.`)
      }
    } catch (err) {
      // A propósito no usa `error`: ese estado esconde la tabla entera
      // (ver más abajo), y un borrado fallido no debería tapar la lista
      // de productos que ya se había cargado bien.
      setActionError(err.message)
    }
  }

  return (
    <div className="admin-products">
      <div className="admin-products-header">
        <h1>Administrar productos</h1>
        <button type="button" onClick={openCreateForm}>
          Nuevo producto
        </button>
      </div>

      {notice && <p className="admin-products-notice">{notice}</p>}
      {actionError && <p className="admin-products-notice admin-products-notice-error">{actionError}</p>}
      {isLoading && <p className="catalog-message">Cargando productos...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p className="catalog-message">No hay productos para mostrar</p>
      )}

      {!isLoading && !error && products.length > 0 && (
        <table className="admin-products-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id_producto}>
                <td>{product.nombre}</td>
                <td>${product.precio}</td>
                <td>{product.stock}</td>
                <td>{product.estado ?? '—'}</td>
                <td className="admin-products-actions">
                  <button type="button" onClick={() => openEditForm(product)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(product)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isFormOpen && (
        <ProductForm product={editingProduct} onSubmit={handleFormSubmit} onCancel={closeForm} />
      )}
    </div>
  )
}

export default AdminProducts
