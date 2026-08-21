import { useEffect, useState } from 'react'
import { getProductImageUrl } from '../utils/product-image'

function ProductForm({ product, onSubmit, onCancel }) {
  const isEditing = Boolean(product)

  const [values, setValues] = useState({
    nombre: product?.nombre ?? '',
    descripcion: product?.descripcion ?? '',
    precio: product?.precio ?? '',
    stock: product?.stock ?? '',
    info_nutricional: product?.info_nutricional ?? '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(() => getProductImageUrl(product?.imagen_url))
  const [errors, setErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  function handleChange(field) {
    return (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : getProductImageUrl(product?.imagen_url))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setIsSaving(true)

    try {
      await onSubmit({ ...values, imagen: imageFile })
    } catch (err) {
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
          <input type="text" required value={values.nombre} onChange={handleChange('nombre')} />
        </label>

        <label>
          Descripción
          <textarea value={values.descripcion} onChange={handleChange('descripcion')} />
        </label>

        <label>
          Precio
          <input type="number" min="0" step="0.01" required value={values.precio} onChange={handleChange('precio')} />
        </label>

        <label>
          Stock
          <input type="number" min="0" step="1" required value={values.stock} onChange={handleChange('stock')} />
        </label>

        <label>
          Información nutricional
          <textarea value={values.info_nutricional} onChange={handleChange('info_nutricional')} />
        </label>

        <label>
          Imagen del producto
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
          <span className="product-form-help">JPG, PNG o WebP. Máximo 5 MB.</span>
        </label>

        {imagePreview && <img className="product-form-preview" src={imagePreview} alt="Vista previa de la imagen seleccionada" />}

        {errors.length > 0 && (
          <ul className="product-form-errors">
            {errors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}

        <div className="product-form-actions">
          <button type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button>
          <button type="submit" disabled={isSaving}>{isEditing ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>
    </div>
  )
}

export default ProductForm