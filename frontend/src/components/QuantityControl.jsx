import { useEffect, useId, useState } from 'react'

function QuantityControl({ quantity, stock, productName, onChange }) {
  const id = useId()
  const [draft, setDraft] = useState(String(quantity))

  useEffect(() => {
    setDraft(String(quantity))
  }, [quantity, stock])

  function update(value) {
    const next = Math.max(1, Math.min(stock, Math.trunc(value)))
    setDraft(String(next))
    onChange(next)
  }

  function handleChange(event) {
    const value = event.target.value
    // An empty draft lets users clear the field before typing a new quantity.
    if (value === '') {
      setDraft('')
      return
    }
    if (/^\d+$/.test(value)) update(Number(value))
  }

  return (
    <div className="cart-quantity">
      <label htmlFor={id}>Cantidad</label>
      <div className="quantity-control">
        <input
          id={id}
          type="text"
          role="spinbutton"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={`Cantidad de ${productName}`}
          aria-valuemin={1}
          aria-valuemax={stock}
          aria-valuenow={quantity}
          value={draft}
          onChange={handleChange}
          onBlur={() => setDraft(String(quantity))}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault()
              update(quantity + (event.key === 'ArrowUp' ? 1 : -1))
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
        />
        <div className="quantity-arrows">
          <button type="button" aria-label={`Aumentar cantidad de ${productName}`} disabled={quantity >= stock} onClick={() => update(quantity + 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
          </button>
          <button type="button" aria-label={`Disminuir cantidad de ${productName}`} disabled={quantity <= 1} onClick={() => update(quantity - 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuantityControl
