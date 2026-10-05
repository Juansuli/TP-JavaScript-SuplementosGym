import { useEffect, useState } from 'react'
import { getClient, updateClient } from '../services/client.service'

// Mismos valores que valida el backend (cliente-validation.middleware.js).
// El "value" es lo que se guarda en la base; el texto es lo que ve el cliente.
const GENDER_OPTIONS = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decirlo' },
]
const GOAL_OPTIONS = [
  { value: 'ganar_masa_muscular', label: 'Ganar masa muscular' },
  { value: 'perder_grasa', label: 'Perder grasa' },
  { value: 'mejorar_rendimiento', label: 'Mejorar el rendimiento' },
  { value: 'salud_general', label: 'Salud general' },
  { value: 'recuperacion', label: 'Recuperación' },
]
const MIN_AGE = 14
const MAX_AGE = 100

// Campos del perfil que son opcionales: si quedan vacíos se mandan como
// null para que el backend los borre.
const OPTIONAL_TEXT_FIELDS = ['fecha_nacimiento', 'genero', 'ocupacion', 'deporte', 'objetivo', 'direccion_entrega']
const OPTIONAL_NUMBER_FIELDS = ['peso_kg', 'altura_cm', 'dias_entrenamiento']

const EMPTY_VALUES = {
  nombre: '',
  apellido: '',
  fecha_nacimiento: '',
  genero: '',
  ocupacion: '',
  peso_kg: '',
  altura_cm: '',
  deporte: '',
  dias_entrenamiento: '',
  objetivo: '',
  direccion_entrega: '',
}

function getAge(birthDateText) {
  const [year, month, day] = birthDateText.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - year
  const birthdayNotReachedYet =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)

  if (birthdayNotReachedYet) age -= 1
  return age
}

// Convierte lo que devuelve la API (números, null, valores viejos que ya no
// están en las listas) en strings que los inputs controlados pueden mostrar.
function toFormValues(client) {
  const values = { ...EMPTY_VALUES }

  Object.keys(EMPTY_VALUES).forEach((field) => {
    if (client[field] !== null && client[field] !== undefined) values[field] = String(client[field])
  })

  if (!GENDER_OPTIONS.some((option) => option.value === values.genero)) values.genero = ''
  if (!GOAL_OPTIONS.some((option) => option.value === values.objetivo)) values.objetivo = ''

  return values
}

function isNumberInRange(text, min, max) {
  const number = Number(text)
  return !Number.isNaN(number) && number >= min && number <= max
}

function ClientProfile({ currentUser, onProfileUpdated, showToast }) {
  const [values, setValues] = useState(EMPTY_VALUES)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitErrors, setSubmitErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const { id_usuario: clientId, token } = currentUser

  // CUU4, paso 2: se piden los datos actuales al backend en vez de usar los
  // guardados en localStorage, que pueden estar desactualizados.
  useEffect(() => {
    let isStale = false

    async function loadProfile() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const client = await getClient(clientId, token)
        if (isStale) return
        setValues(toFormValues(client))
        setEmail(client.email)
      } catch (err) {
        if (!isStale) setLoadError(err.message)
      } finally {
        if (!isStale) setIsLoading(false)
      }
    }

    loadProfile()
    return () => {
      isStale = true
    }
  }, [clientId, token])

  function validateForm() {
    const nextErrors = {}

    const isMissing = (value) =>
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')

    if (isMissing(values.nombre)) nextErrors.nombre = 'El nombre es obligatorio.'
    if (isMissing(values.apellido)) nextErrors.apellido = 'El apellido es obligatorio.'

    if (isMissing(values.fecha_nacimiento)) {
      nextErrors.fecha_nacimiento = 'La fecha de nacimiento es obligatoria.'
    } else {
      const age = getAge(values.fecha_nacimiento)
      if (Number.isNaN(age) || age < MIN_AGE || age > MAX_AGE) {
        nextErrors.fecha_nacimiento = `Tenés que tener entre ${MIN_AGE} y ${MAX_AGE} años.`
      }
    }

    if (isMissing(values.genero)) {
      nextErrors.genero = 'El género es obligatorio.'
    }

    if (isMissing(values.ocupacion)) {
      nextErrors.ocupacion = 'La ocupación es obligatoria.'
    }

    if (isMissing(values.peso_kg)) {
      nextErrors.peso_kg = 'El peso es obligatorio.'
    } else if (!isNumberInRange(values.peso_kg, 20, 300)) {
      nextErrors.peso_kg = 'El peso debe estar entre 20 y 300 kg.'
    }

    if (isMissing(values.altura_cm)) {
      nextErrors.altura_cm = 'La altura es obligatoria.'
    } else if (!isNumberInRange(values.altura_cm, 100, 250)) {
      nextErrors.altura_cm = 'La altura debe estar entre 100 y 250 cm (por ejemplo, 175).'
    }

    if (isMissing(values.deporte)) {
      nextErrors.deporte = 'El deporte o actividad es obligatorio.'
    }

    if (isMissing(values.dias_entrenamiento)) {
      nextErrors.dias_entrenamiento = 'Los días de entrenamiento son obligatorios.'
    } else if (
      !Number.isInteger(Number(values.dias_entrenamiento)) ||
      !isNumberInRange(values.dias_entrenamiento, 0, 7)
    ) {
      nextErrors.dias_entrenamiento = 'Ingresá un número entero entre 0 y 7.'
    }

    if (isMissing(values.objetivo)) {
      nextErrors.objetivo = 'El objetivo es obligatorio.'
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
      else if (normalizedMessage.includes('nacimiento')) nextFieldErrors.fecha_nacimiento = message
      else if (
        normalizedMessage.includes('género') ||
        normalizedMessage.includes('genero')
      ) nextFieldErrors.genero = message
      else if (
        normalizedMessage.includes('ocupación') ||
        normalizedMessage.includes('ocupacion')
      ) nextFieldErrors.ocupacion = message
      else if (normalizedMessage.includes('peso')) nextFieldErrors.peso_kg = message
      else if (normalizedMessage.includes('altura')) nextFieldErrors.altura_cm = message
      else if (normalizedMessage.includes('deporte')) nextFieldErrors.deporte = message
      else if (
        normalizedMessage.includes('días') ||
        normalizedMessage.includes('dias_entrenamiento')
      ) nextFieldErrors.dias_entrenamiento = message
      else if (normalizedMessage.includes('objetivo')) nextFieldErrors.objetivo = message
      else generalErrors.push(message)
    })

    return { nextFieldErrors, generalErrors }
  }

  function buildPayload() {
    const payload = {
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
    }

    OPTIONAL_TEXT_FIELDS.forEach((field) => {
      const text = values[field].trim()
      payload[field] = text === '' ? null : text
    })

    OPTIONAL_NUMBER_FIELDS.forEach((field) => {
      payload[field] = values[field] === '' ? null : Number(values[field])
    })

    return payload
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextFieldErrors = validateForm()
    setFieldErrors(nextFieldErrors)
    setSubmitErrors([])

    if (Object.keys(nextFieldErrors).length > 0) return

    setIsSaving(true)

    try {
      const updatedClient = await updateClient(clientId, buildPayload(), token)
      setValues(toFormValues(updatedClient))
      onProfileUpdated(updatedClient)
      showToast('Tu perfil se guardó correctamente.')
    } catch (err) {
      const { nextFieldErrors: backendFieldErrors, generalErrors } = splitSubmitErrors(err.message.split('\n'))
      setFieldErrors(backendFieldErrors)
      setSubmitErrors(generalErrors)
    } finally {
      setIsSaving(false)
    }
  }

  function renderFieldError(field) {
    if (!fieldErrors[field]) return null
    return <span id={`profile-${field}-error`} className="product-form-field-error">{fieldErrors[field]}</span>
  }

  // Props comunes de accesibilidad para cada input con posible error.
  function errorProps(field) {
    return {
      'aria-invalid': Boolean(fieldErrors[field]),
      'aria-describedby': fieldErrors[field] ? `profile-${field}-error` : undefined,
    }
  }

  const age = values.fecha_nacimiento !== '' ? getAge(values.fecha_nacimiento) : null
  // 'en-CA' formatea como AAAA-MM-DD (lo que espera <input type="date">)
  // usando la fecha local, no la UTC.
  const today = new Date().toLocaleDateString('en-CA')

  return (
    <div className="client-profile">
      <div className="admin-products-header client-profile-header">
        <h1>Mi perfil</h1>
      </div>

      {isLoading && <p className="catalog-message">Cargando tu perfil...</p>}
      {!isLoading && loadError && <p className="catalog-message catalog-error">{loadError}</p>}

      {!isLoading && !loadError && (
        <form className="client-profile-form" noValidate onSubmit={handleSubmit}>
          <p className="client-profile-intro">
            Completá tus datos para que más adelante podamos recomendarte suplementos según tu objetivo.
            La dirección de entrega es opcional.
          </p>

          <fieldset className="client-profile-section">
            <legend>Datos personales</legend>

            <label>
              Nombre
              <input type="text" required value={values.nombre} onChange={handleChange('nombre')} {...errorProps('nombre')} />
              {renderFieldError('nombre')}
            </label>

            <label>
              Apellido
              <input type="text" required value={values.apellido} onChange={handleChange('apellido')} {...errorProps('apellido')} />
              {renderFieldError('apellido')}
            </label>

            <label>
              Email
              <input type="email" value={email} disabled />
            </label>

            <label>
              Fecha de nacimiento
              <input type="date" required max={today} value={values.fecha_nacimiento} onChange={handleChange('fecha_nacimiento')} {...errorProps('fecha_nacimiento')} />
              {renderFieldError('fecha_nacimiento')}
              {!fieldErrors.fecha_nacimiento && age !== null && !Number.isNaN(age) && (
                <span className="product-form-help">Edad: {age} años</span>
              )}
            </label>

            <label>
              Género
              <select required value={values.genero} onChange={handleChange('genero')} {...errorProps('genero')}>
                <option value="">Sin especificar</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {renderFieldError('genero')}
            </label>

            <label>
              Ocupación
              <input
                type="text"
                required
                placeholder="Ej.: estudiante, oficinista"
                value={values.ocupacion}
                onChange={handleChange('ocupacion')}
                {...errorProps('ocupacion')}
              />
              {renderFieldError('ocupacion')}
            </label>
          </fieldset>

          <fieldset className="client-profile-section">
            <legend>Datos físicos</legend>

            <label>
              Peso (kg)
              <input type="number" required min="20" max="300" step="0.1" value={values.peso_kg} onChange={handleChange('peso_kg')} {...errorProps('peso_kg')} />
              {renderFieldError('peso_kg')}
            </label>

            <label>
              Altura (cm)
              <input type="number" required min="100" max="250" step="0.1" placeholder="Ej.: 175" value={values.altura_cm} onChange={handleChange('altura_cm')} {...errorProps('altura_cm')} />
              {renderFieldError('altura_cm')}
            </label>
          </fieldset>

          <fieldset className="client-profile-section">
            <legend>Entrenamiento</legend>

            <label>
              Deporte o actividad
              <input
                type="text"
                required
                placeholder="Ej.: musculación, running"
                value={values.deporte}
                onChange={handleChange('deporte')}
                {...errorProps('deporte')}
              />
              {renderFieldError('deporte')}
            </label>

            <label>
              Días de entrenamiento por semana
              <input type="number" required min="0" max="7" step="1" value={values.dias_entrenamiento} onChange={handleChange('dias_entrenamiento')} {...errorProps('dias_entrenamiento')} />
              {renderFieldError('dias_entrenamiento')}
            </label>

            <label>
              Objetivo
              <select required value={values.objetivo} onChange={handleChange('objetivo')} {...errorProps('objetivo')}>
                <option value="">Sin especificar</option>
                {GOAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {renderFieldError('objetivo')}
            </label>
          </fieldset>

          <fieldset className="client-profile-section">
            <legend>Entrega</legend>

            <label className="client-profile-wide">
              Dirección de entrega
              <input type="text" placeholder="Calle, número, ciudad" value={values.direccion_entrega} onChange={handleChange('direccion_entrega')} />
            </label>
          </fieldset>

          {submitErrors.length > 0 && (
            <ul className="product-form-errors">
              {submitErrors.map((message) => <li key={message}>{message}</li>)}
            </ul>
          )}

          <div className="product-form-actions">
            <button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default ClientProfile
