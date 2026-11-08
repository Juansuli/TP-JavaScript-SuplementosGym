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

function apiProduct(changes) {
  return { id_producto: 1, nombre: 'Whey', precio: 100, stock: 5, estado: 'disponible', ...changes }
}

// Queues a getProducts() response that the test sends later, to simulate a slow backend.
function deferredProducts() {
  let resolve
  getProducts.mockReturnValueOnce(new Promise((res) => { resolve = res }))
  return (changes) => act(async () => resolve([apiProduct(changes)]))
}

// Opens the cart with one unit, leaving its stock revalidation in flight.
function openCartWithPendingRevalidation() {
  const respond = deferredProducts()
  render(<MemoryRouter><App /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Agregar Whey' }))
  fireEvent.click(screen.getByRole('button', { name: /^Pedido/ }))
  return respond
}

function fillCheckoutForm() {
  fireEvent.change(screen.getByPlaceholderText('Nombre y apellido'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByPlaceholderText('Calle, número, ciudad'), { target: { value: 'Calle 1' } })
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

  await respond()

  expect(input).toHaveValue('3')
  expect(subtotal()).toBe('$300')
})

test('clamps an edited quantity when the stock dropped below it', async () => {
  const respond = openCartWithPendingRevalidation()
  const input = screen.getByRole('spinbutton')

  fireEvent.change(input, { target: { value: '4' } })
  await respond({ stock: 2 })

  expect(input).toHaveValue('2')
  expect(input).toHaveAttribute('aria-valuemax', '2')
  expect(subtotal()).toBe('$200')
})

test('removes a product that ran out and tells the user', async () => {
  const respond = openCartWithPendingRevalidation()

  await respond({ stock: 0 })

  expect(screen.getByText('Tu pedido está vacío.')).toBeInTheDocument()
  expect(screen.getByText('Se quitó Whey del pedido porque ya no está disponible.')).toBeInTheDocument()
})

test('removes a disabled product even if it still has stock', async () => {
  const respond = openCartWithPendingRevalidation()

  await respond({ estado: 'inhabilitado' })

  expect(screen.getByText('Tu pedido está vacío.')).toBeInTheDocument()
  expect(screen.getByText('Se quitó Whey del pedido porque ya no está disponible.')).toBeInTheDocument()
})

test('ignores an older revalidation that answers after a newer one', async () => {
  const respondToFirstOpening = openCartWithPendingRevalidation()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar pedido' }))
  const respondToSecondOpening = deferredProducts()
  fireEvent.click(screen.getByRole('button', { name: /^Pedido/ }))
  const input = screen.getByRole('spinbutton')
  fireEvent.change(input, { target: { value: '4' } })

  await respondToSecondOpening({ stock: 5 })
  await respondToFirstOpening({ stock: 1 })

  expect(input).toHaveValue('4')
  expect(input).toHaveAttribute('aria-valuemax', '5')
})

test('updates the price shown in the cart', async () => {
  const respond = openCartWithPendingRevalidation()

  await respond({ precio: 150 })

  expect(subtotal()).toBe('$150')
})

test('asks to review the total when the price changed before confirming', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  const respondToSubmit = deferredProducts()

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  await respondToSubmit({ precio: 150 })

  expect(screen.getByText('El precio de algunos productos cambió. Revisá el total antes de confirmar el pedido.')).toBeInTheDocument()
  expect(createOrder).not.toHaveBeenCalled()
})

test('confirms the order with the quantity edited during the opening revalidation', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } })
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  createOrder.mockResolvedValue({ id_pedido: 7, total: 300 })

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  await waitFor(() => expect(createOrder).toHaveBeenCalled())
  await respondToOpening({ stock: 1 })

  expect(createOrder.mock.calls[0][0].productos).toEqual([{ id_producto: 1, cantidad: 3 }])
})

test('locks the cart controls while the order is being sent', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  createOrder.mockReturnValue(new Promise(() => {}))

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

  await waitFor(() => expect(createOrder).toHaveBeenCalled())
  expect(screen.getByRole('spinbutton')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Quitar' })).toBeDisabled()
})
