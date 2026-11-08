import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import ProductCatalog from './ProductCatalog'
import { getProducts, getProductById } from '../services/product.service'
import { findProductBySlug, getProductSlug } from '../utils/product-slug'

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
  const detailLink = await screen.findByRole('link', { name: 'Ver detalle' })
  expect(detailLink).toHaveAttribute('href', '/catalogo/whey-protein-1')
  fireEvent.click(detailLink)
  expect(await screen.findByRole('dialog')).toHaveTextContent('Whey Protein')
  expect(screen.getByLabelText('URL')).toHaveTextContent('/catalogo/whey-protein-1')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
  expect(screen.getByLabelText('URL').textContent).toBe('/catalogo')
})

test('direct URL loads product details from the API', async () => {
  open('/catalogo/whey-protein-1')
  expect(await screen.findByRole('dialog')).toHaveTextContent('Whey Protein')
  expect(getProductById).toHaveBeenCalledWith(1)
})

test('unknown product shows a message and a way back', async () => {
  open('/catalogo/no-existe')
  expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el producto.')
  expect(getProductById).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('link', { name: 'Volver al catálogo' }))
  expect(screen.getByLabelText('URL').textContent).toBe('/catalogo')
})

test('detail request errors are visible', async () => {
  getProductById.mockRejectedValue(new Error('Error de conexión'))
  open('/catalogo/whey-protein-1')
  expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión')
})

test('slugs are stable when another product is renamed or removed', () => {
  const products = [product, { ...product, id_producto: 2 }, { ...product, id_producto: 3, nombre: 'Proteína & Café' }]
  expect(getProductSlug(products[0])).toBe('whey-protein-1')
  expect(getProductSlug(products[1])).toBe('whey-protein-2')
  expect(getProductSlug(products[2])).toBe('proteina-cafe-3')
  const originalSecondUrl = getProductSlug(products[1])
  const withoutFirstProduct = products.slice(1)
  const withFirstProductRenamed = [{ ...products[0], nombre: 'Otro nombre' }, ...products.slice(1)]
  expect(getProductSlug(withoutFirstProduct[0])).toBe(originalSecondUrl)
  expect(getProductSlug(withFirstProductRenamed[1])).toBe(originalSecondUrl)
  expect(findProductBySlug([{ ...product, nombre: 'Nombre nuevo' }], 'whey-protein-1')?.id_producto).toBe(1)
})

test('legacy product URLs still resolve', async () => {
  open('/catalogo/whey-protein')
  expect(await screen.findByRole('dialog')).toHaveTextContent('Whey Protein')
  expect(findProductBySlug([product], 'whey-protein')).toEqual(product)
  const repeated = [product, { ...product, id_producto: 2 }]
  expect(findProductBySlug(repeated, 'whey-protein')).toEqual(repeated[0])
  expect(findProductBySlug(repeated, 'whey-protein-2')).toEqual(repeated[1])
})
