import { useState } from 'react'
import ProductCatalog from './components/ProductCatalog'
import AdminProducts from './components/AdminProducts'
import AuthModal from './components/AuthModal'
import './App.css'

function App() {
  const [view, setView] = useState('catalogo')
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  const isAdmin = currentUser?.rol === 'administrador'

  function handleAuthSuccess(user) {
    setCurrentUser(user)
    setIsAuthOpen(false)
  }

  function handleLogout() {
    setCurrentUser(null)
    setView('catalogo')
  }

  return (
    <>
      <nav className="app-nav">
        <button
          type="button"
          className={view === 'catalogo' ? 'active' : ''}
          onClick={() => setView('catalogo')}
        >
          Catálogo
        </button>

        {isAdmin && (
          <button
            type="button"
            className={view === 'admin' ? 'active' : ''}
            onClick={() => setView('admin')}
          >
            Administrar productos
          </button>
        )}

        <div className="app-nav-session">
          {currentUser ? (
            <>
              <span>Hola, {currentUser.nombre}</span>
              <button type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsAuthOpen(true)}>
              Iniciar sesión
            </button>
          )}
        </div>
      </nav>

      {view === 'admin' && isAdmin ? <AdminProducts /> : <ProductCatalog />}

      {isAuthOpen && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setIsAuthOpen(false)} />
      )}
    </>
  )
}

export default App
