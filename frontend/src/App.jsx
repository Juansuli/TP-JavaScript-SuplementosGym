import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import AccountMenu from './components/AccountMenu'
import ToastStack from './components/ToastStack'
import { getRemainingStock, revalidateCartStock } from './utils/stock'
import { enableClientProfile } from './services/client.service'
import { getProducts } from './services/product.service'
import './App.css'

const VIEW_PATHS = {
  catalog: '/catalogo',
  'my-orders': '/mis-compras',
  'my-suggestions': '/mis-sugerencias',
  'my-profile': '/mi-perfil',
  admin: '/admin/productos',
  'admin-orders': '/admin/pedidos',
  'admin-clients': '/admin/clientes',
  'admin-discounts': '/admin/descuentos',
  'admin-admins': '/admin/administradores',
}

const CURRENT_USER_STORAGE_KEY = 'dosis_current_user'
const CLIENT_PATHS = new Set(['/mis-compras', '/mis-sugerencias', '/mi-perfil'])
const ADMIN_PATHS = new Set([
  '/admin/productos',
  '/admin/pedidos',
  '/admin/clientes',
  '/admin/descuentos',
  '/admin/administradores',
])

function getDefaultPath(user) {
  return user?.rol === 'administrador' ? '/admin/productos' : '/catalogo'
}

function canAccessPath(user, destination) {
  if (!user || typeof destination !== 'string' || !destination.startsWith('/') || destination.startsWith('//')) {
    return false
  }

  const pathname = destination.split(/[?#]/, 1)[0]
  if (ADMIN_PATHS.has(pathname)) return user.rol === 'administrador'
  if (CLIENT_PATHS.has(pathname)) return user.es_cliente === true && user.activo !== false
  return pathname === '/catalogo' || pathname.startsWith('/catalogo/')
}

function ProtectedRoute({ currentUser, allowed, children }) {
  const location = useLocation()
  if (!currentUser) {
    const pendingPath = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/catalogo" replace state={{ pendingPath }} />
  }
  if (!allowed) return <Navigate to={getDefaultPath(currentUser)} replace />
  return children
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location
  const view = Object.keys(VIEW_PATHS).find((key) => VIEW_PATHS[key] === pathname || (key === 'catalog' && pathname.startsWith('/catalogo/')))
  const [currentUser, setCurrentUser] = useState(loadStoredUser)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const nextToastId = useRef(0)
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    setIsMenuOpen(false)
    if (previousPathRef.current !== pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      previousPathRef.current = pathname
    }
  }, [pathname])

  const isAdmin = currentUser?.rol === 'administrador'
  // Un administrador también puede comprar si activó su perfil de cliente
  // (ver handleEnableClientProfile), por eso esto ya no depende solo del rol.
  const canOrder = currentUser?.es_cliente === true && currentUser?.activo !== false
  const cartCount = cart.reduce((sum, item) => sum + item.cantidad, 0)
  const cartQuantities = Object.fromEntries(
    cart.map((item) => [item.id_producto, item.cantidad])
  )
  // Última versión del carrito, para las funciones asíncronas que siguen
  // esperando al backend mientras el usuario lo modifica.
  const cartRef = useRef(cart)
  const lastStockRefreshId = useRef(0)
  const isCartSavingRef = useRef(false)
  const pendingSuggestedProductsRef = useRef([])

  // Mantiene una sola versión canónica del carrito. La referencia se
  // actualiza en el mismo momento que se encola el render, para que las
  // operaciones asíncronas nunca trabajen con una versión anterior.
  function updateCart(updater) {
    const nextCart = typeof updater === 'function' ? updater(cartRef.current) : updater
    cartRef.current = nextCart
    setCart(nextCart)
    return nextCart
  }

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
    const pendingPath = location.state?.pendingPath
    const destination = canAccessPath(user, pendingPath) ? pendingPath : getDefaultPath(user)
    navigate(destination, { replace: true, state: null })
  }

  function handleLogout() {
    if (isCartSavingRef.current) return
    setCurrentUser(null)
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    navigate('/catalogo', { replace: true })
    lastStockRefreshId.current += 1
    updateCart([])
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
    if (isCartSavingRef.current) return false
    updateCart((prev) => {
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
    return true
  }

  function addToCart(product) {
    const quantityInCart = cartQuantities[product.id_producto] ?? 0
    if (getRemainingStock(product, quantityInCart) === 0) return

    if (!addProductToCart(product)) return
    showToast(`Se agregó ${product.nombre} al carrito`)
  }

  // Adds one unit of each product; shows no toast itself so the caller
  // can summarize the whole operation in a single message.
  function addProductsToCart(products) {
    // Una sugerencia iniciada antes de confirmar puede terminar mientras el
    // POST sigue pendiente. Se conserva, pero recién se aplica al terminar
    // para que nunca cambie el pedido que ya confirmó el usuario.
    if (isCartSavingRef.current) {
      pendingSuggestedProductsRef.current.push(...products)
      return true
    }
    products.forEach(addProductToCart)
    return true
  }

  function updateCartQuantity(productId, quantity) {
    if (isCartSavingRef.current) return
    updateCart((prev) =>
      prev.map((item) => {
        if (item.id_producto !== productId) return item
        const clamped = Math.max(1, Math.min(quantity || 1, item.stock))
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
  async function refreshCartStock(cartSnapshot) {
    // Al confirmar, Cart entrega la foto exacta que el usuario aceptó. Al
    // abrir el carrito no hay foto y se usa la versión más reciente para
    // seguir respetando las ediciones hechas mientras responde el backend.
    const cartToRevalidate = Array.isArray(cartSnapshot) ? cartSnapshot : cartRef.current

    if (cartToRevalidate.length === 0) {
      return {
        cart: cartToRevalidate,
        didClamp: false,
        didChangePrice: false,
        removedItems: [],
        isStale: false,
      }
    }

    lastStockRefreshId.current += 1
    const refreshId = lastStockRefreshId.current

    try {
      const products = await getProducts()

      // Si mientras se esperaba empezó otra consulta, esta respuesta es más
      // vieja que la de esa consulta y no tiene que pisarla.
      if (refreshId !== lastStockRefreshId.current) {
        return {
          cart: cartRef.current,
          didClamp: false,
          didChangePrice: false,
          removedItems: [],
          isStale: true,
        }
      }

      // Al abrir se aplica sobre el carrito actual, que pudo editarse durante
      // la espera. Al confirmar se conserva la foto aceptada por el usuario.
      const sourceCart = Array.isArray(cartSnapshot) ? cartToRevalidate : cartRef.current
      const result = revalidateCartStock(sourceCart, products)
      updateCart(result.cart)
      result.removedItems.forEach((item) => {
        showToast(`Se quitó ${item.nombre} del pedido porque ya no está disponible.`, 'error')
      })
      return { ...result, isStale: false }
    } catch {
      const isStale = refreshId !== lastStockRefreshId.current
      return {
        cart: Array.isArray(cartSnapshot) ? cartToRevalidate : cartRef.current,
        didClamp: false,
        didChangePrice: false,
        removedItems: [],
        isStale,
      }
    }
  }

  function openCart() {
    // Dispara la revalidación del stock apenas se abre el carrito, sin
    // esperar la respuesta, para que la cantidad máxima del input no
    // quede mostrando el valor viejo mientras el pedido sigue abierto.
    refreshCartStock()
    setIsCartOpen(true)
  }

  function closeCart() {
    if (isCartSavingRef.current) return
    // Invalida también una revalidación iniciada por "Confirmar pedido".
    // Si su respuesta llega después, Cart no puede usarla para crear el pedido.
    lastStockRefreshId.current += 1
    setIsCartOpen(false)
  }

  function removeFromCart(productId) {
    if (isCartSavingRef.current) return
    updateCart((prev) => prev.filter((item) => item.id_producto !== productId))
  }

  function handleCartSavingChange(isSaving) {
    isCartSavingRef.current = isSaving
    if (!isSaving && pendingSuggestedProductsRef.current.length > 0) {
      const pendingProducts = pendingSuggestedProductsRef.current
      pendingSuggestedProductsRef.current = []
      pendingProducts.forEach(addProductToCart)
    }
  }

  function clearCart() {
    updateCart([])
  }

  function goToView(nextView) {
    navigate(VIEW_PATHS[nextView])
    setIsMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="wrap nav-inner">
          <Link className="brand" to="/catalogo">
            DO<span>SIS</span>
          </Link>

          <nav className="nav-links" aria-label="Navegación principal">
            <NavLink to="/catalogo" className={({ isActive }) => isActive ? 'is-active' : ''}>
              Catálogo
            </NavLink>
            {canOrder && !isAdmin && (
              <>
                <NavLink to="/mis-compras" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Mis compras
                </NavLink>
                <NavLink to="/mis-sugerencias" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Mis sugerencias
                </NavLink>
                <NavLink to="/mi-perfil" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Mi perfil
                </NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink to="/admin/productos" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Productos
                </NavLink>
                <NavLink to="/admin/pedidos" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Pedidos
                </NavLink>
                <NavLink to="/admin/clientes" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Clientes
                </NavLink>
                <NavLink to="/admin/descuentos" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Descuentos
                </NavLink>
                <NavLink to="/admin/administradores" className={({ isActive }) => isActive ? 'is-active' : ''}>
                  Administradores
                </NavLink>
                {canOrder && <AccountMenu view={view} />}
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
          <NavLink to="/catalogo">Catálogo</NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/productos">Productos</NavLink>
              <NavLink to="/admin/pedidos">Pedidos</NavLink>
              <NavLink to="/admin/clientes">Clientes</NavLink>
              <NavLink to="/admin/descuentos">Descuentos</NavLink>
              <NavLink to="/admin/administradores">Administradores</NavLink>
            </>
          )}
          {canOrder && (
            <>
              <button type="button" onClick={() => { openCart(); setIsMenuOpen(false) }}>
                Mi pedido ({cartCount})
              </button>
              {isAdmin ? <AccountMenu view={view} /> : <>
              <NavLink to="/mis-compras">Mis compras</NavLink>
              <NavLink to="/mis-sugerencias">Mis sugerencias</NavLink>
              <NavLink to="/mi-perfil">Mi perfil</NavLink>
              </>}
            </>
          )}
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/catalogo" replace />} />
          <Route path="/catalogo/:productSlug?" element={<ProductCatalog
            cartQuantities={cartQuantities}
            onAddToCart={canOrder ? addToCart : undefined}
            showDiscountInfo={canOrder && !isAdmin}
            showToast={showToast}
          />} />
          <Route path="/admin/pedidos" element={
            <ProtectedRoute currentUser={currentUser} allowed={isAdmin}>
              <AdminOrders token={currentUser?.token} showToast={showToast} />
            </ProtectedRoute>
          } />
          <Route path="/admin/clientes" element={
            <ProtectedRoute currentUser={currentUser} allowed={isAdmin}>
              <AdminClients token={currentUser?.token} showToast={showToast} />
            </ProtectedRoute>
          } />
          <Route path="/admin/descuentos" element={
            <ProtectedRoute currentUser={currentUser} allowed={isAdmin}>
              <AdminDiscounts token={currentUser?.token} showToast={showToast} />
            </ProtectedRoute>
          } />
          <Route path="/admin/administradores" element={
            <ProtectedRoute currentUser={currentUser} allowed={isAdmin}>
              <AdminAdministrators currentUser={currentUser} showToast={showToast} onSelfUpdated={handleProfileUpdated} />
            </ProtectedRoute>
          } />
          <Route path="/admin/productos" element={
            <ProtectedRoute currentUser={currentUser} allowed={isAdmin}>
              <AdminProducts token={currentUser?.token} showToast={showToast} />
            </ProtectedRoute>
          } />
          <Route path="/mis-compras" element={
            <ProtectedRoute currentUser={currentUser} allowed={canOrder}>
              <MyOrders token={currentUser?.token} showToast={showToast} />
            </ProtectedRoute>
          } />
          <Route path="/mis-sugerencias" element={
            <ProtectedRoute currentUser={currentUser} allowed={canOrder}>
              <MySuggestions
                cart={cart}
                cartQuantities={cartQuantities}
                token={currentUser?.token}
                addProductsToCart={addProductsToCart}
                onGoToProfile={() => goToView('my-profile')}
                showToast={showToast}
              />
            </ProtectedRoute>
          } />
          <Route path="/mi-perfil" element={
            <ProtectedRoute currentUser={currentUser} allowed={canOrder}>
              <ClientProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} showToast={showToast} />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </main>

      <footer className="site-footer wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="brand">DO<span>SIS</span></span>
            <p>Suplementos deportivos con información clara para elegir mejor.</p>
          </div>
          <div className="footer-col">
            <h4>Productos</h4>
            <Link to="/catalogo">Catálogo</Link>
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
            closeCart()
            goToView('my-profile')
          }}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onOrderPlaced={clearCart}
          onRevalidateStock={refreshCartStock}
          onSavingChange={handleCartSavingChange}
          showToast={showToast}
          onClose={closeCart}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
