import { useState } from 'react'
import ProductCatalog from './components/ProductCatalog'
import AdminProducts from './components/AdminProducts'
import './App.css'

function App() {
  const [view, setView] = useState('catalogo')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function changeView(nextView) {
    setView(nextView)
    setIsMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="wrap nav-inner">
          <button className="brand" type="button" onClick={() => changeView('catalogo')}>
            DO<span>SIS</span>
          </button>

          <nav className="nav-links" aria-label="Navegación principal">
            <button
              type="button"
              className={view === 'catalogo' ? 'is-active' : ''}
              onClick={() => changeView('catalogo')}
            >
              Catálogo
            </button>
            <button
              type="button"
              className={view === 'admin' ? 'is-active' : ''}
              onClick={() => changeView('admin')}
            >
              Administrar productos
            </button>
          </nav>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={isMenuOpen}
            aria-controls="mobileNav"
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={`mobile-nav wrap ${isMenuOpen ? 'is-open' : ''}`} id="mobileNav">
          <button type="button" onClick={() => changeView('catalogo')}>Catálogo</button>
          <button type="button" onClick={() => changeView('admin')}>Administrar productos</button>
        </nav>
      </header>

      <main className="app-content">
        {view === 'catalogo' ? <ProductCatalog /> : <AdminProducts />}
      </main>

      <footer className="site-footer wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="brand">DO<span>SIS</span></span>
            <p>Suplementos deportivos con información clara para elegir mejor.</p>
          </div>
          <div className="footer-col">
            <h4>Productos</h4>
            <button type="button" onClick={() => changeView('catalogo')}>Catálogo</button>
          </div>
          <div className="footer-col">
            <h4>Gestión</h4>
            <button type="button" onClick={() => changeView('admin')}>Administrar</button>
          </div>
          <div className="footer-col">
            <h4>Estado</h4>
            <p>Catálogo conectado a la API</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 DOSIS</span>
          <span>Productos y administración</span>
        </div>
      </footer>
    </div>
  )
}

export default App
