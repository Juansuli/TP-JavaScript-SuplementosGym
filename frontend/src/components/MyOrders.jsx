import { Fragment, useEffect, useRef, useState } from 'react'
import { getOrderById, getOrders } from '../services/pedido.service'

const ORDER_STATE_LABELS = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}
const CONFIRMED_STATES = ['procesando', 'enviado', 'entregado']

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function getStatusBadgeModifier(estado) {
  if (estado === 'cancelado') return 'cancelado'
  if (CONFIRMED_STATES.includes(estado)) return 'confirmado'
  return 'pendiente'
}

function MyOrders({ token, showToast }) {
  const [orders, setOrders] = useState([])
  const [details, setDetails] = useState({})
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const expandedOrderIdRef = useRef(null)

  useEffect(() => {
    let isStale = false

    async function loadOrders() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getOrders({}, token)
        if (!isStale) setOrders(data)
      } catch (err) {
        if (!isStale) setError(err.message)
      } finally {
        if (!isStale) setIsLoading(false)
      }
    }

    loadOrders()
    return () => {
      isStale = true
    }
  }, [token])

  async function toggleDetail(orderId) {
    if (expandedOrderIdRef.current === orderId) {
      expandedOrderIdRef.current = null
      setExpandedOrderId(null)
      return
    }

    expandedOrderIdRef.current = orderId
    setExpandedOrderId(orderId)
    if (details[orderId]) return

    setLoadingDetailId(orderId)
    try {
      const detail = await getOrderById(orderId, token)
      setDetails((prev) => ({ ...prev, [orderId]: detail }))
    } catch (err) {
      if (expandedOrderIdRef.current === orderId) {
        expandedOrderIdRef.current = null
        setExpandedOrderId(null)
        showToast(err.message, 'error')
      }
    } finally {
      setLoadingDetailId((currentId) => (currentId === orderId ? null : currentId))
    }
  }

  return (
    <div className="admin-orders my-orders">
      <div className="admin-products-header my-orders-header">
        <h1>Mis compras</h1>
      </div>

      {isLoading && <p className="catalog-message">Cargando tus pedidos...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && orders.length === 0 && (
        <p className="catalog-message">Todavía no hiciste ningún pedido.</p>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="admin-orders-table-wrap">
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const detail = details[order.id_pedido]
                const isExpanded = expandedOrderId === order.id_pedido
                const badgeModifier = getStatusBadgeModifier(order.estado)

                return (
                  <Fragment key={order.id_pedido}>
                    <tr className={`order-state-${order.estado}`}>
                      <td className="tabnum">#{order.id_pedido}</td>
                      <td className="tabnum">{dateFormatter.format(new Date(order.fecha))}</td>
                      <td className="tabnum">{priceFormatter.format(order.total)}</td>
                      <td>
                        <span className={`status-tag status-${badgeModifier}`}>
                          {ORDER_STATE_LABELS[order.estado] ?? order.estado}
                        </span>
                        {order.estado === 'pendiente' && (
                          <p className="my-order-notice">
                            Pedido enviado, todavía no fue confirmado por un administrador.
                          </p>
                        )}
                        {CONFIRMED_STATES.includes(order.estado) && order.fecha_confirmacion && (
                          <p className="my-order-notice">
                            Confirmado el {dateFormatter.format(new Date(order.fecha_confirmacion))}.
                          </p>
                        )}
                      </td>
                      <td>
                        <button type="button" className="admin-order-detail-button" onClick={() => toggleDetail(order.id_pedido)}>
                          {loadingDetailId === order.id_pedido ? 'Cargando...' : isExpanded ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && detail && (
                      <tr className="admin-order-detail-row">
                        <td colSpan="5">
                          <div className="admin-order-detail">
                            <div>
                              <span>Entrega</span>
                              <strong>{detail.direccion_entrega}</strong>
                            </div>
                            <div>
                              <span>Pago</span>
                              <strong>{detail.metodo_pago}</strong>
                            </div>
                            <ul>
                              {detail.productos.map((item) => (
                                <li key={item.id_producto}>
                                  <span>{item.producto?.nombre ?? `Producto #${item.id_producto}`}</span>
                                  <strong className="tabnum">{item.cantidad} × {priceFormatter.format(item.precio_unitario)}</strong>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MyOrders
