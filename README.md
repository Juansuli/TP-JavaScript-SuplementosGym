# DOSIS

E-commerce de suplementos nutricionales con Inteligencia Artificial, desarrollado para la materia Desarrollo de Software de UTN FRRo.

DOSIS es un sitio web para la venta de suplementos deportivos. Permite administrar un inventario de productos con información nutricional y, a los clientes registrados, les ofrece sugerencias de productos adaptadas a su perfil y a su plan de entrenamiento mediante IA.

## Integrantes

- 54007 - De Giorgi, Juan Ignacio
- 54457 - Favaretto, Bianca
- 53752 - Nicora Manassero, Sol
- 54006 - Scaldini, Angelo

## Documentación del proyecto

La documentación académica (propuesta, casos de uso, DER y más) está en [docs/README.md](docs/README.md).

## Tecnologías

- **Frontend** (`frontend/`): React 19, React Router, Vite.
- **Backend** (`backend/`): Node.js, Express 5, Sequelize (ORM) y MySQL.
- **IA**: Google Gemini (API REST).
- **Tests**: `node:test` (backend), Vitest + Testing Library (frontend) y Playwright (end-to-end).

## Requisitos previos

- [Node.js](https://nodejs.org/) 22.12 o superior (el frontend usa Vite 8, que requiere Node 20.19+ o 22.12+). Incluye `npm`.
- Un servidor [MySQL](https://dev.mysql.com/downloads/) en funcionamiento.
- (Opcional) Una clave de la API de Gemini para las sugerencias de IA.

## Instalación

### 1. Clonar el repositorio

```cmd
git clone https://github.com/Juansuli/TP-JavaScript-SuplementosGym.git
cd TP-JavaScript-SuplementosGym
```

### 2. Crear la base de datos

Crear una base de datos vacía en MySQL. El nombre por defecto es `suplementos_gym`:

```sql
CREATE DATABASE suplementos_gym;
```

No hace falta crear las tablas a mano: el backend las crea solo al arrancar (`sequelize.sync()` en `backend/src/app.js`). Las migraciones de la sección [Migraciones de base de datos](#migraciones-de-base-de-datos) solo son necesarias si ya tenían una base creada con una versión vieja del proyecto.

### 3. Configurar las variables de entorno

Copiar los archivos de ejemplo:

```cmd
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Editar `backend/.env`:

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del backend. Por defecto `3001`. |
| `DB_HOST` | Host de MySQL. Por defecto `localhost`. |
| `DB_PORT` | Puerto de MySQL. Por defecto `3306`. |
| `DB_USER` | Usuario de MySQL. Por defecto `root`. |
| `DB_PASSWORD` | Contraseña de ese usuario (puede estar vacía). |
| `DB_NAME` | Nombre de la base de datos. Por defecto `suplementos_gym`. |
| `JWT_SECRET` | Clave secreta para firmar los tokens de login. **Obligatoria**, de al menos 32 caracteres: si no, el backend no arranca. Se puede generar con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `JWT_EXPIRES_IN` | Duración de la sesión. Debe llevar unidad (`30m`, `2h`, `7200s`); un número solo hace que el backend no arranque. |
| `GEMINI_API_KEY` | Clave de la API de Gemini (ver más abajo). Opcional. |
| `GEMINI_MODEL` | Modelo de Gemini principal. Solo cambiarlo si el de por defecto deja de estar disponible. |
| `GEMINI_FALLBACK_MODEL` | Modelo de respaldo, usado una sola vez si el principal está sobrecargado o sin cuota. |

Variables opcionales que lee `backend/src/config/db.js` pero no están en `.env.example`; solo hacen falta si la base de datos exige conexión cifrada (por ejemplo, una base en la nube):

| Variable | Descripción |
| --- | --- |
| `DB_SSL` | Poner `true` para conectarse a MySQL con SSL. |
| `DB_SSL_CA` | Contenido del certificado de la autoridad certificante (CA) del servidor. |

Editar `frontend/.env`:

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL del backend. Por defecto `http://localhost:3001` (debe coincidir con `PORT`). |

#### Obtener una `GEMINI_API_KEY` (gratis)

1. Entrar a [Google AI Studio](https://aistudio.google.com/apikey) con una cuenta de Google.
2. Crear una clave de API ("Create API key").
3. Pegarla en `backend/.env`: `GEMINI_API_KEY=la_clave_copiada`.

La clave es secreta: no se sube al repositorio ni se pone en el frontend.

Si `GEMINI_API_KEY` queda vacía, el resto de la aplicación funciona con normalidad, pero al pedir una sugerencia de IA el backend responde un error (HTTP 503, "La función de sugerencias no está configurada.").

### 4. Instalar las dependencias

Desde la raíz del proyecto:

```cmd
npm --prefix backend install
npm --prefix frontend install
```

## Ejecución

Se necesitan dos terminales, una para cada parte.

**Backend** (puerto `3001` por defecto):

```cmd
cd backend
npm run dev
```

`npm run dev` usa nodemon y reinicia el servidor al guardar cambios. Para ejecutarlo sin reinicio automático se usa `npm start`. Al arrancar bien, la consola muestra `Backend listening on http://localhost:3001`.

**Frontend** (puerto `5173`, el de por defecto de Vite):

```cmd
cd frontend
npm run dev
```

Abrir en el navegador la URL que muestra la consola: <http://localhost:5173>.

## Primer uso

### Registrarse como cliente

Desde la página, usar el botón de ingreso y elegir registrarse. La contraseña debe tener al menos 8 caracteres. Las cuentas que se crean desde la app siempre son de cliente.

### Obtener un usuario administrador

La aplicación **no trae un administrador creado** ni un script para crearlo, y la API de administradores (`/api/administradores`) solo puede usarla un administrador ya logueado. Por eso el primer administrador se crea a mano en la base de datos, a partir de una cuenta registrada:

1. Registrarse desde la app con el email que será administrador.
2. Ejecutar en MySQL (reemplazando el email) sobre la base `suplementos_gym`:

   ```sql
   UPDATE usuario SET rol = 'administrador' WHERE email = 'admin@ejemplo.com';

   INSERT INTO administrador (id_administrador)
   SELECT id_usuario FROM usuario WHERE email = 'admin@ejemplo.com';
   ```

3. Cerrar sesión y volver a iniciarla, para que el token incluya el rol nuevo.

Con ese administrador ya se pueden crear más desde el panel de administración.

## Tests

Backend (`node --test`):

```cmd
npm --prefix backend test
```

Frontend (Vitest):

```cmd
npm --prefix frontend test
```

End-to-end (Playwright): ver la sección siguiente.

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

## Baja logica de productos

Se utiliza el campo existente estado: Borrar lo cambia a inhabilitado, oculta el producto del catalogo y conserva sus datos e imagen. En administracion aparece Restablecer, con confirmacion, que lo cambia a habilitado. El stock determina si puede comprarse. No requiere columnas nuevas ni migraciones. Los estados antiguos siguen siendo compatibles.
