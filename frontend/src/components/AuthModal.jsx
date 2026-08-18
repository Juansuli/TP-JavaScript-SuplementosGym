import { useState } from 'react'
import { login, registerClient } from '../services/auth.service'

// One modal, two modes, so logging in and registering share the same
// email/password fields instead of duplicating a whole form.
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
      <form className="auth-modal" onSubmit={handleSubmit}>
        <h2>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

        {!isLogin && (
          <>
            <label>
              Nombre
              <input type="text" required value={values.nombre} onChange={handleChange('nombre')} />
            </label>
            <label>
              Apellido
              <input type="text" required value={values.apellido} onChange={handleChange('apellido')} />
            </label>
          </>
        )}

        <label>
          Email
          <input type="email" required value={values.email} onChange={handleChange('email')} />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            required
            minLength={8}
            value={values.password}
            onChange={handleChange('password')}
          />
        </label>

        {errors.length > 0 && (
          <ul className="auth-modal-errors">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <div className="auth-modal-actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" disabled={isSaving}>
            {isLogin ? 'Entrar' : 'Registrarme'}
          </button>
        </div>

        <button type="button" className="auth-modal-toggle" onClick={toggleMode} disabled={isSaving}>
          {isLogin ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>
      </form>
    </div>
  )
}

export default AuthModal
