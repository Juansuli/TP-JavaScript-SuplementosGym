import { useEffect } from 'react'

const icons = {
  success: '✓',
  error: '!',
  info: 'i',
}

function Toast({ toast, duration, onDismiss }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => onDismiss(toast.id), duration)
    return () => window.clearTimeout(timeoutId)
  }, [duration, onDismiss, toast.id])

  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon" aria-hidden="true">{icons[toast.type] ?? icons.info}</span>
      <p>{toast.message}</p>
      <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Cerrar notificación">×</button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss, duration = 2600 }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} duration={duration} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export default ToastStack
