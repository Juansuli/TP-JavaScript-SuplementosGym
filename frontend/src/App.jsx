import { useCallback, useRef, useState } from 'react'
import ProductCatalog from './components/ProductCatalog'
import AdminProducts from './components/AdminProducts'
import AdminOrders from './components/AdminOrders'
import AdminClients from './components/AdminClients'
import AdminDiscounts from './components/AdminDiscounts'
import AdminAdministrators from './components/AdminAdministrators'
import MyOrders from './components/MyOrders'
import MySuggestions from './components/MySuggestions'
import ClientProfile from './components/ClientProfile'
import AuthModal from './components/AuthModal'
import Cart from './components/Cart'
import ToastStack from './components/ToastStack'
import { getRemainingStock } from './utils/stock'
import { enableClientProfile } from './services/client.service'
import { getProducts } from './services/product.service'
import './App.css'

const CURRENT_USER_STORAGE_KEY = 'dosis_current_user'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const [view, setView] = useState('catalogo')
  const [currentUser, setCurrentUser] = useState(loadStoredUser)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const nextToastId = useRef(0)

  const isAdmin = currentUser?.rol === 'administrador'
  // Un administrador también puede comprar si activó su perfil de cliente
  // (ver handleEnableClientProfile), por eso esto ya no depende solo del rol.
  const canOrder = currentUser?.es_cliente === true
  const cartCount = cart.reduce((sum, item) => sum + item.cantidad, 0)
  const cartQuantities = Object.fromEntries(
    cart.map((item) => [item.id_producto, item.cantidad])
  )

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  function showToast(message, type = 'success') {
    nextToastId.current += 1
    // Capture the id now: React runs the updater below later, and when
    // showToast is called several times in a row (e.g. accepting an AI
    // suggestion) every toast would otherwise read the last counter value.
    const toastId = nextToastId.current
    setToasts((prev) => [...prev, { id: toastId, message, type }])
  }

  function handleAuthSuccess(user) {
    setCurrentUser(user)
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
    setIsAuthOpen(false)
  }

  function handleLogout() {
    setCurrentUser(null)
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    setView('catalogo')
    setCart([])
    setIsCartOpen(false)
  }

  async function handleEnableClientProfile() {
    try {
      const updatedUser = { ...currentUser, ...(await enableClientProfile(currentUser.token)) }
      setCurrentUser(updatedUser)
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser))
      showToast('Ahora también podés comprar como cliente.')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Se conserva el token (la API no lo devuelve al actualizar el perfil) y
  // se pisan los datos viejos, por ejemplo el nombre del saludo del header.
  function handleProfileUpdated(updatedClient) {
    const updatedUser = { ...currentUser, ...updatedClient }
    setCurrentUser(updatedUser)
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser))
  }

  // Adds one unit of the product to the cart without ever going over its
  // stock. Shared by addToCart (one product from the catalog, with its
  // own toast) and addProductsToCart (several from an AI suggestion: the
  // caller shows a single summary toast).
  function addProductToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id_producto === product.id_producto)
      const quantityInCart = existing?.cantidad ?? 0
      if (getRemainingStock(product, quantityInCart) === 0) return prev

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
          imagen_url: product.imagen_url,
          cantidad: 1,
        },
      ]
    })
  }

  function addToCart(product) {
    const quantityInCart = cartQuantities[product.id_producto] ?? 0
    if (getRemainingStock(product, quantityInCart) === 0) return

    addProductToCart(product)
    showToast(`Se agregó ${product.nombre} al carrito`)
  }

  // Adds one unit of each product; shows no toast itself so the caller
  // can summarize the whole operation in a single message.
  function addProductsToCart(products) {
    products.forEach(addProductToCart)
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

  // El carrito guarda una "foto" del stock de cada producto en el momento
  // en que se agrega. Esa foto queda vieja si el stock cambia mientras el
  // producto sigue en el carrito (por ejemplo, otro cliente compra el mismo
  // producto). Esta función vuelve a consultar el stock real al backend y
  // ajusta las cantidades del carrito si hace falta, para no dejar que el
  // usuario confirme un pedido con una cantidad que ya no está disponible.
  async function refreshCartStock() {
    if (cart.length === 0) return { cart, didClamp: false }

    try {
      const products = await getProducts()
      let didClamp = false

      const nextCart = cart
        .map((item) => {
          const product = products.find((p) => p.id_producto === item.id_producto)
          if (!product) {
            didClamp = true
            return null
          }

          const nextQuantity = Math.min(item.cantidad, product.stock)
          if (nextQuantity !== item.cantidad) didClamp = true

          return { ...item, stock: product.stock, cantidad: nextQuantity }
        })
        .filter((item) => item !== null && item.cantidad > 0)

      setCart(nextCart)
      return { cart: nextCart, didClamp }
    } catch {
      return { cart, didClamp: false }
    }
  }

  function openCart() {
    // Dispara la revalidación del stock apenas se abre el carrito, sin
    // esperar la respuesta, para que la cantidad máxima del input no
    // quede mostrando el valor viejo mientras el pedido sigue abierto.
    refreshCartStock()
    setIsCartOpen(true)
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
            {canOrder && (
              <>
                <button
                  type="button"
                  className={view === 'mis-compras' ? 'is-active' : ''}
                  onClick={() => changeView('mis-compras')}
                >
                  Mis compras
                </button>
                <button
                  type="button"
                  className={view === 'mis-sugerencias' ? 'is-active' : ''}
                  onClick={() => changeView('mis-sugerencias')}
                >
                  Mis sugerencias
                </button>
                <button
                  type="button"
                  className={view === 'mi-perfil' ? 'is-active' : ''}
                  onClick={() => changeView('mi-perfil')}
                >
                  Mi perfil
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <button
                  type="button"
                  className={view === 'admin' ? 'is-active' : ''}
                  onClick={() => changeView('admin')}
                >
                  Productos
                </button>
                <button
                  type="button"
                  className={view === 'admin-orders' ? 'is-active' : ''}
                  onClick={() => changeView('admin-orders')}
                >
                  Pedidos
                </button>
                <button
  type="button"
  className={view === 'admin-clients' ? 'is-active' : ''}
  onClick={() => changeView('admin-clients')}
>
  Clientes
</button>

<button
  type="button"
  className={view === 'admin-discounts' ? 'is-active' : ''}
  onClick={() => changeView('admin-discounts')}
>
  Descuentos
</button>

<button
  type="button"
  className={view === 'admin-admins' ? 'is-active' : ''}
  onClick={() => changeView('admin-admins')}
>
  Administradores
</button>
</>
)}
          </nav>

          <div className="nav-actions">
            {canOrder && (
              <button type="button" className="icon-btn" onClick={openCart}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span className="nav-action-label">Pedido</span>
                {cartCount > 0 && (
                  <span key={cartCount} className="cart-count cart-count-bump tabnum">{cartCount}</span>
                )}
              </button>
            )}

            {currentUser ? (
              <div className="user-menu">
                <span>Hola, {currentUser.nombre}</span>
                {isAdmin && !canOrder && (
                  <button type="button" onClick={handleEnableClientProfile}>Habilitar compras</button>
                )}
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
            <>
              <button type="button" onClick={() => changeView('admin')}>Productos</button>
              <button type="button" onClick={() => changeView('admin-orders')}>Pedidos</button>
              <button type="button" onClick={() => changeView('admin-clients')}>Clientes</button>
              <button type="button" onClick={() => changeView('admin-discounts')}>Descuentos</button>
              <button type="button" onClick={() => changeView('admin-admins')}>Administradores</button>
            </>
          )}
          {canOrder && (
            <>
              <button type="button" onClick={() => { openCart(); setIsMenuOpen(false) }}>
                Mi pedido ({cartCount})
              </button>
              <button type="button" onClick={() => changeView('mis-compras')}>Mis compras</button>
              <button type="button" onClick={() => changeView('mis-sugerencias')}>Mis sugerencias</button>
              <button type="button" onClick={() => changeView('mi-perfil')}>Mi perfil</button>
            </>
          )}
        </nav>
      </header>

      <main className="app-content">
        {view === 'admin-orders' && isAdmin ? (
          <AdminOrders token={currentUser.token} showToast={showToast} />
        ) : view === 'admin-clients' && isAdmin ? (
          <AdminClients token={currentUser.token} showToast={showToast} />
        ) : view === 'admin-discounts' && isAdmin ? (
          <AdminDiscounts token={currentUser.token} showToast={showToast} />
        ) : view === 'admin-admins' && isAdmin ? (
          <AdminAdministrators currentUser={currentUser} showToast={showToast} onSelfUpdated={handleProfileUpdated} />
        ) : view === 'admin' && isAdmin ? (
          <AdminProducts token={currentUser.token} showToast={showToast} />
        ) : view === 'mis-compras' && canOrder ? (
          <MyOrders token={currentUser.token} showToast={showToast} />
        ) : view === 'mis-sugerencias' && canOrder ? (
          <MySuggestions
            cart={cart}
            cartQuantities={cartQuantities}
            token={currentUser.token}
            addProductsToCart={addProductsToCart}
            onGoToProfile={() => changeView('mi-perfil')}
            showToast={showToast}
          />
        ) : view === 'mi-perfil' && canOrder ? (
          <ClientProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} showToast={showToast} />
        ) : (
          <ProductCatalog
            cartQuantities={cartQuantities}
            onAddToCart={canOrder ? addToCart : undefined}
            showDiscountInfo={canOrder && !isAdmin}
            showToast={showToast}
          />
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
          cartQuantities={cartQuantities}
          token={currentUser?.token}
          userId={currentUser?.id_usuario}
          deliveryAddress={currentUser?.direccion_entrega ?? ''}
          discountCategory={currentUser?.descuento_categoria ?? null}
          discountPercentage={currentUser?.descuento_porcentaje ?? null}
          addProductsToCart={addProductsToCart}
          onGoToProfile={() => {
            setIsCartOpen(false)
            changeView('mi-perfil')
          }}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onOrderPlaced={clearCart}
          onRevalidateStock={refreshCartStock}
          showToast={showToast}
          onClose={() => setIsCartOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
