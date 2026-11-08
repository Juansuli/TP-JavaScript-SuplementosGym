import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import AiSuggestion from './AiSuggestion'
import { requestSuggestion, updateSuggestionStatus } from '../services/suggestion.service'
import { acceptSuggestionIntoCart } from '../utils/acceptSuggestion'

vi.mock('../services/suggestion.service', () => ({
  requestSuggestion: vi.fn(),
  updateSuggestionStatus: vi.fn(),
}))
vi.mock('../utils/acceptSuggestion', () => ({
  acceptSuggestionIntoCart: vi.fn(),
  buildAcceptedToast: vi.fn(),
}))

const suggestion = {
  id_sugerencia: 9,
  productos: [
    {
      id_producto: 2,
      nombre: 'Creatina',
      precio: 50,
      stock: 4,
      estado: 'disponible',
      motivo: 'Complementa el entrenamiento.',
    },
  ],
}

function suggestionProps(changes = {}) {
  return {
    cart: [],
    cartQuantities: {},
    token: 'test',
    addProductsToCart: vi.fn(),
    onGoToProfile: vi.fn(),
    showToast: vi.fn(),
    ...changes,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('disables every AI suggestion action while the cart is confirming an order', async () => {
  requestSuggestion.mockResolvedValue(suggestion)
  const props = suggestionProps()
  const { rerender } = render(<AiSuggestion {...props} />)

  fireEvent.click(screen.getByRole('button', { name: /Sugerime un producto/ }))
  expect(await screen.findByRole('button', { name: 'Agregar sugerencia al carrito' })).toBeEnabled()

  rerender(<AiSuggestion {...props} disabled />)

  const addButton = screen.getByRole('button', { name: 'Agregar sugerencia al carrito' })
  const anotherButton = screen.getByRole('button', { name: 'Solicitar otra sugerencia' })
  const closeButton = screen.getByRole('button', { name: 'Cerrar' })
  expect(addButton).toBeDisabled()
  expect(anotherButton).toBeDisabled()
  expect(closeButton).toBeDisabled()

  fireEvent.click(addButton)
  fireEvent.click(anotherButton)
  fireEvent.click(closeButton)
  expect(acceptSuggestionIntoCart).not.toHaveBeenCalled()
  expect(updateSuggestionStatus).not.toHaveBeenCalled()
  expect(screen.getByText('Creatina')).toBeInTheDocument()
})
