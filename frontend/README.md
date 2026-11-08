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

En desarrollo (`npm run dev`), Vite ya resuelve estas rutas. En una publicación de producción, el servidor HTTP que aloje `frontend/dist` debe devolver `index.html` para cualquier ruta que no corresponda a un archivo estático. Las autorizaciones de la API siguen a cargo del backend.

Por ejemplo, si el entorno elegido usa Nginx para servir el contenido generado de `frontend/dist`, el bloque de la aplicación debe incluir:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Este es un ejemplo para un despliegue con Nginx, no una afirmación sobre el proveedor utilizado por DOSIS. Si se usa Apache, un servicio de hosting estático u otro servidor, se debe configurar su mecanismo equivalente de *SPA fallback* o *rewrite* hacia `/index.html`. Los archivos reales, como los recursos dentro de `/assets`, deben seguir sirviéndose normalmente.

### Detalle de productos

`/catalogo/:productSlug` abre la ficha del producto, por ejemplo `/catalogo/whey-protein-12`. El nombre se convierte a minúsculas, sin tildes y con guiones; el ID siempre se incluye para que eliminar o renombrar otro producto no cambie la URL. Las URLs generadas por la primera versión, que no siempre incluían el ID, continúan resolviéndose para conservar enlaces y marcadores existentes. Se puede abrir el enlace directamente, recargarlo o usar Atrás/Adelante; cerrar la ficha vuelve a `/catalogo`.
