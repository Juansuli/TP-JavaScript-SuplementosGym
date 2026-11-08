import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import AdminProducts from './AdminProducts'
import { getAdminProducts, deleteProduct, restoreProduct } from '../services/product.service'
vi.mock('../services/product.service')
const product = { id_producto: 1, nombre: 'Whey', stock: 5, precio: 100, estado: 'disponible' }
beforeEach(() => { vi.clearAllMocks() })
test('soft delete requires confirmation and then offers restoration with confirmation', async () => {
  const user = userEvent.setup()
  getAdminProducts.mockResolvedValue([product])
  deleteProduct.mockResolvedValue({ ...product, estado: 'inhabilitado' })
  restoreProduct.mockResolvedValue(product)
  render(<AdminProducts token="test" showToast={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Borrar', exact: true }))
  expect(deleteProduct).not.toHaveBeenCalled()
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Borrar', exact: true }))
  expect(deleteProduct).toHaveBeenCalledWith(1, 'test')
  await user.click(await screen.findByRole('button', { name: 'Restablecer', exact: true }))
  expect(restoreProduct).not.toHaveBeenCalled()
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restablecer', exact: true }))
  expect(restoreProduct).toHaveBeenCalledWith(1, 'test')
  expect(await screen.findByRole('button', { name: 'Borrar', exact: true })).toBeInTheDocument()
})
