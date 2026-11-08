import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App'

const authState = vi.hoisted(() => ({ user: null }))

vi.mock('./components/ProductCatalog', () => ({ default: () => <h1>Catalog screen</h1> }))
vi.mock('./components/AdminProducts', () => ({ default: () => <h1>Products screen</h1> }))
vi.mock('./components/AdminOrders', () => ({ default: () => <h1>Orders screen</h1> }))
vi.mock('./components/AdminClients', () => ({ default: () => <h1>Clients screen</h1> }))
vi.mock('./components/AdminDiscounts', () => ({ default: () => <h1>Discounts screen</h1> }))
vi.mock('./components/AdminAdministrators', () => ({ default: () => <h1>Administrators screen</h1> }))
vi.mock('./components/MyOrders', () => ({ default: () => <h1>Purchases screen</h1> }))
vi.mock('./components/MySuggestions', () => ({ default: () => <h1>Suggestions screen</h1> }))
vi.mock('./components/ClientProfile', () => ({ default: () => <h1>Profile screen</h1> }))
vi.mock('./components/AuthModal', () => ({
  default: ({ onSuccess }) => (
    <button type="button" onClick={() => onSuccess(authState.user)}>Completar ingreso</button>
  ),
}))

function NavigationProbe() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="URL">{pathname}{search}</output><button onClick={() => navigate(-1)}>Back</button></>
}

function renderRoute(path, user) {
  if (user) localStorage.setItem('dosis_current_user', JSON.stringify(user))
  render(<MemoryRouter initialEntries={[path]}><App /><NavigationProbe /></MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  authState.user = null
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

const client = { nombre: 'Cliente', rol: 'cliente', es_cliente: true, token: 'test' }
const disabledClient = { ...client, activo: false }
const admin = { nombre: 'Admin', rol: 'administrador', token: 'test' }

test.each([
  ['/catalogo', null, 'Catalog'],
  ['/mis-compras', client, 'Purchases'],
  ['/mis-sugerencias', client, 'Suggestions'],
  ['/mi-perfil', client, 'Profile'],
  ['/admin/productos', admin, 'Products'],
  ['/admin/pedidos', admin, 'Orders'],
  ['/admin/clientes', admin, 'Clients'],
  ['/admin/descuentos', admin, 'Discounts'],
  ['/admin/administradores', admin, 'Administrators'],
])('opens %s directly with the stored session', (path, user, heading) => {
  renderRoute(path, user)
  expect(screen.getByRole('heading', { name: `${heading} screen` })).toBeInTheDocument()
  expect(screen.getByLabelText('URL')).toHaveTextContent(path)
})

test.each([
  ['/', null], ['/missing', null], ['/mi-perfil', null],
  ['/admin/productos', client],
])('redirects unavailable route %s to the catalog', (path, user) => {
  renderRoute(path, user)
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo')
  expect(screen.getByRole('heading', { name: 'Catalog screen' })).toBeInTheDocument()
})

test('redirects a logged administrator without a client profile to their safe default', () => {
  renderRoute('/mis-compras', admin)
  expect(screen.getByLabelText('URL')).toHaveTextContent('/admin/productos')
  expect(screen.getByRole('heading', { name: 'Products screen' })).toBeInTheDocument()
})

test('redirects a disabled client away from client routes', () => {
  renderRoute('/mis-compras', disabledClient)
  expect(screen.getByLabelText('URL').textContent).toBe('/catalogo')
  expect(screen.getByRole('heading', { name: 'Catalog screen' })).toBeInTheDocument()
})

test('navigation supports browser history and logout leaves protected screens', () => {
  renderRoute('/mi-perfil', client)
  fireEvent.click(screen.getAllByRole('link', { name: 'Mis compras' })[0])
  expect(screen.getByLabelText('URL')).toHaveTextContent('/mis-compras')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('heading', { name: 'Profile screen' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo')
  expect(localStorage.getItem('dosis_current_user')).toBeNull()
})

test('navigation entries are real links with reusable URLs', () => {
  renderRoute('/mi-perfil', client)
  const purchases = screen.getAllByRole('link', { name: 'Mis compras' })[0]
  expect(purchases).toHaveAttribute('href', '/mis-compras')
  expect(screen.getByRole('link', { name: /DOSIS/ })).toHaveAttribute('href', '/catalogo')
})

test('administration entries are links and client-only entries stay hidden', () => {
  renderRoute('/admin/productos', admin)
  expect(screen.getAllByRole('link', { name: 'Productos' })[0]).toHaveAttribute('href', '/admin/productos')
  expect(screen.getAllByRole('link', { name: 'Pedidos' })[0]).toHaveAttribute('href', '/admin/pedidos')
  expect(screen.queryByRole('link', { name: 'Mis compras' })).not.toBeInTheDocument()
})

test('returns to the requested private path and query after login', () => {
  authState.user = client
  renderRoute('/mis-compras?estado=pendiente')
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo')

  fireEvent.click(screen.getAllByRole('button', { name: 'Ingresar' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Completar ingreso' }))

  expect(screen.getByLabelText('URL')).toHaveTextContent('/mis-compras?estado=pendiente')
  expect(screen.getByRole('heading', { name: 'Purchases screen' })).toBeInTheDocument()
})

test('uses a safe default when the logged user cannot access the requested path', () => {
  authState.user = client
  renderRoute('/admin/pedidos?estado=pendiente')

  fireEvent.click(screen.getAllByRole('button', { name: 'Ingresar' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Completar ingreso' }))

  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo')
  expect(screen.getByRole('heading', { name: 'Catalog screen' })).toBeInTheDocument()
})

test('does not return a disabled client to a pending client route', () => {
  authState.user = disabledClient
  renderRoute('/mis-compras?estado=pendiente')

  fireEvent.click(screen.getAllByRole('button', { name: 'Ingresar' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Completar ingreso' }))

  expect(screen.getByLabelText('URL').textContent).toBe('/catalogo')
  expect(screen.getByRole('heading', { name: 'Catalog screen' })).toBeInTheDocument()
})

test('uses the role default after login when there is no pending route', () => {
  authState.user = admin
  renderRoute('/catalogo')

  fireEvent.click(screen.getAllByRole('button', { name: 'Ingresar' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Completar ingreso' }))

  expect(screen.getByLabelText('URL')).toHaveTextContent('/admin/productos')
  expect(screen.getByRole('heading', { name: 'Products screen' })).toBeInTheDocument()
})
