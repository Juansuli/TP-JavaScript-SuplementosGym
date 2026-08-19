import { useState } from 'react'
import { createOrder } from '../services/pedido.service'

const PAYMENT_METHODS = ['tarjeta', 'efectivo', 'transferencia']
const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const paymentLabels = {
  tarjeta: 'Tarjeta de crédito o débito',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo al retirar en el local',
}

function Cart({ cart, token, onUpdateQuantity, onRemoveItem, onOrderPlaced, onClose }) {
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
        ...values,
        productos: cart.map((item) => ({ id_producto: item.id_producto, cantidad: item.cantidad })),
      }, token)
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
      <div className="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-toolbar">
          <span className="detail-kicker">Pedido DOSIS</span>
          <button type="button" className="cart-close" onClick={onClose} aria-label="Cerrar pedido">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {confirmedOrder ? (
          <div className="cart-confirmation">
            <span className="confirmation-mark" aria-hidden="true">✓</span>
            <p className="eyebrow">Pedido confirmado</p>
            <h2 id="cart-title">Tu pedido ya está registrado.</h2>
            <p>
              Pedido <strong className="tabnum">#{confirmedOrder.id_pedido}</strong>
              {' · '}Total <strong className="tabnum">{priceFormatter.format(confirmedOrder.total)}</strong>
            </p>
            <button type="button" className="btn btn-accent" onClick={onClose}>Listo</button>
          </div>
        ) : cart.length === 0 ? (
          <div className="cart-empty">
            <p className="eyebrow">Carrito</p>
            <h2 id="cart-title">Tu pedido está vacío.</h2>
            <p>Agregá productos desde el catálogo para continuar.</p>
            <button type="button" className="btn btn-accent" onClick={onClose}>Volver al catálogo</button>
          </div>
        ) : (
          <div className="cart-page">
            <section className="cart-products">
              <p className="eyebrow">Carrito</p>
              <h2 className="page-title" id="cart-title">Tu pedido</h2>

              <ul className="cart-items">
                {cart.map((item) => (
                  <li key={item.id_producto} className="cart-item">
                    <div className="cart-item-thumb" aria-hidden="true"><span>DOSIS</span></div>
                    <div>
                      <span className="cart-item-name">{item.nombre}</span>
                      <span className="cart-item-meta tabnum">{priceFormatter.format(item.precio)} c/u</span>
                    </div>
                    <span className="cart-item-subtotal tabnum">{priceFormatter.format(item.precio * item.cantidad)}</span>
                    <div className="cart-item-actions">
                      <label className="cart-quantity">
                        <span>Cantidad</span>
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.cantidad}
                          onChange={(event) => onUpdateQuantity(item.id_producto, Number(event.target.value))}
                        />
                      </label>
                      <button type="button" className="remove-link" onClick={() => onRemoveItem(item.id_producto)}>Quitar</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="order-summary">
              <h2>Resumen</h2>
              <div className="summary-row">
                <span>Productos</span>
                <span className="amount tabnum">{cart.reduce((sum, item) => sum + item.cantidad, 0)}</span>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <span className="amount tabnum">{priceFormatter.format(total)}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span className="amount tabnum">{priceFormatter.format(total)}</span>
              </div>

              <form className="cart-checkout-form" onSubmit={handleSubmit}>
                <label>
                  Nombre de quien recibe
                  <input type="text" required placeholder="Nombre y apellido" value={values.nombre_receptor} onChange={handleChange('nombre_receptor')} />
                </label>

                <div className="option-group">
                  <h3>Método de pago</h3>
                  {PAYMENT_METHODS.map((method) => (
                    <label className="option-card" key={method}>
                      <input
                        type="radio"
                        name="metodo_pago"
                        value={method}
                        checked={values.metodo_pago === method}
                        onChange={handleChange('metodo_pago')}
                      />
                      <span>{paymentLabels[method]}</span>
                    </label>
                  ))}
                </div>

                <label>
                  Dirección de entrega
                  <input type="text" required placeholder="Calle, número, ciudad" value={values.direccion_entrega} onChange={handleChange('direccion_entrega')} />
                </label>

                {errors.length > 0 && (
                  <ul className="cart-errors">
                    {errors.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                )}

                <button className="btn btn-accent" type="submit" disabled={isSaving}>
                  {isSaving ? 'Confirmando...' : 'Confirmar pedido'}
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart
