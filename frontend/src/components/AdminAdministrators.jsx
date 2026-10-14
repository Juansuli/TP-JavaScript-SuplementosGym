import { useEffect, useState } from 'react'
import AdminForm from './AdminForm'
import ConfirmModal from './ConfirmModal'
import { getAdmins, createAdmin, updateAdmin, setAdminStatus } from '../services/admin.service'

// Gestión de administradores (issue #58): listado, alta, edición y
// habilitar/inhabilitar. El administrador logueado no puede inhabilitarse
// a sí mismo (el backend también lo impide).
function AdminAdministrators({ currentUser, showToast, onSelfUpdated }) {
  const [admins, setAdmins] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [adminPendingDisable, setAdminPendingDisable] = useState(null)

  const { id_usuario: currentUserId, token } = currentUser

  useEffect(() => {
    let isStale = false

    async function loadAdmins() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getAdmins(token)
        if (!isStale) setAdmins(data)
      } catch (err) {
        if (!isStale) setError(err.message)
      } finally {
        if (!isStale) setIsLoading(false)
      }
    }

    loadAdmins()
    return () => {
      isStale = true
    }
  }, [token])

  function replaceAdmin(updated) {
    setAdmins((prev) => prev.map((item) => (item.id_usuario === updated.id_usuario ? updated : item)))
  }

  function openCreateForm() {
    setEditingAdmin(null)
    setIsFormOpen(true)
  }

  function openEditForm(admin) {
    setEditingAdmin(admin)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingAdmin(null)
  }

  async function handleFormSubmit(payload) {
    if (editingAdmin) {
      const updated = await updateAdmin(editingAdmin.id_usuario, payload, token)
      replaceAdmin(updated)
      // Si se editó a sí mismo, se actualiza el saludo del header.
      if (updated.id_usuario === currentUserId) onSelfUpdated(updated)
      showToast(`${updated.nombre} ${updated.apellido} se actualizó correctamente.`)
    } else {
      const created = await createAdmin(payload, token)
      setAdmins((prev) => [...prev, created])
      showToast(`${created.nombre} ${created.apellido} ahora es administrador.`)
    }

    closeForm()
  }

  async function changeStatus(admin, activo) {
    setUpdatingId(admin.id_usuario)

    try {
      const updated = await setAdminStatus(admin.id_usuario, activo, token)
      replaceAdmin(updated)
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

  // Inhabilitar pide confirmación porque deja a esa persona sin acceso;
  // habilitar de nuevo no.
  function handleToggleStatus(admin) {
    if (admin.activo) setAdminPendingDisable(admin)
    else changeStatus(admin, true)
  }

  function confirmDisable() {
    const admin = adminPendingDisable
    setAdminPendingDisable(null)
    if (admin) changeStatus(admin, false)
  }

  return (
    <div className="admin-clients">
      <div className="admin-products-header admin-clients-header admin-admins-header">
        <h1>Administradores</h1>
        <button type="button" onClick={openCreateForm}>
          Nuevo administrador
        </button>
      </div>

      {isLoading && <p className="catalog-message">Cargando administradores...</p>}
      {!isLoading && error && <p className="catalog-message catalog-error">{error}</p>}
      {!isLoading && !error && admins.length === 0 && (
        <p className="catalog-message">No hay administradores para mostrar.</p>
      )}

      {!isLoading && !error && admins.length > 0 && (
        <div className="admin-clients-table-wrap">
          <table className="admin-clients-table">
            <thead>
              <tr>
                <th>Administrador</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const isSelf = admin.id_usuario === currentUserId

                return (
                  <tr
                    key={admin.id_usuario}
                    className={admin.activo ? undefined : 'client-state-inhabilitado'}
                  >
                    <td>
                      <strong>
                        {admin.nombre} {admin.apellido}
                        {isSelf && <em className="admin-self-tag"> (vos)</em>}
                      </strong>
                      <span>{admin.email}</span>
                    </td>
                    <td>
                      <span className="admin-client-status">
                        {admin.activo ? 'Activo' : 'Inhabilitado'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => openEditForm(admin)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={isSelf || updatingId === admin.id_usuario}
                          title={isSelf ? 'No podés inhabilitar tu propia cuenta.' : undefined}
                          onClick={() => handleToggleStatus(admin)}
                        >
                          {admin.activo ? 'Inhabilitar' : 'Habilitar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <AdminForm admin={editingAdmin} onSubmit={handleFormSubmit} onCancel={closeForm} />
      )}

      {adminPendingDisable && (
        <ConfirmModal
          title="Inhabilitar administrador"
          message={`${adminPendingDisable.nombre} ${adminPendingDisable.apellido} no va a poder iniciar sesión hasta que lo vuelvas a habilitar.`}
          confirmLabel="Inhabilitar"
          isDanger
          onConfirm={confirmDisable}
          onCancel={() => setAdminPendingDisable(null)}
        />
      )}
    </div>
  )
}

export default AdminAdministrators
