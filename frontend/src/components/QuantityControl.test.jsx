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
