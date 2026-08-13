import { useState } from 'react'
import ProductCatalog from './components/ProductCatalog'
import AdminProducts from './components/AdminProducts'
import './App.css'

function App() {
  const [view, setView] = useState('catalogo')

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
        <button
          type="button"
          className={view === 'admin' ? 'active' : ''}
          onClick={() => setView('admin')}
        >
          Administrar productos
        </button>
      </nav>

      {view === 'catalogo' ? <ProductCatalog /> : <AdminProducts />}
    </>
  )
}

export default App
