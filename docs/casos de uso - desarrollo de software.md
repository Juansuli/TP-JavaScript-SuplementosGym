**Casos de Uso**

E-commerce de Suplementos Nutricionales con IA

UTN FRRo — Desarrollo de Software

# CUU1: Eliminar producto

**Actor:**

Administrador

**Curso Básico (CB):**

1. Administrador inicia sesión con su cuenta.
2. Administrador selecciona el producto a eliminar del catálogo.
3. Sistema solicita confirmación de la baja.
4. Administrador confirma la eliminación.
5. Sistema da de baja el producto del catálogo.

**Cursos Alternativos (CA):**

2.a \<durante\> El producto tiene pedidos asociados.
	2.a.1 Sistema no permite la baja física y marca el producto como "Descontinuado" (baja lógica).
4.a \<durante\> Administrador cancela la confirmación.
	4.a.1 FCU.

**Precondiciones:**

* El producto existe en el catálogo. (Ver CUU8)

**Postcondiciones:**

* Producto eliminado, o marcado como descontinuado si tenía pedidos asociados.

# CUU2: Realizar pedido

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente inicia sesión con su cuenta pre-creada.
2. Cliente selecciona los productos que va a comprar.
3. Sistema muestra una sugerencia basada en IA. (Ver CUU6)
4. Cliente confirma su carrito con todos los productos seleccionados.
5. Cliente indica la forma de pago elegida.
6. Cliente confirma el pago.
7. Sistema registra el pedido y actualiza el stock. (Ver CUU3)

**Cursos Alternativos (CA):**

2.a \<durante\> Producto no tiene stock solicitado.
	2.a.1 Sistema informa la situación.
3.a \<durante\> Cliente rechaza sugerencia de la IA.
	3.a.1 Prosigue con el paso 4.
3.b \<durante\> Cliente acepta sugerencia de la IA.
	3.b.1 Sistema agrega sugerencia al carrito.

**Precondiciones:**

* El cliente ya tiene una cuenta creada. (Ver CUU7)

**Postcondiciones:**

* Pedido registrado en el sistema.
* Stock de productos actualizado.

# CUU3: Actualizar stock de producto

**Actor:**

Sistema (automático al confirmar pedido)

**Curso Básico (CB):**

1. Sistema registra la cantidad del producto vendida.
2. Sistema actualiza tabla de stock.

**Cursos Alternativos (CA):**

2.a \<durante\> La cantidad a descontar es igual al stock disponible.
	2.a.1 Sistema actualiza tabla de stock.
	2.a.2 Sistema cambia estado de producto a "Agotado".

**Precondiciones:**

* Sistema registra una nueva compra. (Ver CUU2)

**Postcondiciones:**

* Stock de cada producto involucrado actualizado correctamente.

# CUU4: Editar perfil del cliente

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente selecciona la opción de editar su perfil.
2. Sistema muestra los datos actuales del perfil.
3. Cliente modifica el dato deseado. [\* Se repite las veces que desee]
4. Sistema valida el dato ingresado.
5. Sistema registra la modificación.

**Cursos Alternativos (CA):**

4.a \<durante\> El dato ingresado no es válido.
	4.a.1 Sistema informa el error.
	4.a.2 Retorna al paso 3.

**Precondiciones:**

* El cliente tiene un perfil creado. (Ver CUU7)

**Postcondiciones:**

* Perfil de cliente actualizado.

# CUU5: Dejar reseña de producto

**Actor:**

Cliente

**Curso Básico (CB):**

1. Cliente inicia sesión con su cuenta.
2. Cliente selecciona un producto que compró previamente.
3. Sistema solicita puntuación y comentario.
4. Cliente ingresa puntuación (1 a 5) y comentario opcional.
5. Sistema valida que el producto pertenezca a un pedido del cliente.
6. Sistema registra la reseña y la muestra en el detalle del producto.

**Cursos Alternativos (CA):**

5.a \<durante\> El cliente no compró el producto seleccionado.
	5.a.1 Sistema informa que solo se puede reseñar productos comprados. FCU.

**Precondiciones:**

* El cliente realizó un pedido que incluye el producto a reseñar. (Ver CUU2)

**Postcondiciones:**

* Reseña registrada y visible en el detalle del producto.
