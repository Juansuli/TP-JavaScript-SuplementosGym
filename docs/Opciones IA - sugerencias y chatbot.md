# Opciones para la IA: botón actual, preguntas preseleccionadas o chatbot

Fecha: 8/10/2026 · Rama: `feature/issue-47-ai-suggestions` · Issue: #47

## 1. Para qué sirve este documento

Juan dejó implementada una primera versión de la sugerencia con IA y se tuvo
que ir antes de definir **cómo seguir**. La idea original era algo parecido a
un chatbot (preguntas preseleccionadas y, quizás, preguntarle algo textual a la
IA). Lo que está hecho es más simple. Este documento explica:

1. Qué está hecho hoy y cómo se usa.
2. Las opciones para seguir, con ventajas y desventajas reales.
3. Qué medimos de Gemini, porque condiciona mucho la decisión.
4. Qué falta hacer sin importar la opción que elijan.

**No hay una decisión tomada.** Les toca a ustedes elegir. La sección 7 es una
opinión para ayudar, no una orden.

## 2. Qué está hecho hoy

Flujo del cliente (CUU2 paso 3 y CUU6):

1. El cliente tiene productos en el carrito y su perfil completo.
2. Toca **"Pedir sugerencia de IA"**. No escribe nada.
3. El backend arma un texto con el perfil del cliente (edad, género, peso,
   altura, ocupación, deporte, días de entrenamiento, objetivo), los nombres
   de lo que ya tiene en el carrito y los productos candidatos del catálogo
   (disponibles, con stock y que no estén en el carrito).
4. Gemini devuelve de 1 a 3 productos con un motivo corto cada uno.
5. El cliente elige **"Agregar al carrito"** (estado `aceptada`) o
   **"No, gracias"** (estado `rechazada`).
6. En **"Mis sugerencias"** ve el historial y puede borrar.

Qué se cuida:

- No se manda a la IA nombre, apellido, email ni dirección.
- Lo que devuelve la IA se valida en el servidor: solo ids que estaban en la
  lista de candidatos, sin repetir, máximo 3, motivo recortado a 300 caracteres.
- La API key vive solo en el backend y no se imprime en logs.
- Un cliente solo ve y modifica sus sugerencias. Una sugerencia ya respondida
  no se puede responder de nuevo (devuelve 409).

Dónde está el código:

| Parte | Archivo |
|---|---|
| Llamada a Gemini | `backend/src/services/gemini.service.js` |
| Lógica y prompt | `backend/src/controllers/sugerencia.controller.js` |
| Validaciones y rutas | `backend/src/middlewares/sugerencia-validation.middleware.js`, `backend/src/routes/sugerencia.routes.js` |
| Tests | `backend/tests/sugerencia-ia.test.js` |
| Migración de la columna `estado` | `backend/scripts/add-sugerencia-estado-column.js` |
| Bloque en el carrito | `frontend/src/components/AiSuggestion.jsx` |
| Historial | `frontend/src/components/MySuggestions.jsx` |
| Llamadas a la API | `frontend/src/services/suggestion.service.js` |
| Caso de uso | CUU6 en `docs/casos de uso - desarrollo de software.md` |

## 3. Qué dicen nuestros documentos

- `Propuesta JS.md`: el sistema permite a los clientes registrados "obtener
  sugerencias adecuadas a su perfil y a sus programas de ejercicio". Entre los
  CRUD figura **sugerencia_IA**.
- CUU2, paso 3: "Sistema muestra una sugerencia basada en IA". El cliente la
  rechaza (3.a) o la acepta (3.b). **No aparece ningún chatbot ni preguntas
  escritas por el cliente.**
- El CRUD de sugerencia_IA ya está cubierto: crear (POST), leer (GET),
  actualizar (PATCH del estado) y borrar (DELETE).

Conclusión: el chatbot sería una **mejora de producto que ustedes agregan**,
no algo que pidan nuestros documentos. Antes de invertir tiempo, conviene
revisar en https://github.com/utnfrrodsw/tp (README, proposal y FAQ) si la
cátedra espera algo más de la parte de IA para Aprobación Directa. No lo
verificamos en este documento.

## 4. Lo que medimos de Gemini (8/10/2026)

Esto no es teórico: son pruebas reales con la API.

- **El modelo por defecto no siempre responde.** `gemini-3.8-flash` y
  `gemini-3.7-flash` devolvieron error 503 ("alta demanda") en varias pruebas.
  `gemini-3.5-flash` respondió. El modelo se cambia con la variable
  `GEMINI_MODEL` del `.env`, sin tocar código.
- **La latencia varía mucho.** Con el prompt real y `gemini-3.5-flash`: de 3,6
  a 4,4 segundos con la configuración por defecto, pero en la pantalla hubo
  varios casos que pasaron el timeout de 15 segundos del backend.
- **Gran parte del tiempo es "pensamiento" interno del modelo.** Con la
  configuración por defecto el modelo gastó entre 750 y 980 tokens pensando
  antes de contestar. Con `thinkingBudget: 0` (dentro de `generationConfig`)
  tardó alrededor de 1 segundo y las razones siguieron siendo coherentes. **No
  está aplicado en el código**: es una mejora pendiente.
- **La cuota gratuita se agota.** Después de muchas pruebas seguidas con la
  misma key apareció el error 429 ("excediste tu cuota"). No sabemos si el
  límite es por minuto o por día ni cuántas llamadas son. Cuando alguien del
  equipo prueba mucho con la misma key, esto se va a ver.
- Cuando Gemini falla (503, 429, timeout), el cliente ve un mensaje en español
  ("El servicio de sugerencias no está disponible ahora. Probá en unos
  minutos.") y puede reintentar. La función no se rompe, pero **no responde**.

Por qué importa: cualquier opción que haga **más llamadas** o espere **respuestas
más rápidas** (un chat) va a sentir más estos problemas.

## 5. Opciones

Las opciones son **escalones**: cada una se apoya en la anterior. Se puede parar
en cualquiera.

### Opción A: dejar el botón actual

Qué es: lo que ya está. Un botón, sin texto del cliente.

**Ventajas**
- Ya está hecha, probada en vivo y con tests.
- Coincide con el CUU2 tal como está escrito.
- No hay forma de que el cliente le "hable" a la IA, así que no hay trucos de
  texto ni preguntas fuera de tema.
- Es la que menos cuota de Gemini gasta.
- Es la más fácil de explicar y defender línea por línea en la oral.

**Desventajas**
- Se siente poco "inteligente": el cliente no puede decir qué busca y toda
  persona con el mismo perfil recibe parecido.
- Solo se usa si ya hay productos en el carrito.
- Si el profesor pregunta "¿y esto qué tiene de IA?", la respuesta depende del
  prompt y no de algo que el cliente pueda ver o controlar.

### Opción B: preguntas preseleccionadas (una ronda)

Qué es: el cliente elige una pregunta de una lista fija, por ejemplo
"¿Qué me recomendás para ganar masa muscular?" o "¿Qué puedo tomar para
recuperarme mejor?". El texto de cada pregunta está en nuestro código y se
agrega al prompt junto con el perfil y el catálogo.

**Ventajas**
- Control total del prompt: no entra texto escrito por el cliente, así que no
  hay preguntas fuera de tema ni intentos de engañar a la IA.
- Respuestas más predecibles y fáciles de probar y de mostrar en la defensa.
- Cambio chico y de bajo riesgo: casi todo el backend actual se reutiliza.
- Cada consulta sigue guardándose como una fila de `sugerencia_IA`; el DER no
  cambia.

**Desventajas**
- Es menos flexible. El cliente solo puede preguntar lo que ustedes
  prepararon.
- Hay que decidir y mantener la lista de preguntas.
- **Punto débil real:** con preguntas fijas, un profesor crítico puede decir
  que gran parte de la selección se resolvería con un filtro por categoría, sin
  IA. El aporte real de la IA es combinar el perfil, la pregunta y el texto de
  los productos para escribir un motivo personalizado. Eso hay que poder
  explicarlo.
- Cambia el caso de uso: hay que actualizar CUU6.

### Opción C: preguntas preseleccionadas más texto libre (una ronda)

Qué es: además de la lista, el cliente puede escribir su propia pregunta
("qué me recomendás para mi ejercicio, que es X"). Sigue siendo una pregunta y
una respuesta, no una conversación.

Para que funcione bien, la respuesta de Gemini tendría que incluir si la pregunta
es sobre el tema (`en_tema`), un mensaje corto para el cliente y de 0 a 3
productos. Así "Explicame el teorema de Shannon" se contesta con un "Solo puedo
ayudarte con suplementos y entrenamiento", sin productos. Hoy **0 productos no
está contemplado como respuesta válida** (se trata como error 502), así que esto
requiere cambiar el controlador.

**Ventajas**
- Es lo más parecido a la idea original sin la complejidad de un chat completo.
- Responde a lo que el cliente realmente quiere.
- Pasar de B a C es agregar un campo de texto y reglas, no rehacer todo.

**Desventajas**
- **Aparecen los ataques por texto.** El profesor va a probar cosas como
  "Explicame el teorema de Shannon", "ignorá tus instrucciones", un texto vacío,
  uno larguísimo, insultos o una pregunta médica ("tengo diabetes, ¿qué
  tomo?"). Hay que preparar defensas y probar cada caso.
- **No hay garantía total.** Que la IA se mantenga en el tema depende del
  modelo, no de una regla nuestra. Se puede reducir el riesgo (formato de
  respuesta obligatorio, descartar productos si `en_tema` es falso, limitar el
  largo del texto, validar en el servidor), pero no eliminarlo.
- **Los tests no verifican calidad.** Los tests automáticos usan una IA falsa;
  el comportamiento real con preguntas raras solo se prueba a mano, con la API.
- **Riesgo con consejos médicos.** Un suplemento mal recomendado a alguien con
  una condición es un problema real. Habría que pedirle a la IA que derive a un
  profesional y no dar dosis, y aun así no es perfecto.
- Más llamadas y más tiempo de espera, con un Gemini que hoy es inestable
  (sección 4) y con cuota gratuita limitada.
- Cambia el caso de uso y hay que escribir más tests y pruebas manuales.

### Opción D: chatbot real (conversación con memoria)

Qué es: una ventana de chat donde el cliente va y viene con la IA, y la IA
recuerda lo anterior.

**Ventajas**
- Es la experiencia que la mayoría imagina cuando dice "chatbot".
- Se pueden hacer preguntas de seguimiento ("¿y esa creatina es apta para
  vegetarianos?").

**Desventajas**
- **No encaja con el modelo de datos actual.** `sugerencia_IA` guarda un solo
  `prompt_enviado` y una sola `respuesta_IA`. Una conversación tiene muchos
  mensajes. Hay dos caminos: una tabla nueva (cambia el DER y lo que ya
  presentaron) o guardar toda la conversación como texto en un solo campo
  (funciona, pero es un parche que enturbia el CRUD).
- Cada mensaje nuevo hay que enviarlo junto con **todo el historial**. Crece el
  costo, la latencia y la chance de pegar con la cuota.
- En un chat el usuario espera respuestas rápidas. Con tiempos de 1 a 15
  segundos, errores 503 y 429, la experiencia se nota mala.
- Mucho más frontend: scroll, mensajes en curso, errores por mensaje,
  reintentos, vaciar la conversación. Mucho más que revisar y explicar en la
  oral.
- Todos los riesgos de la opción C, multiplicados: más texto del cliente, más
  turnos, más chance de que la IA se desvíe.
- Casi imposible de cubrir con tests automáticos.
- Para un equipo de 4 con poco tiempo, es la opción con más probabilidad de
  quedar a medias.

## 6. Comparación rápida

| | A: botón (hecho) | B: preguntas fijas | C: fijas + texto libre | D: chat con memoria |
|---|---|---|---|---|
| Esfuerzo que falta | Ninguno | Bajo | Medio | Alto |
| Riesgo en la defensa oral | Bajo | Bajo | Medio-alto | Alto |
| Texto del cliente hacia la IA | No | No | Sí | Sí (varios turnos) |
| Cambia el DER | No | No | No | Probablemente sí |
| Gasto de cuota de Gemini | Bajo | Bajo | Medio | Alto |
| Se puede cubrir con tests | Bien | Bien | Parcial | Mal |
| Se parece a la idea original | Poco | Algo | Bastante | Totalmente |

Esfuerzo y riesgo son estimaciones relativas, no horas medidas.

## 7. Lectura crítica (opinión, no decisión)

- La opción A ya cumple lo que piden los documentos. No hay apuro por
  complicarla.
- Si quieren mejorar sin arriesgar, **B es el mejor paso siguiente**: aporta
  algo visible a la demo y no abre ninguna puerta para trucos de texto.
- **C solo tiene sentido si hay tiempo** para pensar y probar a mano los casos
  raros (sección 5, opción C). Si deciden hacerla, conviene definir primero qué
  responde la IA cuando algo no es del tema.
- **D no se recomienda** para este trabajo: el costo y el riesgo son altos y el
  beneficio real para la nota es dudoso.
- Cualquiera sea la elección, **primero apliquen** lo de la sección 8: sin eso,
  la función falla en la demo aunque el código esté bien.

## 8. Qué falta hacer sin importar la opción

Tareas del equipo (no se pueden hacer desde el código):

- [ ] Actualizar el DER en draw.io: agregar `estado` a `sugerencia_IA` y volver
      a exportar `docs/img/der.png`.
- [ ] Cada integrante crea su propia `GEMINI_API_KEY` gratis en Google AI Studio
      y la pone en su `backend/.env`. **Nunca** se sube al repo.
- [ ] Correr `npm run migrate:sugerencia-estado` (dentro de `backend/`) en cada
      base de datos existente, y también en la de Railway cuando se haga el
      deploy.
- [ ] Cargar `GEMINI_API_KEY` en las variables de Railway.

Mejoras de código recomendadas:

- [ ] Agregar `thinkingBudget: 0` y probar de nuevo los tiempos (ver sección 4).
- [ ] Decidir el modelo por defecto: hoy es `gemini-3.8-flash`, que dio 503 en
      las pruebas. Mientras tanto, usar `GEMINI_MODEL=gemini-3.5-flash` en el
      `.env`.
- [ ] Limitar el largo de los campos ocupación y deporte del perfil (hoy son
      texto libre hasta 255 caracteres y viajan dentro del prompt).

## 9. Problemas conocidos de la versión actual

- Un administrador que también tenga perfil de cliente vería en "Mis
  sugerencias" las de **todos** los clientes, porque `GET /api/sugerencias`
  devuelve todo a un administrador. Los pedidos resuelven esto con una ruta
  aparte (`/mis-pedidos`); las sugerencias no.
- El bloque de IA solo aparece cuando el carrito tiene al menos un producto,
  aunque el backend aceptaría un carrito vacío.
- Los 3 avisos que aparecen al aceptar una sugerencia pueden resultar muchos
  (uno por producto agregado más uno final).

## 10. Cómo probarlo en tu máquina

1. Traer la rama: `git fetch` y `git checkout feature/issue-47-ai-suggestions`.
2. En `backend/.env` agregar `GEMINI_API_KEY=` con tu key (y, si hace falta,
   `GEMINI_MODEL=gemini-3.5-flash`). Hay un ejemplo en `backend/.env.example`.
3. En `backend/`: `npm run migrate:sugerencia-estado`.
4. Levantar backend y frontend como siempre.
5. Iniciar sesión como cliente, completar el perfil (Mi perfil), agregar
   productos al carrito y tocar "Pedir sugerencia de IA". Para ver más de un
   producto sugerido hace falta que haya más de uno en el catálogo.

Tests del backend: `npm --prefix backend test`.

## 11. Preguntas para que el equipo decida

1. ¿Cuánto tiempo real queda hasta la entrega y la defensa?
2. ¿La cátedra espera algo más de la IA que lo que dice la propuesta? (revisar
   el repo `utnfrrodsw/tp`)
3. ¿Queremos arriesgar la demo con texto libre, sabiendo que Gemini puede estar
   saturado ese día?
4. Si elegimos B o C, ¿quién arma la lista de preguntas y quién prueba a mano los
   casos raros?
5. Si el profesor pregunta "¿esto no se resuelve sin IA?", ¿qué respondemos?
