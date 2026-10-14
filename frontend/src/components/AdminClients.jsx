import { useEffect, useState } from 'react'
import { getClients, setClientStatus, updateClient } from '../services/client.service'
import { getDiscounts } from '../services/descuento.service'

function AdminClients({ token, showToast }) {
  const [clients, setClients] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [updatingDiscountId, setUpdatingDiscountId] = useState(null)

  useEffect(() => {
    let isStale = false

    async function loadClients() {
      setIsLoading(true)
      setError(null)

      try {
        const [clientData, discountData] = await Promise.all([
          getClients(token),
          getDiscounts(token),
        ])
        if (!isStale) {
          setClients(clientData)
          setDiscounts(discountData)
        }
      } catch (err) {
        if (!isStale) setError(err.message)
      } finally {
        if (!isStale) setIsLoading(false)
      }
    }

    loadClients()
    return () => {
      isStale = true
    }
  }, [token])

  async function handleToggleStatus(client) {
    setUpdatingId(client.id_cliente)

    try {
      const updated = await setClientStatus(client.id_cliente, !client.activo, token)
      setClients((prev) =>
        prev.map((item) => (item.id_cliente === updated.id_cliente ? updated : item))
      )
      showToast(
        updated.activo
          ? `${updated.nombre} ${updated.apellido} fue habilitado.`
          : `${updated.nombre} ${updated.apellido} fue inhabilitado.`
      )
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDiscountChange(client, category) {
    setUpdatingDiscountId(client.id_cliente)

    try {
      const updated = await updateClient(
        client.id_cliente,
        { descuento_categoria: category || null },
        token,
      )
      setClients((prev) => (
        prev.map((item) => (item.id_cliente === updated.id_cliente ? updated : item))
      ))
      showToast(
        category
          ? `Se asignó la categoría ${category} a ${updated.nombre} ${updated.apellido}.`
          : `Se quitó el descuento de ${updated.nombre} ${updated.apellido}.`,
      )
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUpdatingDiscountId(null)
    }
  }

  return (
    <div className="admin-clients">
      <div className="admin-products-header admin-clients-header">
        <h1>Administrar clientes</h1>
      </div>

      {isLoading && <p className="catalog-message">Cargando clientes...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && clients.length === 0 && (
        <p className="catalog-message">No hay clientes para mostrar.</p>
      )}

      {!isLoading && !error && clients.length > 0 && (
        <div className="admin-clients-table-wrap">
          <table className="admin-clients-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Descuento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id_cliente}
                  className={client.activo ? undefined : 'client-state-inhabilitado'}
                >
                  <td>
                    <strong>{client.nombre} {client.apellido}</strong>
                    <span>{client.email}</span>
                  </td>
                  <td>
                    <span className="admin-client-status">
                      {client.activo ? 'Activo' : 'Inhabilitado'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={client.descuento_categoria ?? ''}
                      disabled={updatingDiscountId === client.id_cliente}
                      aria-label={`Descuento de ${client.nombre} ${client.apellido}`}
                      onChange={(event) => handleDiscountChange(client, event.target.value)}
                    >
                      <option value="">Sin descuento</option>
                      {discounts.map((discount) => (
                        <option key={discount.categoria} value={discount.categoria}>
                          {discount.categoria} ({discount.porcentaje}%)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={updatingId === client.id_cliente}
                      onClick={() => handleToggleStatus(client)}
                    >
                      {client.activo ? 'Inhabilitar' : 'Habilitar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminClients
