import { useState } from 'react'

const MIN_PASSWORD_LENGTH = 8

// Formulario para crear o editar un administrador (issue #58). Al editar,
// la contraseña es opcional: si queda vacía, se conserva la actual.
function AdminForm({ admin, onSubmit, onCancel }) {
  const isEditing = Boolean(admin)

  const [values, setValues] = useState({
    nombre: admin?.nombre ?? '',
    apellido: admin?.apellido ?? '',
    email: admin?.email ?? '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitErrors, setSubmitErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  function validateForm() {
    const nextErrors = {}

    if (values.nombre.trim() === '') nextErrors.nombre = 'El nombre es obligatorio.'
    if (values.apellido.trim() === '') nextErrors.apellido = 'El apellido es obligatorio.'
    if (!values.email.includes('@')) nextErrors.email = 'Ingresá un email válido.'

    if (!isEditing && values.password === '') {
      nextErrors.password = 'La contraseña es obligatoria.'
    } else if (values.password !== '' && values.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }

    return nextErrors
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

  // El backend devuelve todos los errores juntos; acá se reparten por
  // palabra clave para mostrar cada uno debajo de su campo.
  function splitSubmitErrors(messages) {
    const nextFieldErrors = {}
    const generalErrors = []

    messages.forEach((message) => {
      const normalizedMessage = message.toLocaleLowerCase('es')

      if (normalizedMessage.includes('apellido')) nextFieldErrors.apellido = message
      else if (normalizedMessage.includes('nombre')) nextFieldErrors.nombre = message
      else if (normalizedMessage.includes('email')) nextFieldErrors.email = message
      else if (normalizedMessage.includes('contraseña')) nextFieldErrors.password = message
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

    const payload = {
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      email: values.email.trim(),
    }
    if (values.password !== '') payload.password = values.password

    setIsSaving(true)

    try {
      await onSubmit(payload)
    } catch (err) {
      const { nextFieldErrors: backendFieldErrors, generalErrors } = splitSubmitErrors(err.message.split('\n'))
      setFieldErrors(backendFieldErrors)
      setSubmitErrors(generalErrors)
    } finally {
      setIsSaving(false)
    }
  }

  function renderField(field, label, inputProps) {
    const errorId = `admin-${field}-error`

    return (
      <label>
        {label}
        <input
          {...inputProps}
          value={values[field]}
          onChange={handleChange(field)}
          aria-invalid={Boolean(fieldErrors[field])}
          aria-describedby={fieldErrors[field] ? errorId : undefined}
        />
        {fieldErrors[field] && <span id={errorId} className="product-form-field-error">{fieldErrors[field]}</span>}
      </label>
    )
  }

  return (
    <div className="product-form-overlay">
      <form className="product-form" noValidate onSubmit={handleSubmit}>
        <h2>{isEditing ? 'Editar administrador' : 'Nuevo administrador'}</h2>

        {renderField('nombre', 'Nombre *', { type: 'text', required: true })}
        {renderField('apellido', 'Apellido *', { type: 'text', required: true })}
        {renderField('email', 'Email *', { type: 'email', required: true, autoComplete: 'off' })}
        {renderField('password', isEditing ? 'Nueva contraseña' : 'Contraseña *', {
          type: 'password',
          required: !isEditing,
          autoComplete: 'new-password',
        })}
        <span className="product-form-help">
          {isEditing
            ? 'Dejala vacía para mantener la contraseña actual.'
            : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
        </span>

        {submitErrors.length > 0 && (
          <ul className="product-form-errors">
            {submitErrors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}

        <div className="product-form-actions">
          <button type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button>
          <button type="submit" disabled={isSaving}>{isEditing ? 'Guardar cambios' : 'Crear administrador'}</button>
        </div>
      </form>
    </div>
  )
}

export default AdminForm
