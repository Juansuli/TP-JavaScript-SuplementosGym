import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import ProductCatalog from './ProductCatalog'
import { getProducts, getProductById } from '../services/product.service'
import { getProductSlug } from '../utils/product-slug'

vi.mock('../services/product.service')
const product = { id_producto: 1, nombre: 'Whey Protein', precio: 100, stock: 5, estado: 'disponible' }
function Probe() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="URL">{location.pathname}</output><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button></>
}
function open(path = '/catalogo') {
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/catalogo/:productSlug?" element={<ProductCatalog cartQuantities={{}} showToast={vi.fn()} />} /></Routes><Probe /></MemoryRouter>)
}
beforeEach(() => {
  vi.clearAllMocks()
  getProducts.mockResolvedValue([product])
  getProductById.mockResolvedValue(product)
})

test('detail changes the URL and browser history restores it', async () => {
  open()
  fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }))
  expect(await screen.findByRole('dialog')).toHaveTextContent('Whey Protein')
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo/whey-protein')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
  expect(screen.getByLabelText('URL').textContent).toBe('/catalogo')
})

test('direct URL loads product details from the API', async () => {
  open('/catalogo/whey-protein')
  expect(await screen.findByRole('dialog')).toHaveTextContent('Whey Protein')
  expect(getProductById).toHaveBeenCalledWith(1)
})

test('unknown product shows a message and a way back', async () => {
  open('/catalogo/no-existe')
  expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el producto.')
  expect(getProductById).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Volver al catálogo' }))
  expect(screen.getByLabelText('URL').textContent).toBe('/catalogo')
})

test('detail request errors are visible', async () => {
  getProductById.mockRejectedValue(new Error('Error de conexión'))
  open('/catalogo/whey-protein')
  expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión')
})

test('slugs normalize accents and resolve repeated names', () => {
  const products = [product, { ...product, id_producto: 2 }, { ...product, id_producto: 3, nombre: 'Proteína & Café' }]
  expect(getProductSlug(products[0], products)).toBe('whey-protein')
  expect(getProductSlug(products[1], products)).toBe('whey-protein-2')
  expect(getProductSlug(products[2], products)).toBe('proteina-cafe')
})
