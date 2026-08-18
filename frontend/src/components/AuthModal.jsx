import { useState } from 'react'
import { login, registerClient } from '../services/auth.service'

function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('login')
  const isLogin = mode === 'login'

  const [values, setValues] = useState({ nombre: '', apellido: '', email: '', password: '' })
  const [errors, setErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(field) {
    return (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function toggleMode() {
    setErrors([])
    setMode(isLogin ? 'register' : 'login')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setIsSaving(true)

    try {
      const user = isLogin
        ? await login(values.email, values.password)
        : await registerClient(values)
      onSuccess(user)
    } catch (err) {
      setErrors(err.message.split('\n'))
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

        <form className="auth-modal" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-name-row">
              <label>
                Nombre
                <input type="text" required placeholder="Juan" value={values.nombre} onChange={handleChange('nombre')} />
              </label>
              <label>
                Apellido
                <input type="text" required placeholder="Pérez" value={values.apellido} onChange={handleChange('apellido')} />
              </label>
            </div>
          )}

          <label>
            Email
            <input type="email" required placeholder="tu@email.com" autoComplete="email" value={values.email} onChange={handleChange('email')} />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={values.password}
              onChange={handleChange('password')}
            />
          </label>

          {errors.length > 0 && (
            <ul className="auth-modal-errors">
              {errors.map((message) => <li key={message}>{message}</li>)}
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
