// Unit tests for the administrator-management screen (issue #58).
// The API calls are replaced by mocks, same as ClientProfile.test.jsx.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import AdminAdministrators from './AdminAdministrators'
import { getAdmins, createAdmin, updateAdmin, setAdminStatus } from '../services/admin.service'

vi.mock('../services/admin.service')

const currentUser = { id_usuario: 1, token: 'fake-token' }

const admins = [
  { id_usuario: 1, rol: 'administrador', nombre: 'Ana', apellido: 'Paz', email: 'ana@dosis.com', activo: true },
  { id_usuario: 2, rol: 'administrador', nombre: 'Beto', apellido: 'Gil', email: 'beto@dosis.com', activo: true },
]

async function renderAdmins() {
  const showToast = vi.fn()
  const onSelfUpdated = vi.fn()

  render(<AdminAdministrators currentUser={currentUser} showToast={showToast} onSelfUpdated={onSelfUpdated} />)
  await screen.findByText('beto@dosis.com')

  return { showToast, onSelfUpdated }
}

function getRow(email) {
  return screen.getByText(email).closest('tr')
}

describe('AdminAdministrators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdmins.mockResolvedValue(admins)
  })

  test('lists the administrators and does not let the current one disable themselves', async () => {
    await renderAdmins()

    expect(getAdmins).toHaveBeenCalledWith('fake-token')
    expect(within(getRow('ana@dosis.com')).getByRole('button', { name: 'Inhabilitar' })).toBeDisabled()
    expect(within(getRow('beto@dosis.com')).getByRole('button', { name: 'Inhabilitar' })).toBeEnabled()
  })

  test('creates an administrator and adds it to the table', async () => {
    const user = userEvent.setup()
    createAdmin.mockResolvedValue({
      id_usuario: 3, rol: 'administrador', nombre: 'Caro', apellido: 'Sosa', email: 'caro@dosis.com', activo: true,
    })
    const { showToast } = await renderAdmins()

    await user.click(screen.getByRole('button', { name: 'Nuevo administrador' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Caro')
    await user.type(screen.getByLabelText('Apellido *'), 'Sosa')
    await user.type(screen.getByLabelText('Email *'), 'caro@dosis.com')
    await user.type(screen.getByLabelText('Contraseña *'), 'clave-segura')
    await user.click(screen.getByRole('button', { name: 'Crear administrador' }))

    expect(createAdmin).toHaveBeenCalledWith(
      { nombre: 'Caro', apellido: 'Sosa', email: 'caro@dosis.com', password: 'clave-segura' },
      'fake-token',
    )
    expect(await screen.findByText('caro@dosis.com')).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith('Caro Sosa ahora es administrador.')
  })

  test('requires a password of at least 8 characters to create an administrator', async () => {
    const user = userEvent.setup()
    await renderAdmins()

    await user.click(screen.getByRole('button', { name: 'Nuevo administrador' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Caro')
    await user.type(screen.getByLabelText('Apellido *'), 'Sosa')
    await user.type(screen.getByLabelText('Email *'), 'caro@dosis.com')
    await user.type(screen.getByLabelText('Contraseña *'), 'corta')
    await user.click(screen.getByRole('button', { name: 'Crear administrador' }))

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    expect(createAdmin).not.toHaveBeenCalled()
  })

  test('rejects an incomplete email and a password made only of spaces', async () => {
    const user = userEvent.setup()
    await renderAdmins()

    await user.click(screen.getByRole('button', { name: 'Nuevo administrador' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Caro')
    await user.type(screen.getByLabelText('Apellido *'), 'Sosa')
    await user.type(screen.getByLabelText('Email *'), 'a@b')
    await user.type(screen.getByLabelText('Contraseña *'), '          ')
    await user.click(screen.getByRole('button', { name: 'Crear administrador' }))

    expect(screen.getByText('Ingresá un email válido (por ejemplo, nombre@dosis.com).')).toBeInTheDocument()
    expect(screen.getByText('La contraseña no puede tener solo espacios.')).toBeInTheDocument()
    expect(createAdmin).not.toHaveBeenCalled()
  })

  test('editing without a new password keeps the current one', async () => {
    const user = userEvent.setup()
    updateAdmin.mockResolvedValue({ ...admins[1], nombre: 'Roberto' })
    await renderAdmins()

    await user.click(within(getRow('beto@dosis.com')).getByRole('button', { name: 'Editar' }))
    const nameInput = screen.getByLabelText('Nombre *')
    await user.clear(nameInput)
    await user.type(nameInput, 'Roberto')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateAdmin).toHaveBeenCalledWith(
      2,
      { nombre: 'Roberto', apellido: 'Gil', email: 'beto@dosis.com' },
      'fake-token',
    )
    expect(await screen.findByText(/Roberto/)).toBeInTheDocument()
  })

  test('editing their own data updates the logged-in user', async () => {
    const user = userEvent.setup()
    const updatedSelf = { ...admins[0], nombre: 'Anita' }
    updateAdmin.mockResolvedValue(updatedSelf)
    const { onSelfUpdated } = await renderAdmins()

    await user.click(within(getRow('ana@dosis.com')).getByRole('button', { name: 'Editar' }))
    const nameInput = screen.getByLabelText('Nombre *')
    await user.clear(nameInput)
    await user.type(nameInput, 'Anita')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSelfUpdated).toHaveBeenCalledWith(updatedSelf)
  })

  test('asks for confirmation before disabling another administrator', async () => {
    const user = userEvent.setup()
    setAdminStatus.mockResolvedValue({ ...admins[1], activo: false })
    await renderAdmins()

    await user.click(within(getRow('beto@dosis.com')).getByRole('button', { name: 'Inhabilitar' }))
    expect(setAdminStatus).not.toHaveBeenCalled()

    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Inhabilitar' }))

    expect(setAdminStatus).toHaveBeenCalledWith(2, false, 'fake-token')
    expect(await within(getRow('beto@dosis.com')).findByText('Inhabilitado')).toBeInTheDocument()
  })

  test('shows the backend error when the email is already in use', async () => {
    const user = userEvent.setup()
    createAdmin.mockRejectedValue(new Error('Ya existe un usuario con ese email.'))
    await renderAdmins()

    await user.click(screen.getByRole('button', { name: 'Nuevo administrador' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Caro')
    await user.type(screen.getByLabelText('Apellido *'), 'Sosa')
    await user.type(screen.getByLabelText('Email *'), 'beto@dosis.com')
    await user.type(screen.getByLabelText('Contraseña *'), 'clave-segura')
    await user.click(screen.getByRole('button', { name: 'Crear administrador' }))

    expect(await screen.findByText('Ya existe un usuario con ese email.')).toBeInTheDocument()
  })
})
