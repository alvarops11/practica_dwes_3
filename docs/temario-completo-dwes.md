# Manual Completo de Desarrollo Web en Entorno Servidor: Unidades 1 a 4 (Sesiones 1 a 14)

Este documento constituye el temario exhaustivo y completo de la asignatura **Desarrollo Web en Entorno Servidor (DWES)**, estructurado analíticamente en cuatro Unidades Didácticas (UD) y catorce Sesiones de contenido técnico.

---

## UNIDAD DIDÁCTICA 1: Arquitectura Web, Fundamentos de Node.js, Express, EJS y Sintaxis de JavaScript (Sesiones 1 - 6)

### 1. Sesión 1: Arquitectura Web y Ejecución en Servidor

#### 1.1. Arquitectura Cliente-Servidor
La arquitectura cliente-servidor distribuye las tareas de una aplicación web entre dos roles fundamentales:
*   **Cliente web**: Inicia la comunicación enviando peticiones HTTP desde el navegador o cliente liviano. Responsable de la interfaz de usuario, presentación e interacción.
*   **Servidor**: Permanece a la escucha, procesa las peticiones, aplica reglas de negocio, autoriza accesos, consulta almacenes de datos y devuelve respuestas HTTP.

| Aspecto | Cliente web | Servidor |
| :--- | :--- | :--- |
| **Entorno de ejecución** | Navegador en el dispositivo del usuario | Infraestructura controlada por el proveedor |
| **Responsabilidades** | Interfaz, presentación e interacción | Reglas de negocio, seguridad, acceso a datos |
| **Visibilidad del código** | Código fuente inspeccionable por el usuario | Código privado no accesible por el navegador |
| **Confianza y seguridad** | Entorno no confiable; no debe contener secretos | Entorno confiable; valida datos y aplica permisos |
| **Tecnologías clave** | HTML, CSS, JavaScript (DOM, Fetch API) | Node.js, PHP, Java, .NET, Python, Ruby |

#### 1.2. Petición y Respuesta HTTP
El protocolo HTTP organiza la comunicación mediante mensajes de petición (*request*) y respuesta (*response*):
*   **Petición HTTP**: Contiene un método (`GET`, `POST`, `PUT`, `DELETE`), una ruta o URI, cabeceras (*headers*) con metadatos y, opcionalmente, un cuerpo (*body*).
*   **Respuesta HTTP**: Contiene un código de estado (*status code*), cabeceras de respuesta (como `Content-Type`) y un cuerpo con el recurso o datos servidos.

##### Códigos de Estado HTTP Principales:
*   `200 OK`: Petición procesada correctamente.
*   `201 Created`: Recurso creado exitosamente tras un `POST` o `PUT`.
*   `302 Found / 303 See Other`: Redirección temporal a otra URL.
*   `400 Bad Request`: Petición sintácticamente inválida o parámetros incorrectos.
*   `404 Not Found`: El recurso o ruta solicitada no existe en el servidor.
*   `500 Internal Server Error`: Excepción o error no capturado en el servidor.

#### 1.3. Recorrido de una Petición HTTP
1. El usuario introduce una URL o activa un enlace en el navegador.
2. El navegador resuelve la dirección del servidor y establece la conexión TCP/TLS.
3. Envía la petición HTTP con el método, la ruta y las cabeceras correspondientes.
4. El servidor web o proxy inverso recibe la conexión y la encamina hacia la aplicación.
5. La aplicación ejecuta la cadena de *middleware*, evalúa el enrutador y ejecuta la lógica de negocio.
6. Si requiere persistencia, la aplicación consulta la base de datos o servicio externo.
7. La aplicación compone la respuesta (ej. renderizando una plantilla HTML o serializando un JSON).
8. El navegador recibe la respuesta y procesa su contenido (descargando recursos estáticos vinculados si es HTML).

#### 1.4. Generación Dinámica: SSR, CSR y Modelos Híbridos
*   **SSR (Server-Side Rendering)**: El servidor genera completamente el documento HTML final combinando datos y plantillas antes de enviarlo. Ofrece entrega inicial rápida, contenido inmediatamente indexable y compatibilidad sin JavaScript en el cliente, a cambio de mayor uso de CPU en el servidor por cada petición.
*   **CSR (Client-Side Rendering)**: El servidor entrega un HTML mínimo y un paquete JavaScript. El navegador ejecuta el script, realiza peticiones de datos (APIs JSON) y construye/modifica el DOM en el cliente. Proporciona interacciones fluidas sin recargar la página, pero incrementa el tiempo de carga inicial y la complejidad en el cliente.
*   **Enfoques Híbridos / Hidratación**: El servidor genera el HTML inicial (SSR) y el navegador ejecuta JavaScript para añadir interactividad sobre el markup recibido.

#### 1.5. Componentes de la Infraestructura de Servidor
*   **Servidor Web**: Gestiona conexiones HTTP/HTTPS, sirve archivos estáticos (CSS, JS, imágenes) y finaliza TLS (ej. Nginx, Apache, Caddy).
*   **Servidor de Aplicaciones**: Ejecuta el entorno de código dinámico, lógica de negocio, plantillas y acceso a datos (ej. proceso Node.js con Express).
*   **Proxy Inverso**: Actúa como punto de entrada público, enrutando peticiones hacia uno o varios servidores de aplicaciones internos, ofreciendo balanceo de carga, caché y terminación SSL.

---

### 2. Sesión 2: Node.js, Protocolo HTTP y Framework Express

#### 2.1. Node.js como Entorno de Ejecución
Node.js ejecuta JavaScript fuera del navegador utilizando el motor V8 de Google. No dispone de las APIs del navegador (como `window`, `document` o `localStorage`), pero proporciona APIs de sistema operativo para acceso al sistema de archivos (`node:fs`), red (`node:http`), procesos (`process`) y buffers.

#### 2.2. Modelo de E/S No Bloqueante y Bucle de Eventos
Node.js opera sobre un único hilo principal apoyado por un bucle de eventos (*event loop*) y un conjunto de hilos internos para operaciones asíncronas de entrada/salida (E/S).
*   Las operaciones de E/S (lectura de archivos, consultas a bases de datos, peticiones de red) se inician sin bloquear el hilo principal.
*   Cuando la operación finaliza, su *callback* o resolución de promesa (`await`) se programa en el bucle de eventos.
*   *Advertencia de rendimiento*: Los cálculos matemáticos intensivos o bucles síncronos prolongados bloquean el hilo principal, impidiendo atender cualquier otra petición entrante.

#### 2.3. Gestión de Paquetes con npm y Estructura del Proyecto
*   `package.json`: Manifiesto del proyecto que declara metadatos, scripts de ejecución (`scripts`), dependencias de producción (`dependencies`) y de desarrollo (`devDependencies`).
*   `package-lock.json`: Registra el árbol exacto de versiones resueltas de cada dependencia para garantizar instalaciones reproducibles.
*   `node_modules`: Carpeta donde npm descarga las bibliotecas instaladas. Nunca debe incluirse en el control de versiones Git.
*   Variables de Entorno: Se definen en archivos `.env` (locales, no versionados) y se documentan en `.env.example` (sin datos sensibles reales).

#### 2.4. Servidor HTTP Nativo (`node:http`) frente a Express
Un servidor nativo con `node:http` gestiona directamente los objetos de petición (`IncomingMessage`) y respuesta (`ServerResponse`):

```javascript
import http from 'node:http';

const servidor = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Servidor HTTP nativo en funcionamiento');
});

servidor.listen(3000);
```

Express simplifica el desarrollo organizando la aplicación mediante enrutamiento declarativo y una cadena de funciones *middleware*.

#### 2.5. Rutas, Métodos y Orígenes de Datos en Express
Express expone información recibida a través del objeto `req`:
*   `req.params`: Parámetros de ruta dinámicos (ej. `/libros/:id` -> `req.params.id`).
*   `req.query`: Parámetros de la cadena de consulta URL (ej. `/libros?categoria=web` -> `req.query.categoria`).
*   `req.body`: Cuerpo de la petición procesado por *middleware* como `express.json()` o `express.urlencoded()`.
*   `req.get('Header-Name')`: Acceso a las cabeceras HTTP de entrada.

##### Métodos de Respuesta (`res`):
*   `res.send()`: Envía respuestas en texto plano, HTML o Buffer con deducción automática de `Content-Type`.
*   `res.json()`: Serializa un objeto JavaScript a JSON y fija el encabezado `application/json`.
*   `res.status(code)`: Establece el código de estado HTTP. Se encadena con métodos de envío.
*   `res.redirect(status, url)`: Emite una redirección (por defecto HTTP 302).
*   `res.render(vista, datos)`: Renderiza una plantilla mediante el motor configurado.

#### 2.6. Middleware y Manejo de Errores
Un *middleware* es una función con firma `(req, res, next)` que puede inspeccionar o modificar la petición, finalizar la respuesta o ceder el control invocando `next()`.
*   **Manejador 404**: Se posiciona estrictamente **después** de todas las rutas válidas.
*   **Manejador de Errores**: Se identifica por su firma de cuatro parámetros `(err, req, res, next)`. Captura cualquier error pasado a `next(err)` o lanzado en controladores asíncronos.

---

### 3. Sesión 3: Generación Dinámica de HTML con Motor de Plantillas EJS

#### 3.1. Configuración de EJS en Express
EJS (Embedded JavaScript) permite incrustar lógica de presentación dentro de documentos HTML:

```javascript
app.set('view engine', 'ejs');
app.set('views', 'views');
```

#### 3.2. Sintaxis y Etiquetas Fundamentales de EJS
*   `<%= expresion %>`: Evalúa la expresión JavaScript e inserta el resultado **escapando entidades HTML**. Es la opción obligatoria para prevenir inyecciones XSS al renderizar datos procedentes de usuarios.
*   `<%- expresion %>`: Evalúa e inserta el resultado **sin escapar**. Reservado para la inclusión de parciales EJS o contenido HTML sanitizado deliberadamente.
*   `<% codigo %>`: Ejecuta código de control de flujo en JavaScript (ej. `if`, `for`) sin emitir texto directamente en el documento.
*   `<%# comentario %>`: Comentario de plantilla que se elimina durante la compilación y nunca llega al HTML recibido por el cliente.
*   `-%>`: Cierre de etiqueta que elimina el salto de línea posterior para controlar espacios en blanco.

#### 3.3. Inclusión de Plantillas Parciales
Los parciales permiten dividir la interfaz en componentes reutilizables (cabecera, menú, pie de página):

```ejs
<%- include('partials/cabecera', { tituloPagina: 'Ficha del Libro' }) %>
<main>
  <h1><%= libro.titulo %></h1>
</main>
<%- include('partials/pie') %>
```

---

### 4. Sesión 4: JavaScript en Servidor: Tipos, Ámbitos, Operadores y Módulos

#### 4.1. Tipos de Datos Primitivos y Objetos en JavaScript
JavaScript es de tipado dinámico. Sus tipos primitivos son: `string`, `number`, `boolean`, `undefined`, `null`, `bigint` y `symbol`. Los tipos compuestos son `object` (que incluye objetos ordinarios, arrays y funciones).
*   `typeof null` devuelve `"object"` por una peculiaridad histórica del lenguaje.
*   Para verificar arrays de forma fiable se utiliza `Array.isArray(valor)`.

#### 4.2. Peculiaridades Numéricas y Conversión Explícita
El tipo `number` representa enteros de doble precisión en coma flotante, así como los valores especiales `Infinity` y `NaN` (Not a Number).
*   `typeof NaN` devuelve `"number"`. Para comprobar si un valor es NaN se exige `Number.isNaN(valor)`.
*   Conversión explícita: Se recomienda `Number(texto)` o `Number.isInteger(num)` frente a `parseInt()` para validar cadenas que deben ser enteros estrictos sin sufijos de texto.
*   *Atención con cadenas vacías*: `Number("")` y `Number(null)` devuelven `0`, lo que puede ocultar la ausencia de un campo obligatorio si no se comprueba previamente con `.trim()`.

#### 4.3. Operadores, Operador Nullish Coalescing y Coerción
*   El operador `+` concatena si uno de los operandos es texto: `'2' + 3` resulta en `'23'`.
*   Igualdad Estricta (`===`): Compara tipo y valor sin coerción implícita. Debe usarse siempre frente a la igualdad débil (`==`).
*   Operador `??` (Nullish Coalescing): Evalúa el lado derecho únicamente cuando el lado izquierdo es `null` u `undefined` (a diferencia de `||`, que se activa con cualquier valor *falsy* como `0`, `false` o `""`).
*   Valores *Falsy*: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Cualquier objeto o array (incluso vacíos `{}` o `[]`) es *truthy*.

#### 4.4. Ámbitos de Variables y Declaración
*   `const`: Declara una referencia inmutable dentro del ámbito de bloque. No impide mutar las propiedades internas del objeto al que apunta.
*   `let`: Declara una variable reasignable con ámbito de bloque.
*   `var`: En desuso; posee ámbito de función y elevación (*hoisting*), propiciando errores de ámbito.

---

### 5. Sesión 5: Control de Flujo, Colecciones y Arrays de Objetos

#### 5.1. Control de Flujo Avanzado
*   `if / else`: Estructura condicional. Se aplica el patrón de retorno temprano (*early return*) para validar errores primero y reducir el anidamiento del flujo principal.
*   `switch`: Adecuado para bifurcaciones sobre valores discretos conocidos. Requiere `break` o `return` en cada caso para evitar la caída accidental (*fall-through*).

#### 5.2. Métodos de Iteración y Transformación de Arrays

| Método | Tipo de retorno | Propósito y comportamiento |
| :--- | :--- | :--- |
| `find(predicado)` | Elemento \| `undefined` | Devuelve el primer elemento que satisface la condición |
| `filter(predicado)` | Array (nuevo) | Devuelve un nuevo array con todos los elementos que cumplen la condición |
| `map(transformador)` | Array (nuevo) | Devuelve un nuevo array con cada elemento transformado |
| `some(predicado)` | `boolean` | Devuelve `true` si al menos un elemento cumple la condición |
| `every(predicado)` | `boolean` | Devuelve `true` si absolutamente todos los elementos cumplen la condición |
| `reduce(acumulador)` | Valor acumulado | Reduce la colección a un único valor (número, objeto o array) |

#### 5.3. Métodos Mutadores frente a Métodos No Mutadores
*   **Métodos Mutadores**: Modifican el array original (`push`, `pop`, `splice`, `sort`, `reverse`).
*   **Métodos Inmutables**: Crean y devuelven una nueva instancia (`filter`, `map`, `slice`, operador spread `[...array]`).
*   *Regla de diseño*: Para evitar efectos secundarios en memoria compartida (ej. un catálogo global en servidor), no debe aplicarse `sort()` directo sobre la fuente de datos; se debe ordenar una copia mediante `[...datos].sort()`.

---

### 6. Sesión 6: Funciones, Formularios HTTP, Validación y Patrón PRG

#### 6.1. Funciones Puras y Efectos Secundarios
*   **Función Pura**: Aquella cuyos resultados dependen exclusivamente de sus argumentos de entrada, sin modificar el estado externo ni provocar efectos secundarios (E/S, red, modificación de colecciones globales). Es determinista y de fácil evaluación unitaria.
*   **Efectos Secundarios**: Modificar variables globales, escribir en la base de datos o emitir respuestas HTTP. Debe aislarse la lógica de negocio pura de los manejadores con efectos.

#### 6.2. Formularios GET y POST en HTML
*   `GET`: Los campos del formulario se codifican en la URL (`req.query`). Usado exclusivamente para búsquedas, filtros y navegación idempotente que puede guardarse en marcadores.
*   `POST`: Los campos viajan en el cuerpo de la petición HTTP (`req.body`). Exige el uso de `app.use(express.urlencoded({ extended: false }))` en Express. Usado para operaciones que modifican el estado del servidor.

#### 6.3. Validación de Formularios y Conservación de Estado
Al procesar un formulario con datos no válidos, el servidor debe:
1. Retornar un código de estado `HTTP 400 Bad Request`.
2. Volver a renderizar la vista del formulario.
3. Repoblar los campos con los valores previamente introducidos (`valores`).
4. Mostrar los mensajes de error asociados a los campos específicos (`errores`).

#### 6.4. El Patrón Post Redirect Get (PRG)
Para evitar que la recarga accidental del navegador (`F5`) vuelva a enviar los datos de un formulario `POST` (provocando duplicaciones de compras o registros):

```
[ Cliente ] ─── POST /libros ───> [ Servidor (Procesa y crea recurso) ]
[ Cliente ] <── 303 See Other ── [ Servidor (Location: /libros/42) ]
[ Cliente ] ─── GET /libros/42 ─> [ Servidor (Renderiza detalle) ]
[ Cliente ] <── 200 OK HTML ─── [ Servidor ]
```

---

## UNIDAD DIDÁCTICA 2: Gestión del Estado, Autenticación, Autorización y Seguridad Web (Sesiones 7 - 9)

### 7. Sesión 7: Cookies y Sesiones en Express

#### 7.1. Naturaleza de HTTP y Mantenimiento del Estado
HTTP es un protocolo sin estado (*stateless*). Cada petición se procesa de manera independiente. Para mantener el estado (carritos de compra, sesiones autenticadas, preferencias) se emplea un identificador opaco asignado al navegador del cliente.

#### 7.2. Atributos de Seguridad de las Cookies

| Atributo | Función y Decisión de Seguridad |
| :--- | :--- |
| `expires` / `maxAge` | Define la caducidad absoluta o la duración relativa de la cookie en milisegundos. |
| `httpOnly` | `true`: Impide el acceso a la cookie mediante JavaScript del navegador (`document.cookie`), mitigando el robo de sesiones por XSS. |
| `secure` | `true`: Garantiza que la cookie solo se transmita a través de conexiones cifradas HTTPS. |
| `sameSite` | Restringe el envío de cookies en peticiones procedentes de otros sitios. Valores: `Strict`, `Lax` (base razonable para webs estándar) o `None`. |

#### 7.3. Sesiones de Servidor con `express-session`
El servidor conserva los datos reales de la sesión en memoria o en un almacén persistente. El cliente solo porta un identificador firmado en una cookie.

```javascript
import session from 'express-session';

app.use(session({
  name: 'dwes.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 60 * 1000 // 30 minutos
  }
}));
```

#### 7.4. Limitaciones del Almacén en Memoria (`MemoryStore`)
`MemoryStore` es el almacén predeterminado de `express-session`. Solo es aceptable en desarrollo local porque:
1. Pierde todas las sesiones almacenadas al reiniciar el proceso Node.js.
2. Consume memoria ilimitada dentro del proceso.
3. No permite compartir estado entre múltiples procesos o instancias desplegadas.
4. En producción debe reemplazarse por almacenes como Redis o bases de datos relacionales.

---

### 8. Sesión 8: Autenticación, Autorización y Contraseñas

#### 8.1. Autenticación frente a Autorización
*   **Autenticación**: Proceso de verificar la identidad afirmada por un usuario (ej. comprobar email y contraseña).
*   **Autorización**: Comprobar si una identidad ya autenticada posee permisos o roles para ejecutar una acción concreta.

#### 8.2. Almacenamiento Seguro de Contraseñas con `bcrypt`
Nunca deben almacenarse contraseñas en texto claro ni utilizar algoritmos de hash rápidos (como MD5 o SHA-256), vulnerables a ataques por tablas de arcoíris y GPU.
*   `bcrypt` aplica un algoritmo lento configurable mediante un factor de coste (*work factor* o sal).

```javascript
import bcrypt from 'bcrypt';

// Generar hash en registro
const passwordHash = await bcrypt.hash(passwordTextoPlano, 12);

// Verificar credenciales en login
const coincide = await bcrypt.compare(passwordIntroducida, usuario.passwordHash);
```

#### 8.3. Mitigación del Riesgo de Fijación de Sesión
Para evitar ataques de fijación de sesión, **el identificador de la sesión debe regenerarse inmediatamente después de autenticar al usuario**:

```javascript
req.session.regenerate((err) => {
  if (err) return next(err);
  req.session.usuarioId = usuario.id;
  req.session.save((err) => {
    if (err) return next(err);
    res.redirect(303, '/perfil');
  });
});
```

#### 8.4. Cierre de Sesión Completo
Para cerrar sesión se debe invalidar tanto la sesión en el servidor como la cookie en el cliente:

```javascript
app.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('dwes.sid');
    res.redirect(303, '/login');
  });
});
```

---

### 9. Sesión 9: Middleware Avanzado, Protección de Seguridad y Pruebas HTTP

#### 9.1. Middleware de Autenticación y Autorización por Rol
Los controles de acceso deben ejecutarse de forma centralizada mediante *middleware* especializado:

```javascript
export function exigirAutenticacion(req, res, next) {
  if (!res.locals.usuarioActual) {
    return res.redirect(303, '/login');
  }
  return next();
}

export function exigirRol(...rolesPermitidos) {
  return (req, res, next) => {
    const usuario = res.locals.usuarioActual;
    if (!usuario) return res.redirect(303, '/login');
    if (!rolesPermitidos.includes(usuario.rol)) {
      return res.status(403).render('error', { mensaje: 'Acceso denegado' });
    }
    return next();
  };
}
```

#### 9.2. Mitigación de Vulnerabilidades Web

##### Cross-Site Request Forgery (CSRF):
Ataque que fuerza a un navegador autenticado a enviar peticiones no deseadas a un sitio vulnerable.
*   *Defensa*: Generación de tokens anti-CSRF aleatorios almacenados en la sesión y verificados mediante comparación en tiempo constante (`crypto.timingSafeEqual`) en toda petición de modificación (`POST`, `PUT`, `DELETE`).

##### Ataques de Fuerza Bruta:
*   *Defensa*: Aplicación de limitadores de tasa (*rate limiting*) en endpoints críticos como `/login` empleando paquetes como `express-rate-limit`.

#### 9.3. Pruebas de Rutas HTTP con Supertest
Supertest permite realizar peticiones a la aplicación Express en memoria sin necesidad de levantar un puerto de red en cada ejecución:

```javascript
import request from 'supertest';
import { app } from '../src/app.js';

describe('Pruebas de acceso a rutas', () => {
  it('Redirige a login a usuarios anónimos', async () => {
    const res = await request(app).get('/perfil');
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/login');
  });
});
```

---

## UNIDAD DIDÁCTICA 3: Arquitectura por Capas, Diseño del Dominio, Patrones y TypeScript (Sesiones 10 - 11)

### 10. Sesión 10: Separación de Responsabilidades y Arquitectura por Capas

#### 10.1. Problemas del Código Monolítico y Acoplado
Concentrar la gestión de HTTP, la lógica de negocio, las consultas a base de datos y la generación de HTML en una única función de ruta genera alto acoplamiento y baja cohesión. Esto impide probar la lógica de negocio de forma aislada y dificulta la sustitución de componentes.

#### 10.2. Capas de la Arquitectura
1.  **Capa de Transporte (Rutas / HTTP)**: Gestiona la recepción de peticiones HTTP, extrae parámetros y delega en los controladores.
2.  **Capa de Adaptación (Controladores)**: Convierte los datos de la petición HTTP a tipos del dominio, invoca los casos de uso del servicio y traduce las respuestas o excepciones a códigos HTTP (303, 400, 403, 404, 409, 500).
3.  **Capa de Negocio (Servicios)**: Implementa las reglas puras de los casos de uso (ej. validar disponibilidad o plazos permitidos). No conoce objetos HTTP (`req`, `res`) ni motores de vista.
4.  **Capa de Persistencia (Repositorios)**: Gestiona la abstracción del almacenamiento de datos (operaciones `listar`, `buscarPorId`, `guardar`).
5.  **Capa de Presentación (Vistas / View Models)**: Transforma los datos de negocio en modelos de vista estructurados y renderiza plantillas HTML.

#### 10.3. Errores de Dominio y Traducción HTTP
Los servicios lanzan errores con códigos de negocio estables (`ErrorDominio`). El controlador o *middleware* de error traduce dichos códigos a respuestas HTTP adecuadas:

| Código `ErrorDominio` | Código HTTP resultante | Significado |
| :--- | :--- | :--- |
| `DATOS_INVALIDOS` | `400 Bad Request` | Los datos de entrada no cumplen la sintaxis o tipo esperado. |
| `PLAZO_NO_PERMITIDO` | `403 Forbidden` | La regla de negocio prohíbe la acción para ese rol. |
| `NO_ENCONTRADO` | `404 Not Found` | El recurso solicitado no existe en la persistencia. |
| `NO_DISPONIBLE` | `409 Conflict` | Conflicto con el estado actual del recurso en el dominio. |

---

### 11. Sesión 11: Interfaz, Configuración Externa e Introducción a TypeScript

#### 11.1. Gestión de Configuración Externa
Las configuraciones del sistema (puertos, claves secretas de sesión, credenciales de bases de datos) se leen desde variables de entorno (`process.env`) mediante módulos centralizados que validan la presencia y rango de cada variable al arrancar el servidor:

```javascript
const puerto = Number(process.env.PORT ?? '3000');
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('La variable PORT es inválida');
}
export const config = Object.freeze({ puerto });
```

#### 11.2. Fundamentos de TypeScript en Entorno Servidor
TypeScript añade un sistema de tipos estáticos que se evalúa en tiempo de compilación.

##### Tipos y Modelos de Interfaz:
```typescript
export type Rol = 'usuario' | 'admin';

export interface Usuario {
  readonly id: number;
  nombre: string;
  rol: Rol;
}

export interface RepositorioLibros {
  listar(): Promise<Libro[]>;
  buscarPorId(id: number): Promise<Libro | undefined>;
  guardar(libro: Libro): Promise<void>;
}
```

##### Inyección de Dependencias en TypeScript:
Las clases de servicios reciben la abstracción de sus dependencias (interfaces) en el constructor, permitiendo intercambiar repositorios reales o de prueba sin modificar el servicio:

```typescript
export class ServicioPrestamos {
  constructor(private readonly repo: RepositorioLibros) {}

  async prestar(id: number, usuario: Usuario, dias: number): Promise<Libro> {
    const libro = await this.repo.buscarPorId(id);
    if (!libro) throw new ErrorDominio('NO_ENCONTRADO', 'El libro no existe');
    // Aplicación de reglas y guardado
    await this.repo.guardar(actualizado);
    return actualizado;
  }
}
```

---

## UNIDAD DIDÁCTICA 4: Persistencia de Datos, SQL, PostgreSQL, Docker y Transacciones ACID (Sesiones 12 - 14)

### 12. Sesión 12: Tecnologías de Acceso a Datos, Docker y Controladores PostgreSQL

#### 12.1. Despliegue de PostgreSQL con Docker Compose
La infraestructura de base de datos se despliega mediante contenedores aislados usando Docker Compose:

```yaml
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_DB: dwes
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:15432:5432"
    volumes:
      - datos_pg:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d dwes"]
      interval: 5s
      timeout: 3s
      retries: 10
volumes:
  datos_pg:
```

#### 12.2. Creación de Usuarios de Aplicación sin Privilegios
Para evitar usar el superusuario `postgres` en la aplicación, se crea un rol limitado en PostgreSQL:

```sql
CREATE ROLE dwes_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password dwes_app
GRANT CONNECT, CREATE ON DATABASE dwes TO dwes_app;
```

#### 12.3. Pools de Conexiones con `pg.Pool`
En Node.js se reutilizan conexiones a PostgreSQL mediante un pool administrado con la biblioteca `pg`:

```javascript
import pg from 'pg';

export const pool = new pg.Pool({
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000
});

pool.on('error', (err) => console.error('Error inactivo en el pool', err));
```

---

### 13. Sesión 13: Consultas SQL, Filtros, Combinaciones (JOINs), Paginación y Orígenes Alternativos

#### 13.1. Consultas SQL Directas y Filtros
*   `SELECT`: Especifica columnas concretas a recuperar.
*   `WHERE`: Aplica condiciones booleanas empleando operadores como `=`, `!=`, `<`, `>`, `AND`, `OR`, e `ILIKE` (búsqueda de texto insensible a mayúsculas/minúsculas en PostgreSQL).
*   `IS NULL` / `IS NOT NULL`: Evalúa la presencia o ausencia de valores nulos.

#### 13.2. Combinaciones entre Tablas (JOINs)
*   `INNER JOIN`: Devuelve únicamente las filas que registren coincidencias exactas en ambas tablas según la condición `ON`.
*   `LEFT JOIN`: Devuelve todas las filas de la tabla izquierda, completando con `NULL` las columnas de la tabla derecha cuando no existe coincidencia.

#### 13.3. Paginación Eficiente mediante `LIMIT` y `OFFSET`
Para dividir un listado en páginas se combina `LIMIT` (tamaño de página) y `OFFSET` (filas a omitir):

```sql
SELECT id, titulo, precio 
FROM demo_vistas.libros 
WHERE titulo ILIKE $1 
ORDER BY titulo ASC, id ASC 
LIMIT $2 OFFSET $3;
```

*Técnica de la fila adicional*: Al solicitar `LIMIT tamano + 1`, la aplicación detecta si existe una página siguiente sin necesidad de ejecutar una segunda consulta pesada de conteo (`COUNT(*)`).

---

### 14. Sesión 14: Operaciones de Escritura (INSERT, UPDATE, DELETE), Restricciones, Transacciones y Pruebas de Integración

#### 14.1. Sentencias de Escritura y Cláusula `RETURNING`
*   `INSERT INTO tabla (columnas) VALUES ($1, $2) RETURNING id`: Inserta un registro y devuelve el ID generado por la base de datos en la misma consulta.
*   `UPDATE tabla SET col = $1 WHERE id = $2 RETURNING *`: Modifica filas y retorna los datos actualizados. Si `rowCount === 0`, indica que ninguna fila cumplió la condición del `WHERE`.
*   `DELETE FROM tabla WHERE id = $1`: Elimina las filas seleccionadas. Si `rowCount === 0`, la aplicación puede traducirlo a un código `404 Not Found`.

#### 14.2. Restricciones de Integridad en la Base de Datos
*   `PRIMARY KEY`: Garantiza identificador único y no nulo.
*   `NOT NULL`: Prohíbe valores nulos en la columna.
*   `UNIQUE`: Asegura que no existan valores duplicados.
*   `CHECK (condicion)`: Evalúa condiciones sobre los datos de la fila (ej. `precio >= 0`).
*   `FOREIGN KEY ... REFERENCES`: Garantiza la integridad referencial con otra tabla.
*   `GENERATED ALWAYS AS IDENTITY`: Secuencia propia controlada por PostgreSQL para llaves primarias.

#### 14.3. Transacciones ACID
Una transacción agrupa múltiples operaciones de lectura y escritura para que se ejecuten como una única unidad atómica.
*   **A (Atomicidad)**: Todas las operaciones se confirman (`COMMIT`) o ninguna surte efecto (`ROLLBACK`).
*   **C (Consistencia)**: Garantiza que la base de datos pase de un estado válido a otro respetando todas las restricciones.
*   **I (Aislamiento)**: Evita interferencias entre transacciones concurrentes.
*   **D (Durabilidad)**: Garantiza que los cambios confirmados persistan tras un fallo del sistema.

##### Gestión de Transacciones con `pg`:
Para ejecutar una transacción se debe solicitar un cliente individual del pool mediante `pool.connect()`, asegurando su liberación en un bloque `finally`:

```javascript
const cliente = await pool.connect();
try {
  await cliente.query('BEGIN');
  
  // 1. Actualización condicional para control de concurrencia
  const cambio = await cliente.query(
    `UPDATE demo_transacciones.ejemplares 
     SET disponible = false 
     WHERE id = $1 AND disponible = true 
     RETURNING id`, 
    [ejemplarId]
  );
  if (cambio.rowCount === 0) throw new Error('NO_DISPONIBLE');

  // 2. Insertar préstamo
  await cliente.query(
    `INSERT INTO demo_transacciones.prestamos (ejemplar_id, lector_id) 
     VALUES ($1, $2)`, 
    [ejemplarId, lectorId]
  );

  await cliente.query('COMMIT');
} catch (error) {
  await cliente.query('ROLLBACK');
  throw error;
} finally {
  cliente.release();
}
```

#### 14.4. Prevención Absoluta de Inyección SQL
La inyección SQL ocurre cuando datos de entrada no confiables se concatenan directamente en la cadena de la consulta SQL.
*   *Solución*: Uso estricto de **consultas parametrizadas** (`$1`, `$2`), donde el controlador `pg` envía los datos en un canal separado de la sentencia SQL, impidiendo que los valores sean interpretados como comandos.

#### 14.5. Pruebas de Integración de Base de Datos
Las pruebas de integración verifican el comportamiento real de las transacciones y restricciones sobre una base de datos de prueba dedicada (`dwes_test`):

```javascript
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

beforeEach(async () => {
  // Ejecuta script de inicialización init.sql para restaurar las tablas a un estado limpio
  await pool.query(sqlInit);
});

test('El lector inexistente provoca rollback de la disponibilidad', async () => {
  await request(app)
    .post('/prestamos')
    .send({ ejemplarId: 1, lectorId: 999 }) // Lector 999 no existe en la FK
    .expect(400);

  // Verificación de estado: el ejemplar debe permanecer disponible y no haber creado préstamos
  const estado = await consultarEstado();
  assert.deepEqual(estado, { disponible: true, prestamos: 0 });
});
```
