import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import QuantityControl from './QuantityControl'

function Control() {
  const [quantity, setQuantity] = useState(2)
  return <QuantityControl quantity={quantity} stock={12} productName="Whey" onChange={setQuantity} />
}

test('allows clearing and manually entering a multi-digit quantity', async () => {
  const user = userEvent.setup()
  render(<Control />)
  const input = screen.getByRole('spinbutton')
  await user.clear(input)
  expect(input).toHaveValue('')
  await user.type(input, '10')
  expect(input).toHaveValue('10')
  await user.tab()
  expect(input).toHaveValue('10')
})

test('clamps quantities and disables arrows at the limits', () => {
  render(<Control />)
  const input = screen.getByRole('spinbutton')
  fireEvent.change(input, { target: { value: '99' } })
  expect(input).toHaveValue('12')
  expect(screen.getByRole('button', { name: /Aumentar/ })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /Disminuir/ }))
  expect(input).toHaveValue('11')
  fireEvent.change(input, { target: { value: '0' } })
  expect(input).toHaveValue('1')
  expect(screen.getByRole('button', { name: /Disminuir/ })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /Aumentar/ }))
  expect(input).toHaveValue('2')
})

test('restores empty drafts, rejects fractions and supports keyboard arrows', () => {
  render(<Control />)
  const input = screen.getByRole('spinbutton')
  fireEvent.change(input, { target: { value: '' } })
  fireEvent.blur(input)
  expect(input).toHaveValue('2')
  fireEvent.change(input, { target: { value: '2.5' } })
  expect(input).toHaveValue('2')
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input).toHaveValue('3')
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input).toHaveValue('2')
})

test('shows the product as out of stock instead of a quantity selector', () => {
  render(<QuantityControl quantity={1} stock={0} productName="Whey" onChange={() => {}} />)
  expect(screen.getByText('Sin stock')).toBeInTheDocument()
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Aumentar|Disminuir/ })).not.toBeInTheDocument()
})

test('locks every control while disabled', () => {
  render(<QuantityControl quantity={2} stock={5} productName="Whey" disabled onChange={() => {}} />)
  expect(screen.getByRole('spinbutton')).toBeDisabled()
  expect(screen.getByRole('button', { name: /Aumentar/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: /Disminuir/ })).toBeDisabled()
})

test('follows the stock when it drops', () => {
  const props = { productName: 'Whey', onChange: () => {} }
  const { rerender } = render(<QuantityControl {...props} quantity={3} stock={5} />)
  rerender(<QuantityControl {...props} quantity={2} stock={2} />)
  const input = screen.getByRole('spinbutton')
  expect(input).toHaveValue('2')
  expect(input).toHaveAttribute('aria-valuemax', '2')
  expect(screen.getByRole('button', { name: /Aumentar/ })).toBeDisabled()
})
