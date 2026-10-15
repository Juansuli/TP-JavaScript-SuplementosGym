import { useEffect, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from '../services/descuento.service'

const EMPTY_FORM = { categoria: '', porcentaje: '' }

function AdminDiscounts({ token, showToast }) {
  const [discounts, setDiscounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [discountPendingDelete, setDiscountPendingDelete] = useState(null)

  useEffect(() => {
    let isStale = false

    async function loadDiscounts() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getDiscounts(token)
        if (!isStale) setDiscounts(data)
      } catch (err) {
        if (!isStale) setError(err.message)
      } finally {
        if (!isStale) setIsLoading(false)
      }
    }

    loadDiscounts()
    return () => {
      isStale = true
    }
  }, [token])

  function resetForm() {
    setEditingDiscount(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function openEditForm(discount) {
    setEditingDiscount(discount)
    setForm({ categoria: discount.categoria, porcentaje: String(discount.porcentaje) })
    setFormError(null)
  }

  function validateForm() {
    const category = form.categoria.trim()
    const percentage = Number(form.porcentaje)

    if (category.length < 2 || category.length > 50) {
      return 'La categoría debe tener entre 2 y 50 caracteres.'
    }

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return 'El porcentaje debe ser mayor que 0 y menor o igual a 100.'
    }

    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      const data = { porcentaje: Number(form.porcentaje) }
      if (editingDiscount) {
        const updated = await updateDiscount(editingDiscount.categoria, data, token)
        setDiscounts((current) => current.map((discount) => (
          discount.categoria === updated.categoria ? updated : discount
        )))
        showToast(`La categoría ${updated.categoria} se actualizó correctamente.`)
      } else {
        const created = await createDiscount({ ...data, categoria: form.categoria }, token)
        setDiscounts((current) => [...current, created].sort((first, second) => (
          first.categoria.localeCompare(second.categoria, 'es')
        )))
        showToast(`La categoría ${created.categoria} se creó correctamente.`)
      }

      resetForm()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete() {
    const discount = discountPendingDelete
    if (!discount) return

    setDiscountPendingDelete(null)
    try {
      await deleteDiscount(discount.categoria, token)
      setDiscounts((current) => current.filter((item) => item.categoria !== discount.categoria))
      if (editingDiscount?.categoria === discount.categoria) resetForm()
      showToast(`La categoría ${discount.categoria} se eliminó correctamente.`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="admin-discounts">
      <div className="admin-products-header admin-discounts-header">
        <h1>Administrar descuentos</h1>
      </div>

      <form className="discount-form" onSubmit={handleSubmit} noValidate>
        <h2>{editingDiscount ? 'Editar descuento' : 'Nueva categoría'}</h2>
        <label>
          Categoría
          <input
            type="text"
            value={form.categoria}
            disabled={Boolean(editingDiscount)}
            maxLength="50"
            placeholder="Ej. VIP"
            onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
          />
        </label>
        <label>
          Porcentaje
          <input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={form.porcentaje}
            placeholder="Ej. 15"
            onChange={(event) => setForm((current) => ({ ...current, porcentaje: event.target.value }))}
          />
        </label>
        {formError && <p className="discount-form-error" role="alert">{formError}</p>}
        <div className="discount-form-actions">
          {editingDiscount && <button type="button" onClick={resetForm}>Cancelar</button>}
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : editingDiscount ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </form>

      {isLoading && <p className="catalog-message">Cargando descuentos...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && discounts.length === 0 && (
        <p className="catalog-message">No hay categorías de descuento para mostrar.</p>
      )}

      {!isLoading && !error && discounts.length > 0 && (
        <table className="admin-discounts-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Porcentaje</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.categoria}>
                <td>{discount.categoria}</td>
                <td>{discount.porcentaje}%</td>
                <td className="admin-discounts-actions">
                  <button type="button" onClick={() => openEditForm(discount)}>Editar</button>
                  <button type="button" onClick={() => setDiscountPendingDelete(discount)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {discountPendingDelete && (
        <ConfirmModal
          title="Eliminar categoría"
          message={`¿Seguro que querés eliminar la categoría ${discountPendingDelete.categoria}?`}
          confirmLabel="Eliminar"
          isDanger
          onConfirm={confirmDelete}
          onCancel={() => setDiscountPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default AdminDiscounts
