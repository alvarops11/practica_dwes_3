# Práctica DWES UD4: préstamos de material informático

Aplicación sencilla para consultar un inventario y prestar o devolver sus equipos. Está realizada en JavaScript con Node.js 24, Express 5, PostgreSQL 18, pg 8 y EJS 3, siguiendo el [temario](docs/temario-completo-dwes.md) y el [enunciado](docs/Enunciado_Practica_DWES_UD4.pdf).

Hay **dos páginas HTML** y **cinco operaciones JSON**. No se incluyen autenticación, sesiones, frontend con frameworks ni funciones ajenas a la práctica. La documentación técnica está en [docs/desarrollo-practica.md](docs/desarrollo-practica.md).

## 1. Requisitos

- Node.js **24.x** y npm.
- Docker con Docker Compose disponible y arrancado (por ejemplo, Docker Desktop).
- Un navegador. Las operaciones de escritura se pueden probar con `fetch` o un cliente HTTP.
- Puertos locales libres: `3000` para Node y `15432` para PostgreSQL.

Ejecuta los comandos desde la raíz del proyecto. Los ejemplos de terminal están preparados para PowerShell de Windows.

## 2. Instalación y configuración

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Edita `.env` y completa `PGPASSWORD` (contraseña del usuario de la aplicación) y `DB_ADMIN_PASSWORD` (contraseña del administrador de PostgreSQL). Usa valores distintos. No se entregan contraseñas predeterminadas. Si una contraseña contiene `#` o espacios, pon su valor entre comillas en `.env`.

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto de Node; inicialmente 3000 |
| `PGHOST` | Dirección de PostgreSQL: 127.0.0.1 |
| `PGPORT` | Puerto publicado por Docker: 15432 |
| `PGDATABASE` | Base de la práctica: dwes |
| `PGUSER` | Rol de la aplicación: dwes_app |
| `PGPASSWORD` | Contraseña que asignarás a dwes_app |
| `DB_ADMIN_PASSWORD` | Contraseña de postgres para la primera creación del volumen |

Node carga `.env` con su opción nativa `--env-file`: no hace falta instalar dotenv. `.env`, `.env.test` y `node_modules` están excluidos en `.gitignore` y no deben incluirse en la entrega.

## 3. Arrancar PostgreSQL y crear el rol limitado

```powershell
docker compose up -d --wait
docker compose ps
docker compose exec db psql -U postgres -d dwes
```

Dentro de `psql`, ejecuta **una sola vez**:

```sql
CREATE ROLE dwes_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password dwes_app
GRANT CONNECT, CREATE ON DATABASE dwes TO dwes_app;
\q
```

Al pedir la contraseña de `dwes_app`, introduce la misma que pusiste en `PGPASSWORD`. `\password` la solicita de forma interactiva para no escribirla en el SQL. La aplicación se conecta con este rol limitado, nunca con el superusuario `postgres`.

## 4. Inicializar la base vacía

```powershell
docker compose cp init.sql db:/tmp/init.sql
docker compose exec db psql -h 127.0.0.1 -U dwes_app -d dwes -W -v ON_ERROR_STOP=1 -f /tmp/init.sql
```

Introduce la contraseña de `dwes_app`. El script crea el esquema `practica_prestamos`, sus tablas, restricciones, índice y datos de ejemplo. Todo se ejecuta dentro de una transacción. Se ejecuta como `dwes_app` para que las tablas pertenezcan a ese rol.

**`init.sql` es para una base vacía.** No borra tablas ni sobrescribe registros. Si el esquema ya existe, fallará; no lo repitas para arrancar la aplicación cada día.

Datos iniciales:

- 12 equipos disponibles: 6 portátiles, 2 tabletas, 2 proyectores, 1 cámara y 1 micrófono.
- Códigos: `PORT-01` a `PORT-06`, `TAB-01`, `TAB-02`, `PROY-01`, `PROY-02`, `CAM-01` y `MIC-01`.
- Usuarios: `1` Ana García, `2` Luis Pérez, `3` Marta López.
- Ningún préstamo inicial. El primer equipo tiene id `1` y código `PORT-01`.

## 5. Arrancar la aplicación

```powershell
npm.cmd start
```

Abre [http://127.0.0.1:3000/equipos](http://127.0.0.1:3000/equipos). El servidor comprueba que puede consultar la tabla de equipos antes de abrir el puerto. Detén Node con `Ctrl+C`.

Para parar PostgreSQL conservando los datos:

```powershell
docker compose down
```

El volumen `datos_pg` conserva los datos entre arranques. **No uses `docker compose down -v` si quieres conservarlos**: esa opción elimina el volumen. Cambiar `DB_ADMIN_PASSWORD` en `.env` no cambia la contraseña de una base ya inicializada.

## 6. Rutas disponibles

| Método y ruta | Entrada | Resultado correcto |
| --- | --- | --- |
| `GET /equipos` | Filtros en la URL | 200, listado EJS |
| `GET /equipos/:id` | Identificador positivo | 200, detalle e historial EJS |
| `POST /api/equipos` | `{ "codigo", "nombre", "categoria" }` | 201, equipo con id y cabecera `Location` |
| `PUT /api/equipos/:id` | Los tres campos completos | 200, equipo actualizado |
| `DELETE /api/equipos/:id` | Sin cuerpo | 204, sin cuerpo |
| `POST /api/prestamos` | `{ "equipoId", "usuarioId" }`, números | 201, préstamo creado |
| `POST /api/prestamos/:id/devolucion` | Sin cuerpo; id del **préstamo** | 200, préstamo con fecha de devolución |

Las escrituras con cuerpo usan `Content-Type: application/json`. El campo `disponible` se ignora en altas y modificaciones: solo se cambia mediante préstamo o devolución. Los campos adicionales no se guardan.

Filtros del listado:

| Parámetro | Valores |
| --- | --- |
| `nombre` | Búsqueda parcial con `ILIKE`, sin distinguir mayúsculas |
| `categoria` | Categoría exacta; vacío significa todas |
| `disponible` | `true`, `false` o vacío |
| `orden` | `codigo` (predeterminado) o `nombre`, ascendente |
| `pagina` | Entero positivo; por defecto 1; cinco filas por página |

Ejemplo: `/equipos?nombre=portátil&categoria=Portátil&disponible=true&orden=nombre&pagina=2`.

Se solicitan seis filas a SQL y se muestran cinco: la sexta permite saber si hay página siguiente. Los enlaces mantienen todos los filtros. Una búsqueda sin coincidencias o una página posterior al final devuelve 200 con un mensaje, no 404.

Errores: `400` para datos inválidos o usuario de préstamo inexistente; `404` para equipo, préstamo o ruta inexistentes; `409` para código repetido, equipo ocupado, devolución repetida o borrado con historial; `500` para un fallo interno. Los errores se devuelven como `{ "error": "mensaje" }`, también en las rutas de consulta. No se muestran detalles SQL ni contraseñas.

## 7. Probar manualmente las operaciones

Abre `/equipos` y pega estas instrucciones, por bloques, en la consola del navegador. Se ejecutan contra el mismo servidor y **modifican la base de la práctica**. Para no tocarla, usa las pruebas de integración de la sección siguiente.

```javascript
// Alta: guarda el id recibido para las siguientes operaciones.
const alta = await fetch('/api/equipos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ codigo: 'DEMO-01', nombre: 'Portátil de prueba', categoria: 'Portátil' })
});
console.log(alta.status, alta.headers.get('Location'));
const equipo = await alta.json();
console.log(equipo);
```

```javascript
// Modificación: 200.
const cambio = await fetch(`/api/equipos/${equipo.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ codigo: 'DEMO-01', nombre: 'Portátil actualizado', categoria: 'Portátil' })
});
console.log(cambio.status, await cambio.json());

// Préstamo: 201; conserva el id DEL PRÉSTAMO.
const respuesta = await fetch('/api/prestamos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ equipoId: equipo.id, usuarioId: 1 })
});
const prestamo = await respuesta.json();
console.log(respuesta.status, prestamo);
```

```javascript
// Devolución: 200. Repetirla devuelve 409.
const devolucion = await fetch(`/api/prestamos/${prestamo.id}/devolucion`, { method: 'POST' });
console.log(devolucion.status, await devolucion.json());

// El historial se conserva: este equipo ya no puede borrarse (409).
const borrado = await fetch(`/api/equipos/${equipo.id}`, { method: 'DELETE' });
console.log(borrado.status, await borrado.json());
```

Para comprobar el borrado 204, crea otro equipo con un código distinto y bórralo **antes de prestarlo**. No llames a `.json()` sobre una respuesta 204 porque no tiene cuerpo. Consulta el detalle del equipo para ver el historial.

## 8. Pruebas reproducibles

Pruebas de validación sin base de datos:

```powershell
npm.cmd test
```

Para probar las consultas y transacciones se necesita una base **exclusiva de pruebas**, que se crea una sola vez:

```powershell
docker compose exec db psql -U postgres -d postgres -c "CREATE DATABASE dwes_test OWNER dwes_app;"
Copy-Item .env.test.example .env.test
```

Completa la contraseña de `dwes_app` en `.env.test` y ejecuta:

```powershell
npm.cmd run test:integracion
```

No hace falta tener Node arrancado: el script abre la aplicación en un puerto temporal y la cierra al finalizar. Usa `fetch`, `assert` de Node y consultas reales con `pg`; no instala frameworks de pruebas. **Cada ejecución elimina y recrea solamente el esquema `practica_prestamos` de `dwes_test`**. El script comprueba el nombre de la base y el rol antes de borrar. No apuntes una base con datos importantes a esta configuración.

### Resultados de comprobación (22/11/2026)

La evidencia y el entorno exacto se registran en [docs/pruebas.md](docs/pruebas.md). No se deben confundir las comprobaciones ejecutadas con los resultados esperados.

| Petición o comprobación | Resultado esperado | Resultado obtenido |
| --- | --- | --- |
| Validaciones (`npm test`) | Rechazar tipos, vacíos, rangos y filtros incorrectos | 6 pruebas correctas |
| Sintaxis (`node --check`) | Todos los módulos válidos | Correcta |
| `POST /api/equipos` y `PUT /api/equipos/:id` | 201 con Location; 200; duplicado 409 | Correcto: 201, 200 y 409; disponible protegido |
| `GET /equipos` con filtros y página 2 | ILIKE, filtros combinados, orden y 5 filas/página | Correcto: 5 filas y luego 1 para los 6 portátiles |
| `GET /equipos/:id` | Detalle con JOIN; id inválido 400; ausente 404 | Correcto: 200, 400 y 404 |
| `DELETE /api/equipos/:id` | 204; inexistente 404; con historial 409 | Correcto, también con historial finalizado |
| `POST /api/prestamos` | 201, una fila activa, equipo no disponible | Correcto; estado verificado mediante SQL |
| Préstamo duplicado | 409 sin nuevas filas | Correcto; estado anterior y posterior iguales |
| Préstamo a usuario inexistente | 400 y rollback de ambas escrituras | Correcto; disponibilidad y filas sin cambios |
| Devolución y repetición | 200 con fecha; después 409 sin cambios | Correcto; también se protege un préstamo posterior |
| Dos préstamos simultáneos | Un 201, un 409, una sola fila activa | Correcto; respuestas y filas comprobadas |
| Navegación en navegador | Filtros, Siguiente, Anterior y detalle | Correcto; revisión visual de ambas páginas |
| `docker compose up -d --wait` | PostgreSQL sano con volumen persistente | No ejecutado: Docker no está instalado en el entorno de trabajo |

## 9. Organización y decisiones

```text
compose.yaml                  PostgreSQL 18 con volumen persistente
init.sql                      Esquema, restricciones y datos iniciales
.env.example                  Configuración local sin secretos
.env.test.example             Configuración de la base exclusiva de pruebas
package.json / package-lock.json
src/
  config.mjs                  Lectura y validación de configuración
  db.mjs                      Pool compartido de PostgreSQL
  server.mjs                  Comprobación inicial y arranque HTTP
  app.mjs                     Rutas, validación de entrada y respuestas
  validacion.mjs              Funciones de validación
  errores.mjs                 Errores controlados y traducción de SQLSTATE
  equipos.repo.mjs            Consultas de inventario y de historial
  prestamos.service.mjs       Transacciones de préstamo y devolución
views/
  equipos.ejs                 Listado con filtros y paginación
  equipo.ejs                  Detalle e historial
scripts/comprobar.mjs         Comprobaciones HTTP y SQL reales
tests/validacion.test.mjs     Pruebas de las validaciones
docs/                         Enunciado, temario y documentación
```

La separación es pequeña y explícita: las rutas tratan HTTP; el repositorio concentra SQL de equipos; el servicio agrupa las transacciones. No se utilizan ORM, TypeScript, contenedores de dependencias ni capas adicionales innecesarias. Las únicas dependencias son las tres bibliotecas exigidas: Express, pg y EJS.

El **índice UNIQUE parcial** y el tratamiento concreto de **SQLSTATE** se incluyen porque los exige el enunciado, aunque el temario no desarrolla su sintaxis completa. No introducen tecnologías adicionales. El resto aplica los conceptos de las unidades 1, 3 y 4 y las utilidades básicas de la plataforma necesarias para ejecutarlos.

## 10. Limitaciones y entrega

- Práctica local sin autenticación: cualquier cliente que acceda al servidor puede realizar las operaciones. Se escucha en `127.0.0.1` y no se plantea como servicio público.
- La interfaz es HTML semántico sencillo. Las escrituras se hacen con JSON, como indica el enunciado.
- Búsquedas: `%` y `_` conservan su significado de comodines de `ILIKE`. La categoría se compara de forma exacta.
- Las fechas se almacenan con zona horaria y se muestran en UTC en el detalle.
- Las transacciones mantienen disponibilidad e historial coherentes en la aplicación. Alterar manualmente `disponible` mediante SQL puede romper esa coherencia; no se añaden triggers ajenos al alcance.
- No se ha ejecutado Docker en este equipo. Hay que comprobar su arranque y la persistencia del volumen en un entorno con Docker antes de entregar.
- No hace falta compilar: es JavaScript ejecutado directamente por Node. Para revisar sintaxis se utiliza `node --check`.
- Todos los archivos de texto del proyecto están en **UTF-8 sin BOM**.

Entrega los archivos fuente, `docs`, plantillas, SQL, Compose, README, ejemplos de entorno y `package-lock.json`. Excluye `node_modules`, `.env`, `.env.test`, archivos temporales y datos de PostgreSQL. No se ha enviado ni publicado la práctica automáticamente.
