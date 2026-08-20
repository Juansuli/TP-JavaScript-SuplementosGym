import { Fragment, useEffect, useRef, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import {
  deleteOrder,
  getOrderById,
  getOrders,
  updateOrder,
} from '../services/pedido.service'

const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado']
const CANCELLABLE_STATUSES = ['pendiente', 'procesando']
const DELETABLE_STATUSES = ['pendiente', 'procesando', 'cancelado']
const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function AdminOrders({ token, showToast }) {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [details, setDetails] = useState({})
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [orderPendingDelete, setOrderPendingDelete] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const expandedOrderIdRef = useRef(null)

  useEffect(() => {
    let isStale = false

    async function loadOrders() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getOrders({ estado: statusFilter }, token)
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
  }, [statusFilter, token])

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

  async function handleStatusChange(order, estado) {
    if (estado === order.estado) return

    setUpdatingOrderId(order.id_pedido)
    try {
      const updated = await updateOrder(order.id_pedido, { estado }, token)
      setOrders((prev) => (
        statusFilter && statusFilter !== updated.estado
          ? prev.filter((item) => item.id_pedido !== updated.id_pedido)
          : prev.map((item) => (item.id_pedido === updated.id_pedido ? updated : item))
      ))
      setDetails((prev) => ({ ...prev, [updated.id_pedido]: updated }))
      showToast(`El pedido #${updated.id_pedido} pasó a “${updated.estado}”.`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function confirmDelete() {
    const order = orderPendingDelete
    if (!order) return

    setOrderPendingDelete(null)
    try {
      await deleteOrder(order.id_pedido, token)
      setOrders((prev) => prev.filter((item) => item.id_pedido !== order.id_pedido))
      setDetails((prev) => {
        const next = { ...prev }
        delete next[order.id_pedido]
        return next
      })
      if (expandedOrderIdRef.current === order.id_pedido) {
        expandedOrderIdRef.current = null
        setExpandedOrderId(null)
      }
      showToast(`El pedido #${order.id_pedido} se eliminó correctamente.`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="admin-orders">
      <div className="admin-products-header admin-orders-header">
        <h1>Administrar pedidos</h1>
      </div>

      <div className="admin-orders-toolbar">
        <label>
          Filtrar por estado
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        {!isLoading && !error && <span>{orders.length} pedidos</span>}
      </div>

      {isLoading && <p className="catalog-message">Cargando pedidos...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && orders.length === 0 && (
        <p className="catalog-message">No hay pedidos para mostrar.</p>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="admin-orders-table-wrap">
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Detalle</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const detail = details[order.id_pedido]
                const isExpanded = expandedOrderId === order.id_pedido

                return (
                  <Fragment key={order.id_pedido}>
                    <tr className={`order-state-${order.estado}`}>
                      <td className="tabnum">#{order.id_pedido}</td>
                      <td>
                        <strong>{order.nombre_receptor}</strong>
                        <span>Cliente #{order.usuario_id}</span>
                      </td>
                      <td className="tabnum">{dateFormatter.format(new Date(order.fecha))}</td>
                      <td className="tabnum">{priceFormatter.format(order.total)}</td>
                      <td>
                        <select
                          value={order.estado}
                          disabled={updatingOrderId === order.id_pedido || order.estado === 'cancelado'}
                          onChange={(event) => handleStatusChange(order, event.target.value)}
                          aria-label={`Estado del pedido ${order.id_pedido}`}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option
                              key={status}
                              value={status}
                              disabled={status === 'cancelado' && !CANCELLABLE_STATUSES.includes(order.estado)}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button type="button" className="admin-order-detail-button" onClick={() => toggleDetail(order.id_pedido)}>
                          {loadingDetailId === order.id_pedido ? 'Cargando...' : isExpanded ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-order-delete"
                          disabled={!DELETABLE_STATUSES.includes(order.estado)}
                          title={DELETABLE_STATUSES.includes(order.estado) ? undefined : 'Los pedidos enviados o entregados no se pueden eliminar'}
                          onClick={() => setOrderPendingDelete(order)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                    {isExpanded && detail && (
                      <tr className="admin-order-detail-row">
                        <td colSpan="7">
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

      {orderPendingDelete && (
        <ConfirmModal
          title="Eliminar pedido"
          message={`¿Seguro que querés eliminar el pedido #${orderPendingDelete.id_pedido}?`}
          confirmLabel="Eliminar"
          isDanger
          onConfirm={confirmDelete}
          onCancel={() => setOrderPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default AdminOrders
