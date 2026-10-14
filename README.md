# DOSIS

E-commerce de suplementos nutricionales desarrollado para la materia Desarrollo de Software de UTN FRRo.

## Migraciones de base de datos

Si ya tenes una base de datos creada, ejecuta las migraciones pendientes desde la raiz del proyecto. Para la columna `estado` de las sugerencias de IA:

```cmd
npm --prefix backend run migrate:sugerencia-estado
```

## Prueba end-to-end

La prueba E2E verifica que un cliente inicia sesion, busca un producto disponible, lo agrega al pedido y lo visualiza en el carrito. No confirma el pedido ni modifica el stock.

### Requisitos

- MySQL configurado con las variables del archivo `backend/.env`.
- Node.js y las dependencias instaladas en `backend/` y `frontend/` con `npm install`.
- Chromium de Playwright instalado desde `frontend/`:

  ```cmd
  npx playwright install chromium
  ```

### Preparar y ejecutar

1. En una terminal, ir a `backend/` y preparar los datos de prueba:

   ```cmd
   npm run seed:e2e
   ```

   El script crea o actualiza el cliente `cliente.e2e@dosis.com` y el producto `PRODUCTO TEST E2E` con stock 10. El cliente incluye el perfil completo requerido para comprar.

2. En esa misma terminal, levantar el backend y dejarlo abierto:

   ```cmd
   npm run dev
   ```

3. En otra terminal, ir a `frontend/` y ejecutar el test:

   ```cmd
   npm run test:e2e
   ```

   Playwright inicia el frontend automaticamente. El resultado esperado es `1 passed`.

Para abrir la interfaz visual de Playwright durante el desarrollo:

```cmd
npm run test:e2e:ui
```
