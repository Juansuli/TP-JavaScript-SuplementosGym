import { useState } from 'react'
import ProductCatalog from './components/ProductCatalog'
import AdminProducts from './components/AdminProducts'
import AuthModal from './components/AuthModal'
import Cart from './components/Cart'
import './App.css'

function App() {
  const [view, setView] = useState('catalogo')
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isAdmin = currentUser?.rol === 'administrador'
  const isClient = currentUser?.rol === 'cliente'
  const cartCount = cart.reduce((sum, item) => sum + item.cantidad, 0)

  function handleAuthSuccess(user) {
    setCurrentUser(user)
    setIsAuthOpen(false)
  }

  function handleLogout() {
    setCurrentUser(null)
    setView('catalogo')
    setCart([])
    setIsCartOpen(false)
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id_producto === product.id_producto)

      if (existing) {
        const nextQuantity = Math.min(existing.cantidad + 1, product.stock)
        return prev.map((item) =>
          item.id_producto === product.id_producto ? { ...item, cantidad: nextQuantity } : item
        )
      }

      return [
        ...prev,
        {
          id_producto: product.id_producto,
          nombre: product.nombre,
          precio: Number(product.precio),
          stock: product.stock,
          cantidad: 1,
        },
      ]
    })
  }

  function updateCartQuantity(id_producto, cantidad) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id_producto !== id_producto) return item
        const clamped = Math.max(1, Math.min(cantidad || 1, item.stock))
        return { ...item, cantidad: clamped }
      })
    )
  }

  function removeFromCart(id_producto) {
    setCart((prev) => prev.filter((item) => item.id_producto !== id_producto))
  }

  function clearCart() {
    setCart([])
  }

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
            {isAdmin && (
              <button
                type="button"
                className={view === 'admin' ? 'is-active' : ''}
                onClick={() => changeView('admin')}
              >
                Administrar productos
              </button>
            )}
          </nav>

          <div className="nav-actions">
            {isClient && (
              <button type="button" className="icon-btn" onClick={() => setIsCartOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span className="nav-action-label">Pedido</span>
                {cartCount > 0 && <span className="cart-count tabnum">{cartCount}</span>}
              </button>
            )}

            {currentUser ? (
              <div className="user-menu">
                <span>Hola, {currentUser.nombre}</span>
                <button type="button" onClick={handleLogout}>Salir</button>
              </div>
            ) : (
              <button type="button" className="login-button" onClick={() => setIsAuthOpen(true)}>
                Ingresar
              </button>
            )}

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
        </div>

        <nav className={`mobile-nav wrap ${isMenuOpen ? 'is-open' : ''}`} id="mobileNav">
          <button type="button" onClick={() => changeView('catalogo')}>Catálogo</button>
          {isAdmin && (
            <button type="button" onClick={() => changeView('admin')}>Administrar productos</button>
          )}
          {isClient && (
            <button type="button" onClick={() => { setIsCartOpen(true); setIsMenuOpen(false) }}>
              Mi pedido ({cartCount})
            </button>
          )}
        </nav>
      </header>

      <main className="app-content">
        {view === 'admin' && isAdmin ? (
          <AdminProducts token={currentUser.token} />
        ) : (
          <ProductCatalog onAddToCart={isClient ? addToCart : undefined} />
        )}
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
            <h4>Cuenta</h4>
            {currentUser ? (
              <button type="button" onClick={handleLogout}>Cerrar sesión</button>
            ) : (
              <button type="button" onClick={() => setIsAuthOpen(true)}>Ingresar</button>
            )}
          </div>
          <div className="footer-col">
            <h4>Estado</h4>
            <p>Catálogo conectado a la API</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 DOSIS</span>
          <span>Productos, cuenta y pedidos</span>
        </div>
      </footer>

      {isAuthOpen && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setIsAuthOpen(false)} />
      )}

      {isCartOpen && (
        <Cart
          cart={cart}
          token={currentUser?.token}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onOrderPlaced={clearCart}
          onClose={() => setIsCartOpen(false)}
        />
      )}
    </div>
  )
}

export default App
