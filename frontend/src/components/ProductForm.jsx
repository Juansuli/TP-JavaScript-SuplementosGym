import { useState } from 'react'

// Placeholder form so the admin panel is testable end-to-end. Sol owns
// this component (Parte 1) — she can rework the fields/validation UI
// freely as long as it keeps this same contract: product (null when
// creating), onSubmit(values) and onCancel().
function ProductForm({ product, onSubmit, onCancel }) {
  const isEditing = Boolean(product)

  const [values, setValues] = useState({
    nombre: product?.nombre ?? '',
    descripcion: product?.descripcion ?? '',
    precio: product?.precio ?? '',
    stock: product?.stock ?? '',
    info_nutricional: product?.info_nutricional ?? '',
  })
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(field) {
    return (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      await onSubmit(values)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="product-form-overlay">
      <form className="product-form" onSubmit={handleSubmit}>
        <h2>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h2>

        <label>
          Nombre
          <input type="text" value={values.nombre} onChange={handleChange('nombre')} />
        </label>

        <label>
          Descripción
          <textarea value={values.descripcion} onChange={handleChange('descripcion')} />
        </label>

        <label>
          Precio
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.precio}
            onChange={handleChange('precio')}
          />
        </label>

        <label>
          Stock
          <input
            type="number"
            min="0"
            step="1"
            value={values.stock}
            onChange={handleChange('stock')}
          />
        </label>

        <label>
          Información nutricional
          <textarea value={values.info_nutricional} onChange={handleChange('info_nutricional')} />
        </label>

        {error && <p className="product-form-error">{error}</p>}

        <div className="product-form-actions">
          <button type="button" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" disabled={isSaving}>
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductForm
