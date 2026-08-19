import { useState } from 'react'
import { createOrder } from '../services/pedido.service'

const PAYMENT_METHODS = ['tarjeta', 'efectivo', 'transferencia']

function Cart({ cart, usuarioId, onUpdateQuantity, onRemoveItem, onOrderPlaced, onClose }) {
  const [values, setValues] = useState({
    nombre_receptor: '',
    direccion_entrega: '',
    metodo_pago: PAYMENT_METHODS[0],
  })
  const [errors, setErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

  function handleChange(field) {
    return (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setIsSaving(true)

    try {
      const order = await createOrder({
        usuario_id: usuarioId,
        ...values,
        productos: cart.map((item) => ({ id_producto: item.id_producto, cantidad: item.cantidad })),
      })
      setConfirmedOrder(order)
      onOrderPlaced()
    } catch (err) {
      setErrors(err.message.split('\n'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="cart-overlay">
      <div className="cart" role="dialog" aria-modal="true">
        <button type="button" className="cart-close" onClick={onClose}>
          Cerrar
        </button>

        <h2>Carrito</h2>

        {confirmedOrder ? (
          <div className="cart-confirmation">
            <p>
              ¡Pedido #{confirmedOrder.id_pedido} confirmado! Total: ${confirmedOrder.total}
            </p>
            <button type="button" onClick={onClose}>
              Listo
            </button>
          </div>
        ) : cart.length === 0 ? (
          <p className="catalog-message">Tu carrito está vacío.</p>
        ) : (
          <>
            <ul className="cart-items">
              {cart.map((item) => (
                <li key={item.id_producto} className="cart-item">
                  <span className="cart-item-name">{item.nombre}</span>
                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={item.cantidad}
                    onChange={(event) => onUpdateQuantity(item.id_producto, Number(event.target.value))}
                  />
                  <span className="cart-item-subtotal">${(item.precio * item.cantidad).toFixed(2)}</span>
                  <button type="button" onClick={() => onRemoveItem(item.id_producto)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>

            <p className="cart-total">Total: ${total.toFixed(2)}</p>

            <form className="cart-checkout-form" onSubmit={handleSubmit}>
              <label>
                Nombre de quien recibe
                <input
                  type="text"
                  required
                  value={values.nombre_receptor}
                  onChange={handleChange('nombre_receptor')}
                />
              </label>

              <label>
                Dirección de entrega
                <input
                  type="text"
                  required
                  value={values.direccion_entrega}
                  onChange={handleChange('direccion_entrega')}
                />
              </label>

              <label>
                Método de pago
                <select value={values.metodo_pago} onChange={handleChange('metodo_pago')}>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              {errors.length > 0 && (
                <ul className="cart-errors">
                  {errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}

              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Confirmando...' : 'Confirmar pedido'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default Cart
