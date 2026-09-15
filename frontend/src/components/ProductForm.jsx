import { useEffect, useState } from 'react'
import { getProductImageUrl } from '../utils/product-image'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

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
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitErrors, setSubmitErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  function validateForm() {
    const nextErrors = {}

    if (values.nombre.trim() === '') {
      nextErrors.nombre = 'El nombre es obligatorio.'
    }

    if (values.precio === '' || Number.isNaN(Number(values.precio)) || Number(values.precio) < 0) {
      nextErrors.precio = 'El precio debe ser un número mayor o igual a 0.'
    }

    if (values.stock === '' || !Number.isInteger(Number(values.stock)) || Number(values.stock) < 0) {
      nextErrors.stock = 'El stock debe ser un número entero mayor o igual a 0.'
    }

    const imageError = validateImage(imageFile)
    if (imageError) nextErrors.imagen = imageError

    return nextErrors
  }

  function validateImage(file) {
    if (!file) return null

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return 'La imagen debe ser JPG, PNG o WebP.'
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'La imagen no puede superar los 5 MB.'
    }

    return null
  }

  function handleChange(field) {
    return (event) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
      setFieldErrors((prev) => {
        if (!prev[field]) return prev

        const nextErrors = { ...prev }
        delete nextErrors[field]
        return nextErrors
      })
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] ?? null
    const imageError = validateImage(file)

    setImageFile(file)
    setImagePreview(imageError || !file ? getProductImageUrl(product?.imagen_url) : URL.createObjectURL(file))
    setFieldErrors((prev) => {
      const nextErrors = { ...prev }

      if (imageError) nextErrors.imagen = imageError
      else delete nextErrors.imagen

      return nextErrors
    })
  }

  function splitSubmitErrors(messages) {
    const nextFieldErrors = {}
    const generalErrors = []

    messages.forEach((message) => {
      const normalizedMessage = message.toLocaleLowerCase('es')

      if (normalizedMessage.includes('nombre')) nextFieldErrors.nombre = message
      else if (normalizedMessage.includes('precio')) nextFieldErrors.precio = message
      else if (normalizedMessage.includes('stock')) nextFieldErrors.stock = message
      else if (normalizedMessage.includes('imagen')) nextFieldErrors.imagen = message
      else generalErrors.push(message)
    })

    return { nextFieldErrors, generalErrors }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextFieldErrors = validateForm()
    setFieldErrors(nextFieldErrors)
    setSubmitErrors([])

    if (Object.keys(nextFieldErrors).length > 0) return

    setIsSaving(true)

    try {
      await onSubmit({ ...values, imagen: imageFile })
    } catch (err) {
      const { nextFieldErrors: backendFieldErrors, generalErrors } = splitSubmitErrors(err.message.split('\n'))
      setFieldErrors(backendFieldErrors)
      setSubmitErrors(generalErrors)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="product-form-overlay">
      <form className="product-form" noValidate onSubmit={handleSubmit}>
        <h2>{isEditing ? 'Editar producto' : 'Nuevo producto'}</h2>

        <label>
          Nombre
          <input
            type="text"
            required
            aria-invalid={Boolean(fieldErrors.nombre)}
            aria-describedby={fieldErrors.nombre ? 'product-name-error' : undefined}
            value={values.nombre}
            onChange={handleChange('nombre')}
          />
          {fieldErrors.nombre && <span id="product-name-error" className="product-form-field-error">{fieldErrors.nombre}</span>}
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
            aria-invalid={Boolean(fieldErrors.precio)}
            aria-describedby={fieldErrors.precio ? 'product-price-error' : undefined}
            value={values.precio}
            onChange={handleChange('precio')}
          />
          {fieldErrors.precio && <span id="product-price-error" className="product-form-field-error">{fieldErrors.precio}</span>}
        </label>

        <label>
          Stock
          <input
            type="number"
            min="0"
            step="1"
            required
            aria-invalid={Boolean(fieldErrors.stock)}
            aria-describedby={fieldErrors.stock ? 'product-stock-error' : undefined}
            value={values.stock}
            onChange={handleChange('stock')}
          />
          {fieldErrors.stock && <span id="product-stock-error" className="product-form-field-error">{fieldErrors.stock}</span>}
        </label>

        <label>
          Información nutricional
          <textarea value={values.info_nutricional} onChange={handleChange('info_nutricional')} />
        </label>

        <label>
          Imagen del producto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-invalid={Boolean(fieldErrors.imagen)}
            aria-describedby={fieldErrors.imagen ? 'product-image-error' : undefined}
            onChange={handleImageChange}
          />
          {fieldErrors.imagen && <span id="product-image-error" className="product-form-field-error">{fieldErrors.imagen}</span>}
          <span className="product-form-help">JPG, PNG o WebP. Máximo 5 MB.</span>
        </label>

        {imagePreview && <img className="product-form-preview" src={imagePreview} alt="Vista previa de la imagen seleccionada" />}

        {submitErrors.length > 0 && (
          <ul className="product-form-errors">
            {submitErrors.map((message) => <li key={message}>{message}</li>)}
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