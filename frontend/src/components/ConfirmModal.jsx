// Modal de confirmación genérico: reemplaza a window.confirm (bloquea el
// hilo y muestra el diálogo nativo del navegador) por un diálogo propio,
// consistente con AuthModal/ProductForm.
function ConfirmModal({ title, message, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', isDanger = false, onConfirm, onCancel }) {
  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        {title && <h2 id="confirm-modal-title">{title}</h2>}
        <p>{message}</p>

        <div className="confirm-modal-actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDanger ? 'confirm-modal-danger' : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
