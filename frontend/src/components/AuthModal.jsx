import { useState } from 'react'
import { login, registerClient } from '../services/auth.service'

function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('login')
  const isLogin = mode === 'login'

  const [values, setValues] = useState({ nombre: '', apellido: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitErrors, setSubmitErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  function validateForm() {
    const nextErrors = {}
    if (!isLogin && values.nombre.trim() === '') nextErrors.nombre = 'El nombre es obligatorio.'
    if (!isLogin && values.apellido.trim() === '') nextErrors.apellido = 'El apellido es obligatorio.'
    if (values.email.trim() === '' || !values.email.includes('@')) nextErrors.email = 'El email es obligatorio y debe ser válido.'
    if (values.password.length < 8) nextErrors.password = 'La contraseña debe tener al menos 8 caracteres.'
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

  function splitSubmitErrors(messages) {
    const nextFieldErrors = {}
    const generalErrors = []
    messages.forEach((message) => {
      const normalizedMessage = message.toLocaleLowerCase('es')
      if (normalizedMessage.includes('email o')) generalErrors.push(message)
      else if (normalizedMessage.includes('email')) nextFieldErrors.email = message
      else if (normalizedMessage.includes('nombre')) nextFieldErrors.nombre = message
      else if (normalizedMessage.includes('apellido')) nextFieldErrors.apellido = message
      else if (normalizedMessage.includes('contrase')) nextFieldErrors.password = message
      else generalErrors.push(message)
    })
    return { nextFieldErrors, generalErrors }
  }

  function toggleMode() {
    setFieldErrors({})
    setSubmitErrors([])
    setMode(isLogin ? 'register' : 'login')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextFieldErrors = validateForm()
    setFieldErrors(nextFieldErrors)
    setSubmitErrors([])
    if (Object.keys(nextFieldErrors).length > 0) return
    setIsSaving(true)
    try {
      const user = isLogin ? await login(values.email, values.password) : await registerClient(values)
      onSuccess(user)
    } catch (err) {
      const { nextFieldErrors: backendFieldErrors, generalErrors } = splitSubmitErrors(err.message.split('\n'))
      setFieldErrors(backendFieldErrors)
      setSubmitErrors(generalErrors)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-shell" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="modal-close" onClick={onClose} disabled={isSaving} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <p className="eyebrow">Cuenta</p>
        <h2 id="auth-title">Bienvenido a DOSIS</h2>

        <div className="auth-tabs" aria-label="Elegir acceso o registro">
          <button type="button" className={isLogin ? 'is-active' : ''} onClick={!isLogin ? toggleMode : undefined}>
            Ingresar
          </button>
          <button type="button" className={!isLogin ? 'is-active' : ''} onClick={isLogin ? toggleMode : undefined}>
            Crear cuenta
          </button>
        </div>

        <form className="auth-modal" noValidate onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-name-row">
              <label>
                Nombre
                <input type="text" required aria-invalid={Boolean(fieldErrors.nombre)} aria-describedby={fieldErrors.nombre ? 'auth-name-error' : undefined} placeholder="Juan" value={values.nombre} onChange={handleChange('nombre')} />
                {fieldErrors.nombre && <span id="auth-name-error" className="auth-field-error">{fieldErrors.nombre}</span>}
              </label>
              <label>
                Apellido
                <input type="text" required aria-invalid={Boolean(fieldErrors.apellido)} aria-describedby={fieldErrors.apellido ? 'auth-last-name-error' : undefined} placeholder="Pérez" value={values.apellido} onChange={handleChange('apellido')} />
                {fieldErrors.apellido && <span id="auth-last-name-error" className="auth-field-error">{fieldErrors.apellido}</span>}
              </label>
            </div>
          )}

          <label>
            Email
            <input type="email" required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined} placeholder="tu@email.com" autoComplete="email" value={values.email} onChange={handleChange('email')} />
            {fieldErrors.email && <span id="auth-email-error" className="auth-field-error">{fieldErrors.email}</span>}
          </label>

          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={values.password}
              onChange={handleChange('password')}
            />
            {fieldErrors.password && <span id="auth-password-error" className="auth-field-error">{fieldErrors.password}</span>}
          </label>

          {submitErrors.length > 0 && (
          <ul className="auth-modal-errors">
            {submitErrors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}

          <div className="auth-modal-actions">
            <button type="button" onClick={onClose} disabled={isSaving}>Cancelar</button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Procesando...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AuthModal
