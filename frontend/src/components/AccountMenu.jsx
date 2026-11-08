import { useEffect, useId, useRef, useState } from 'react'

import { NavLink } from 'react-router-dom'

const options = [
  ['mis-compras', 'Mis compras', '/mis-compras'],
  ['mi-perfil', 'Mi perfil', '/mi-perfil'],
  ['mis-sugerencias', 'Mis sugerencias', '/mis-sugerencias'],
]

function AccountMenu({ view }) {
  const [isOpen, setIsOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const id = useId()
  const isActive = options.some(([key]) => key === view)

  useEffect(() => {
    if (!isOpen) return
    function closeOutside(event) {
      if (!root.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [isOpen])

  return (
    <div className="account-dropdown" ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.stopPropagation()
          setIsOpen(false)
          trigger.current?.focus()
        }
      }}>
      <button type="button" ref={trigger}
        className={`account-dropdown-trigger ${isActive ? 'is-active' : ''}`}
        aria-expanded={isOpen} aria-controls={id}
        onClick={() => setIsOpen((open) => !open)}>
        Mi cuenta
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {isOpen && (
        <div className="account-dropdown-options" id={id}>
          {options.map(([key, label, path]) => (
            <NavLink key={key} to={path} className={view === key ? 'is-active' : ''}
              onClick={() => setIsOpen(false)}>
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default AccountMenu
