// Unit tests for the "Mi perfil" screen (ClientProfile component).
//
// The component is rendered on its own, without the backend and without a
// real browser: the calls to the API are replaced by fakes (mocks) so each
// test decides what the "backend" answers. Then the test acts like a user
// (types, clicks "Guardar cambios") and checks what appears on screen.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ClientProfile from './ClientProfile'
import { getClient, updateClient } from '../services/client.service'

// Replaces every function of client.service.js with an empty fake, so no
// real HTTP request is ever sent during the tests.
vi.mock('../services/client.service')

const currentUser = { id_usuario: 7, token: 'fake-token' }

// What the backend would return for a client that already filled in the
// whole profile.
const savedClient = {
  id_usuario: 7,
  nombre: 'Lucía',
  apellido: 'Gómez',
  email: 'lucia@example.com',
  fecha_nacimiento: '2000-05-10',
  genero: 'femenino',
  ocupacion: 'Estudiante',
  peso_kg: 60,
  altura_cm: 165,
  deporte: 'Musculación',
  dias_entrenamiento: 4,
  objetivo: 'ganar_masa_muscular',
  direccion_entrega: null,
}

// Renders the component and waits until the profile finished loading.
// onProfileUpdated and showToast are fakes too, so the tests can check
// whether the component called them.
async function renderProfile() {
  const onProfileUpdated = vi.fn()
  const showToast = vi.fn()

  render(
    <ClientProfile
      currentUser={currentUser}
      onProfileUpdated={onProfileUpdated}
      showToast={showToast}
    />,
  )

  // findBy... waits for the element to appear (the load is asynchronous).
  await screen.findByRole('button', { name: 'Guardar cambios' })

  return { onProfileUpdated, showToast }
}

describe('ClientProfile', () => {
  beforeEach(() => {
    // Forget the calls recorded by the previous test.
    vi.clearAllMocks()
    getClient.mockResolvedValue(savedClient)
  })

  test('loads the client data from the backend and shows it in the form', async () => {
    await renderProfile()

    expect(getClient).toHaveBeenCalledWith(7, 'fake-token')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Lucía')
    expect(screen.getByLabelText('Email')).toHaveValue('lucia@example.com')
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue(60)
  })

  test('shows "El peso es obligatorio." and does not save when the weight is empty', async () => {
    const user = userEvent.setup()
    await renderProfile()

    await user.clear(screen.getByLabelText('Peso (kg)'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByText('El peso es obligatorio.')).toBeInTheDocument()
    // The form must stop before talking to the backend.
    expect(updateClient).not.toHaveBeenCalled()
  })

  test('rejects a weight outside the allowed range (20 to 300 kg)', async () => {
    const user = userEvent.setup()
    await renderProfile()

    const weightInput = screen.getByLabelText('Peso (kg)')
    await user.clear(weightInput)
    await user.type(weightInput, '-5')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByText('El peso debe estar entre 20 y 300 kg.')).toBeInTheDocument()
    expect(updateClient).not.toHaveBeenCalled()
  })

  test('the error disappears as soon as the user fixes the field', async () => {
    const user = userEvent.setup()
    await renderProfile()

    const weightInput = screen.getByLabelText('Peso (kg)')
    await user.clear(weightInput)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByText('El peso es obligatorio.')).toBeInTheDocument()

    await user.type(weightInput, '70')

    // queryBy... returns null instead of failing when nothing is found.
    expect(screen.queryByText('El peso es obligatorio.')).not.toBeInTheDocument()
  })

  test('saves valid data, sending numbers to the backend and confirming with a message', async () => {
    const user = userEvent.setup()
    const updatedClient = { ...savedClient, peso_kg: 62.5 }
    updateClient.mockResolvedValue(updatedClient)
    const { onProfileUpdated, showToast } = await renderProfile()

    const weightInput = screen.getByLabelText('Peso (kg)')
    await user.clear(weightInput)
    await user.type(weightInput, '62.5')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // The input holds the text "62.5"; the component must send the number 62.5.
    expect(updateClient).toHaveBeenCalledTimes(1)
    const [clientId, payload, token] = updateClient.mock.calls[0]
    expect(clientId).toBe(7)
    expect(token).toBe('fake-token')
    expect(payload.peso_kg).toBe(62.5)
    // The optional address stays empty, so it is sent as null.
    expect(payload.direccion_entrega).toBeNull()

    expect(onProfileUpdated).toHaveBeenCalledWith(updatedClient)
    expect(showToast).toHaveBeenCalledWith('Tu perfil se guardó correctamente.')
  })

  test('shows the backend error under the matching field when saving fails', async () => {
    const user = userEvent.setup()
    updateClient.mockRejectedValue(new Error('La altura debe ser un número válido.'))
    await renderProfile()

    // Looked up before saving: once the error appears, its text becomes part
    // of the label and "Altura (cm)" no longer matches exactly.
    const heightInput = screen.getByLabelText('Altura (cm)')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('La altura debe ser un número válido.')).toBeInTheDocument()
    expect(heightInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('shows an error message when the profile cannot be loaded', async () => {
    getClient.mockRejectedValue(new Error('No se pudo conectar con el servidor.'))

    render(
      <ClientProfile currentUser={currentUser} onProfileUpdated={vi.fn()} showToast={vi.fn()} />,
    )

    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })
})
