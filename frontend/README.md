# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Migración de descuentos en pedidos

Si la base de datos ya existía antes de incorporar descuentos, ejecutá una vez este comando desde la carpeta `backend`:

```bash
npm run migrate:pedido-descuento
```

Agrega a la tabla `pedido` el subtotal y los datos del descuento aplicado. El comando es seguro de repetir: no elimina pedidos ni vuelve a crear columnas existentes.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Rutas del frontend

El frontend usa BrowserRouter. Cada pantalla tiene su propia URL:

| URL | Acceso |
| --- | --- |
| `/catalogo` | Público |
| `/mis-compras` | Perfil de cliente habilitado |
| `/mis-sugerencias` | Perfil de cliente habilitado |
| `/mi-perfil` | Perfil de cliente habilitado |
| `/admin/productos` | Administrador |
| `/admin/pedidos` | Administrador |
| `/admin/clientes` | Administrador |
| `/admin/descuentos` | Administrador |
| `/admin/administradores` | Administrador |

La raíz `/`, las rutas desconocidas y los accesos sin permisos redirigen a `/catalogo`. El ingreso y el carrito conservan su presentación como modales. La navegación admite Atrás/Adelante y acceso directo con la sesión guardada.

En producción, el servidor que aloje `frontend/dist` debe servir `index.html` para las rutas del frontend que no correspondan a archivos estáticos. Esto permite abrir enlaces directos y recargar una pantalla sin recibir un 404. Vite ya resuelve estas rutas durante el desarrollo. Las autorizaciones de la API siguen a cargo del backend.

### Detalle de productos

`/catalogo/:productSlug` abre la ficha del producto, por ejemplo `/catalogo/whey-protein`. El nombre se convierte a minúsculas, sin tildes, con guiones entre palabras. Si hay nombres repetidos, se agrega el ID para distinguirlos. Se puede abrir el enlace directamente, recargarlo o usar Atrás/Adelante; cerrar la ficha vuelve a `/catalogo`. Los nombres se resuelven contra el catálogo actual: renombrar o eliminar un producto puede invalidar su enlace anterior.
