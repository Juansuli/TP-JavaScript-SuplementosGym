import { useState } from 'react'

function ProductForm({ product, onSubmit, onCancel }) {
  const isEditing = Boolean(product)

  const [values, setValues] = useState({
    nombre: product?.nombre ?? '',
    descripcion: product?.descripcion ?? '',
    precio: product?.precio ?? '',
    stock: product?.stock ?? '',
    info_nutricional: product?.info_nutricional ?? '',
  })
  const [errors, setErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(field) {
    return (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setIsSaving(true)

    try {
      await onSubmit(values)
    } catch (err) {
      // El servicio junta todos los mensajes del backend en un solo
      // string separado por saltos de línea (ver parseErrorMessage en
      // product.service.js) — acá se separan de nuevo para mostrarlos
      // como lista, no como un párrafo pegado.
      setErrors(err.message.split('\n'))
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
          <input
            type="text"
            required
            value={values.nombre}
            onChange={handleChange('nombre')}
          />
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
            required
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
            required
            value={values.stock}
            onChange={handleChange('stock')}
          />
        </label>

        <label>
          Información nutricional
          <textarea value={values.info_nutricional} onChange={handleChange('info_nutricional')} />
        </label>

        {errors.length > 0 && (
          <ul className="product-form-errors">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

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
