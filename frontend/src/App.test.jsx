import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App'

vi.mock('./components/ProductCatalog', () => ({ default: () => <h1>Catalog screen</h1> }))
vi.mock('./components/AdminProducts', () => ({ default: () => <h1>Products screen</h1> }))
vi.mock('./components/AdminOrders', () => ({ default: () => <h1>Orders screen</h1> }))
vi.mock('./components/AdminClients', () => ({ default: () => <h1>Clients screen</h1> }))
vi.mock('./components/AdminDiscounts', () => ({ default: () => <h1>Discounts screen</h1> }))
vi.mock('./components/AdminAdministrators', () => ({ default: () => <h1>Administrators screen</h1> }))
vi.mock('./components/MyOrders', () => ({ default: () => <h1>Purchases screen</h1> }))
vi.mock('./components/MySuggestions', () => ({ default: () => <h1>Suggestions screen</h1> }))
vi.mock('./components/ClientProfile', () => ({ default: () => <h1>Profile screen</h1> }))

function NavigationProbe() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="URL">{pathname}</output><button onClick={() => navigate(-1)}>Back</button></>
}

function renderRoute(path, user) {
  if (user) localStorage.setItem('dosis_current_user', JSON.stringify(user))
  render(<MemoryRouter initialEntries={[path]}><App /><NavigationProbe /></MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

const client = { nombre: 'Cliente', rol: 'cliente', es_cliente: true, token: 'test' }
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
  ['/admin/productos', client], ['/mis-compras', admin],
])('redirects unavailable route %s to the catalog', (path, user) => {
  renderRoute(path, user)
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo')
  expect(screen.getByRole('heading', { name: 'Catalog screen' })).toBeInTheDocument()
})

test('navigation supports browser history and logout leaves protected screens', () => {
  renderRoute('/mi-perfil', client)
  fireEvent.click(screen.getAllByRole('button', { name: 'Mis compras' })[0])
  expect(screen.getByLabelText('URL')).toHaveTextContent('/mis-compras')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('heading', { name: 'Profile screen' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo')
  expect(localStorage.getItem('dosis_current_user')).toBeNull()
})
