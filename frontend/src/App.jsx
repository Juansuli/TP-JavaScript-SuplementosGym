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
          {isClient && (
            <button type="button" className="app-nav-cart" onClick={() => setIsCartOpen(true)}>
              Carrito{cartCount > 0 ? ` (${cartCount})` : ''}
            </button>
          )}

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

      {view === 'admin' && isAdmin ? (
        <AdminProducts />
      ) : (
        <ProductCatalog onAddToCart={isClient ? addToCart : undefined} />
      )}

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
    </>
  )
}

export default App
