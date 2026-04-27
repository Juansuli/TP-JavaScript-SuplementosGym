**Casos de Uso**

E-commerce de Suplementos Nutricionales con IA

UTN FRRo — Desarrollo de Software

# **CUU1: Consultar IA**

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente inicia sesión en su cuenta pre-creada.  
2. Cliente solicita información recaudada por la IA.  
3. Sistema muestra plan creado por la IA.  
4. Cliente acepta sugerencia.  
5. Sistema agrega sugerencia al carrito.

**Cursos Alternativos (CA):**

4.a \<durante\> Cliente rechaza la sugerencia de la IA.  
	4.a.1 FCU.

**Precondiciones:**

* Cliente ya tiene una cuenta creada.

**Postcondiciones:**

* Sugerencia aceptada o rechazada.

# **CUU2: Realizar pedido**

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente inicia sesión con su cuenta pre-creada.  
2. Cliente selecciona los productos que va a comprar.  
3. Sistema muestra una sugerencia basada en IA.  
4. Cliente confirma su carrito con todos los productos seleccionados.  
5. Cliente indica la forma de pago elegida.  
6. Cliente confirma el pago.  
7. Sistema registra el pedido y actualiza el stock. (Ver CUU4)

**Cursos Alternativos (CA):**

2.a \<durante\> Producto no tiene stock solicitado.  
	2.a.1 Sistema informa la situación.  
3.a \<durante\> Cliente rechaza sugerencia de la IA.  
	3.a.1 Prosigue con el paso 4\.  
3.b. \<durante\> Cliente acepta sugerencia de la IA.  
	3.b.1 Sistema agrega sugerencia al carrito.

**Precondiciones:**

* El cliente ya tiene una cuenta creada.

**Postcondiciones:**

* Pedido registrado en el sistema.   
* Stock de productos actualizado. 

# **CUU3: Registrar perfil de cliente**

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente ingresa a la aplicación web.  
2. Sistema solicita datos de registro.  
3. Cliente ingresa mail y contraseña.  
4. Sistema valida datos ingresados.  
5. Sistema solicita datos físicos y personales necesarios.  
6. Cliente ingresa sus datos.  
7. Sistema crea cuenta con datos proporcionados.

**Cursos Alternativos (CA):**

3.a \<durante\> Mail ingresado no válido.  
          3.a.1 Sistema informa error.  
          3.a.2 Cliente ingresa un mail válido.

**Precondiciones:**

* El cliente tiene acceso a la aplicación web.

**Postcondiciones:**

* Sistema registra un nuevo perfil de cliente.

# **CUU4: Actualizar stock de producto**

**Actor:**

Sistema (automático al confirmar pedido)

**Curso Básico (CB):**

1. Sistema registra la cantidad del producto vendida.  
2. Sistema actualiza tabla de stock.

**Cursos Alternativos (CA):**

2.a  \<durante\>  La cantidad a descontar es igual al stock disponible.

      2.a.1  Sistema actualiza tabla de stock. 

      2.a.2  Sistema cambia estado de producto a “Agotado”.

**Precondiciones:**

* Sistema registra una nueva compra. (Ver CUU2)

**Postcondiciones:**

* Stock de cada producto involucrado actualizado correctamente.

# **CUU5: Actualizar perfil de cliente**

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente selecciona la opción de editar su perfil.  
2. Sistema muestra los datos actuales del perfil.  
3. Cliente modifica el dato deseado. \[\* Se repite las veces que desee\]  
4. Sistema valida el dato ingresado.  
5. Sistema registra la modificación.

**Cursos Alternativos (CA):**

4.a  \<durante\>  El dato ingresado no es válido.

      4.a.1  Sistema informa el error.

      4.a.2  Retorna al paso 3\.

**Precondiciones:**

* El cliente tiene un perfil creado. (Ver CUU3)

**Postcondiciones:**

* Perfil de cliente actualizado.

# **CUU6: Crear producto**

**Actor:**

Administrador

**Curso Básico (CB) — Crear producto:**

1. Administrador inicia sesión con su cuenta.  
2. Administrador selecciona la opción de agregar nuevo producto.  
3. Sistema solicita los datos del producto.  
4. Administrador completa los datos solicitados por sistema.  
5. Sistema valida los datos ingresados.  
6. Sistema registra el nuevo producto en el catálogo.

**Cursos Alternativos (CA):**

5.a  \<durante\>  Datos del producto incompletos o inválidos.

      5.a.1  Sistema informa el error.

      5.a.2  Administrador corrige los datos. Retorna al paso 4\.

**Precondiciones:**

* El administrador tiene una cuenta con permisos de administración.

**Postcondiciones:**

* Nuevo producto registrado en el catálogo.

# **CUU7: Gestionar productos**

**Actor:**

Administrador

**Curso Básico (CB) — Reponer stock de producto existente:**

1. Administrador inicia sesión con su cuenta.  
2. Administrador selecciona el producto a reponer.  
3. Sistema muestra el stock actual del producto.  
4. Administrador ingresa la cantidad a agregar.  
5. Sistema actualiza el stock del producto.

**Cursos Alternativos (CA):**

4.b  \<durante\>  Cantidad de reposición negativa o cero.

      4.b.1  Sistema informa el error. FCU.

**Precondiciones:**

* El producto ya existe en el sistema.

**Postcondiciones:**

* Stock del producto existente actualizado.