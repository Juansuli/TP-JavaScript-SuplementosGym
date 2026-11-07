import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { createOrder } from './services/pedido.service'
import { getProducts } from './services/product.service'

vi.mock('./services/product.service', () => ({ getProducts: vi.fn() }))
vi.mock('./services/pedido.service', () => ({ createOrder: vi.fn() }))
vi.mock('./components/AiSuggestion', () => ({ default: () => null }))
vi.mock('./components/ProductCatalog', () => ({
  default: ({ onAddToCart }) => (
    <button
      type="button"
      onClick={() => onAddToCart({ id_producto: 1, nombre: 'Whey', precio: 100, stock: 5 })}
    >
      Agregar Whey
    </button>
  ),
}))

function deferredProducts() {
  let resolve
  getProducts.mockReturnValueOnce(new Promise((res) => { resolve = res }))
  return (stock) => resolve([{ id_producto: 1, nombre: 'Whey', precio: 100, stock }])
}

// Opens the cart with one unit, leaving its stock revalidation in flight.
function openCartWithPendingRevalidation() {
  const respond = deferredProducts()
  render(<MemoryRouter><App /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Agregar Whey' }))
  fireEvent.click(screen.getByRole('button', { name: /^Pedido/ }))
  return respond
}

function subtotal() {
  return document.querySelector('.cart-item-subtotal').textContent.replace(/\s/g, '')
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('dosis_current_user', JSON.stringify({ nombre: 'Cliente', rol: 'cliente', es_cliente: true, token: 'test' }))
})

test('keeps a quantity edited while the stock revalidation is pending', async () => {
  const respond = openCartWithPendingRevalidation()
  const input = screen.getByRole('spinbutton')

  fireEvent.change(input, { target: { value: '3' } })
  expect(subtotal()).toBe('$300')

  await act(async () => respond(5))

  expect(input).toHaveValue('3')
  expect(subtotal()).toBe('$300')
})

test('clamps an edited quantity when the stock dropped below it', async () => {
  const respond = openCartWithPendingRevalidation()
  const input = screen.getByRole('spinbutton')

  fireEvent.change(input, { target: { value: '4' } })
  respond(2)

  await waitFor(() => expect(input).toHaveValue('2'))
  expect(input).toHaveAttribute('aria-valuemax', '2')
  expect(subtotal()).toBe('$200')
})

test('removes the product when the revalidation finds no stock', async () => {
  const respond = openCartWithPendingRevalidation()

  respond(0)

  expect(await screen.findByText('Tu pedido está vacío.')).toBeInTheDocument()
})

test('confirms the order with the quantity edited during the revalidation', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await act(async () => respondToOpening(5))
  createOrder.mockResolvedValue({ id_pedido: 7, total: 300 })

  fireEvent.change(screen.getByPlaceholderText('Nombre y apellido'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByPlaceholderText('Calle, número, ciudad'), { target: { value: 'Calle 1' } })
  const respondToSubmit = deferredProducts()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } })
  respondToSubmit(5)

  await waitFor(() => expect(createOrder).toHaveBeenCalled())
  expect(createOrder.mock.calls[0][0].productos).toEqual([{ id_producto: 1, cantidad: 3 }])
})
