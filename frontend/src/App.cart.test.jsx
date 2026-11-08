import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { createOrder } from './services/order.service'
import { getProducts } from './services/product.service'

vi.mock('./services/product.service', () => ({ getProducts: vi.fn() }))
vi.mock('./services/order.service', () => ({ createOrder: vi.fn() }))
vi.mock('./components/AiSuggestion', () => ({
  default: ({ addProductsToCart, disabled }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => addProductsToCart([
        { id_producto: 2, nombre: 'Creatina', precio: 50, stock: 4, estado: 'disponible' },
      ])}
    >
      Agregar sugerencia al carrito
    </button>
  ),
}))
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
vi.mock('./components/MyOrders', () => ({ default: () => <h1>Mis compras</h1> }))

function apiProduct(changes) {
  return { id_producto: 1, nombre: 'Whey', precio: 100, stock: 5, estado: 'disponible', ...changes }
}

// Queues a getProducts() response that the test sends later, to simulate a slow backend.
function deferredProducts() {
  let resolve
  getProducts.mockReturnValueOnce(new Promise((res) => { resolve = res }))
  return (changes) => act(async () => resolve([apiProduct(changes)]))
}

function deferredOrder() {
  let resolve
  let reject
  createOrder.mockReturnValueOnce(new Promise((res, rej) => {
    resolve = res
    reject = rej
  }))
  return {
    resolve: (order) => act(async () => resolve(order)),
    reject: (error) => act(async () => reject(error)),
  }
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

test('keeps the cart when navigating through a client route', async () => {
  getProducts.mockResolvedValue([apiProduct()])
  render(<MemoryRouter><App /></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: 'Agregar Whey' }))
  fireEvent.click(screen.getAllByRole('link', { name: 'Mis compras' })[0])

  expect(screen.getByRole('heading', { name: 'Mis compras' })).toBeInTheDocument()
  const cartButton = screen.getByRole('button', { name: 'Pedido1' })
  fireEvent.click(cartButton)
  expect(screen.getByRole('dialog')).toHaveTextContent('Whey')
  await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(1))
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

test('does not create an order when its revalidation is superseded by a newer one', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  const respondToSubmit = deferredProducts()

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  const respondToNewerRevalidation = deferredProducts()
  fireEvent.click(screen.getByRole('button', { name: /^Pedido/ }))
  await respondToSubmit({ precio: 150 })
  await respondToNewerRevalidation({ precio: 150 })

  expect(createOrder).not.toHaveBeenCalled()
})

test('keeps the cart open while createOrder is pending', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  const order = deferredOrder()

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))

  const closeButton = screen.getByRole('button', { name: 'Cerrar pedido' })
  expect(closeButton).toBeDisabled()
  fireEvent.click(closeButton)
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  await order.resolve({ id_pedido: 7, total: 100 })
  expect(screen.getByRole('button', { name: 'Cerrar pedido' })).toBeEnabled()
})

test('does not start a second confirmation while createOrder is pending', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  const order = deferredOrder()

  const submitButton = screen.getByRole('button', { name: 'Confirmar pedido' })
  fireEvent.click(submitButton)
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  expect(submitButton).toBeDisabled()
  fireEvent.click(submitButton)
  expect(createOrder).toHaveBeenCalledTimes(1)

  await order.resolve({ id_pedido: 7, total: 100 })
})

test('does not allow adding an AI suggestion while the order is being sent', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  const order = deferredOrder()

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))

  const suggestionButton = screen.getByRole('button', { name: 'Agregar sugerencia al carrito' })
  expect(suggestionButton).toBeDisabled()
  fireEvent.click(suggestionButton)
  expect(screen.queryByText('Creatina')).not.toBeInTheDocument()
  expect(createOrder.mock.calls[0][0].productos).toEqual([{ id_producto: 1, cantidad: 1 }])

  await order.resolve({ id_pedido: 7, total: 100 })
})

test('ignores cart mutations from the catalog behind the modal while the order is being sent', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  const order = deferredOrder()

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button', { name: 'Agregar Whey' }))

  expect(screen.getByLabelText('Cantidad de Whey')).toHaveValue('1')
  expect(createOrder.mock.calls[0][0].productos).toEqual([{ id_producto: 1, cantidad: 1 }])

  await order.resolve({ id_pedido: 7, total: 100 })
})

test('sends exactly the products and quantities confirmed by the user', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fireEvent.change(screen.getByLabelText('Cantidad de Whey'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Agregar sugerencia al carrito' }))
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([
    apiProduct(),
    apiProduct({ id_producto: 2, nombre: 'Creatina', precio: 50, stock: 4 }),
  ])
  createOrder.mockReturnValue(new Promise(() => {}))

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  expect(createOrder.mock.calls[0][0].productos).toEqual([
    { id_producto: 1, cantidad: 3 },
    { id_producto: 2, cantidad: 1 },
  ])
  expect(screen.getByLabelText('Cantidad de Whey')).toHaveValue('3')
  expect(screen.getByLabelText('Cantidad de Creatina')).toHaveValue('1')
})

test('unlocks every cart control when createOrder rejects the order', async () => {
  const respondToOpening = openCartWithPendingRevalidation()
  await respondToOpening()
  fillCheckoutForm()
  getProducts.mockResolvedValueOnce([apiProduct()])
  const order = deferredOrder()

  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  await order.reject(new Error('El backend rechazó el pedido.'))

  expect(await screen.findByText('El backend rechazó el pedido.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cerrar pedido' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
  expect(screen.getByLabelText('Cantidad de Whey')).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Quitar' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Agregar sugerencia al carrito' })).toBeEnabled()
})
