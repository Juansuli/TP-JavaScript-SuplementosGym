import { Fragment, useEffect, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import {
  deleteOrder,
  getOrderById,
  getOrders,
  updateOrder,
} from '../services/pedido.service'

const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado']
const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function AdminOrders({ token }) {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [details, setDetails] = useState({})
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [orderPendingDelete, setOrderPendingDelete] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getOrders({ estado: statusFilter }, token)
        setOrders(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [statusFilter, token])

  async function toggleDetail(orderId) {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null)
      return
    }

    setExpandedOrderId(orderId)
    if (details[orderId]) return

    setLoadingDetailId(orderId)
    setActionError(null)
    try {
      const detail = await getOrderById(orderId, token)
      setDetails((prev) => ({ ...prev, [orderId]: detail }))
    } catch (err) {
      setActionError(err.message)
      setExpandedOrderId(null)
    } finally {
      setLoadingDetailId(null)
    }
  }

  async function handleStatusChange(order, estado) {
    if (estado === order.estado) return

    setUpdatingOrderId(order.id_pedido)
    setNotice(null)
    setActionError(null)
    try {
      const updated = await updateOrder(order.id_pedido, { estado }, token)
      setOrders((prev) => (
        statusFilter && statusFilter !== updated.estado
          ? prev.filter((item) => item.id_pedido !== updated.id_pedido)
          : prev.map((item) => (item.id_pedido === updated.id_pedido ? updated : item))
      ))
      setDetails((prev) => ({ ...prev, [updated.id_pedido]: updated }))
      setNotice(`El pedido #${updated.id_pedido} pasó a “${updated.estado}”.`)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function confirmDelete() {
    const order = orderPendingDelete
    if (!order) return

    setOrderPendingDelete(null)
    setNotice(null)
    setActionError(null)
    try {
      await deleteOrder(order.id_pedido, token)
      setOrders((prev) => prev.filter((item) => item.id_pedido !== order.id_pedido))
      setDetails((prev) => {
        const next = { ...prev }
        delete next[order.id_pedido]
        return next
      })
      if (expandedOrderId === order.id_pedido) setExpandedOrderId(null)
      setNotice(`El pedido #${order.id_pedido} se eliminó correctamente.`)
    } catch (err) {
      setActionError(err.message)
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

      {notice && <p className="admin-products-notice">{notice}</p>}
      {actionError && <p className="admin-products-notice admin-products-notice-error">{actionError}</p>}
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
                <th>Productos</th>
                <th></th>
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
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button type="button" className="admin-order-detail-button" onClick={() => toggleDetail(order.id_pedido)}>
                          {loadingDetailId === order.id_pedido ? 'Cargando...' : isExpanded ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </td>
                      <td>
                        <button type="button" className="admin-order-delete" onClick={() => setOrderPendingDelete(order)}>
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
