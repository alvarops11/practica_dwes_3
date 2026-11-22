# Desarrollo de la práctica UD4

Fecha: **22/11/2026**.

## Alcance y referencia

Se ha desarrollado desde cero la gestión de préstamos de material informático definida en `Enunciado_Practica_DWES_UD4.pdf`. El proyecto inicial solo contenía el PDF y `temario-completo-dwes.md`; no había código previo que conservar.

Se mantiene una solución de nivel inicial: funciones con nombres descriptivos, módulos pequeños, SQL directo y dos plantillas EJS. No se implementan funcionalidades opcionales de otras unidades, como login o sesiones.

## Correspondencia con el temario

| Elemento de la solución | Contenido utilizado |
| --- | --- |
| Node, npm, Express, rutas, JSON y middleware | UD1, sesiones 1 y 2 |
| Dos vistas EJS y escape de datos con `<%=` | UD1, sesión 3 |
| Constantes, funciones, arrays y validación numérica | UD1, sesiones 4, 5 y 6 |
| Separación de HTTP, SQL y reglas de negocio | UD3, sesión 10 |
| Configuración por entorno y validación al arrancar | UD3, sesión 11 |
| PostgreSQL 18 en Compose, rol limitado y pg.Pool | UD4, sesión 12 |
| ILIKE, WHERE, JOIN, LEFT JOIN, LIMIT y OFFSET | UD4, sesión 13 |
| INSERT/UPDATE/DELETE, RETURNING y rowCount | UD4, sesión 14 |
| Restricciones, parámetros SQL y transacciones | UD4, sesión 14 |
| Base separada y assert para verificar resultados | UD4, sesión 14 |

El índice `UNIQUE` parcial sobre préstamos activos y la traducción concreta de SQLSTATE están exigidos expresamente por el enunciado. El temario menciona restricciones y errores, pero no desarrolla todos esos detalles de sintaxis. Se han implementado de forma directa, sin añadir bibliotecas. La carga nativa de `.env` y los enlaces con `URLSearchParams` son utilidades de la plataforma para materializar la configuración y la navegación solicitadas.

## Archivos añadidos

- `compose.yaml`, `init.sql`: infraestructura, modelo y datos de ejemplo.
- `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `.env.test.example`: instalación reproducible y configuración sin contraseñas.
- `src/config.mjs`, `src/db.mjs`, `src/server.mjs`: configuración, conexiones y arranque.
- `src/app.mjs`, `src/validacion.mjs`, `src/errores.mjs`: rutas, entrada y errores.
- `src/equipos.repo.mjs`, `src/prestamos.service.mjs`: consultas y transacciones.
- `views/equipos.ejs`, `views/equipo.ejs`: las dos páginas requeridas.
- `tests/validacion.test.mjs`, `scripts/comprobar.mjs`: comprobaciones reproducibles.
- `README.md`, `docs/desarrollo-practica.md`, `docs/pruebas.md`: uso, decisiones y evidencia.

Los documentos originales del usuario no se modifican.

## Modelo y restricciones

El esquema `practica_prestamos` contiene:

1. `equipos`: id autogenerado, código único de 1 a 20 caracteres, nombre y categoría no vacíos, disponible inicialmente `true`.
2. `usuarios`: id autogenerado y nombre no vacío. Se inicializan tres usuarios y no se añaden rutas para gestionarlos.
3. `prestamos`: referencias obligatorias a equipo y usuario; fecha de préstamo automática y devolución inicialmente `NULL`.

Todas las tablas tienen `PRIMARY KEY`. Los campos obligatorios utilizan `NOT NULL`. Los `CHECK` rechazan textos vacíos y fechas de devolución anteriores al préstamo. Las FK conservan el comportamiento sin cascada: no se borra un equipo con historial, aunque esté disponible.

El índice parcial es:

```sql
CREATE UNIQUE INDEX un_prestamo_activo_por_equipo
ON practica_prestamos.prestamos (equipo_id)
WHERE fecha_devolucion IS NULL;
```

Solo los préstamos activos participan en la unicidad. Por eso un equipo puede tener muchos préstamos finalizados, pero solo uno sin fecha de devolución.

## Recorrido de una petición

`app.mjs` recibe la petición y valida parámetros o JSON. Las funciones de `equipos.repo.mjs` ejecutan las consultas de inventario; las de `prestamos.service.mjs` ejecutan las transacciones. La ruta devuelve JSON o renderiza EJS. Los errores llegan a `manejarError` porque Express 5 propaga los rechazos de funciones `async`.

No se han creado clases de controlador o interfaces de repositorio: no aportan una ventaja necesaria para las siete rutas de esta práctica. La única clase propia, `ErrorDominio`, permite expresar errores controlados sin acoplar el código SQL a objetos HTTP.

## Listado y detalle

El listado aplica los tres filtros en una sola consulta con `WHERE`. Todos los valores son parámetros `$n`. La columna de orden se elige entre dos cadenas constantes del servidor, después de validar `orden`. Se añade el id como segundo criterio para ordenar de forma estable nombres repetidos.

Cada página muestra cinco filas. `LIMIT 6` obtiene una fila extra para detectar la página siguiente; `OFFSET` vale `(pagina - 1) * 5`. Los enlaces se construyen con los filtros codificados. Al enviar una nueva búsqueda no se envía la página anterior, de modo que se vuelve a la primera.

El detalle usa `LEFT JOIN` de equipos con préstamo activo y usuario: un equipo sin préstamo sigue apareciendo. El historial utiliza `INNER JOIN` de préstamos y usuarios. No se confunde una consulta sin filas con un problema de conexión.

## Altas, cambios y borrados

El alta utiliza `INSERT ... RETURNING` y responde 201 con el equipo y `Location: /equipos/:id`, que apunta a su página de detalle. La modificación solo actualiza código, nombre y categoría; el estado disponible nunca se toma del JSON. Tanto `UPDATE` como `DELETE` comprueban `rowCount` para responder 404 si no existe el equipo.

Se deja a la FK impedir el borrado con historial. Esto evita depender de una comprobación previa que podría quedar desactualizada entre dos peticiones.

## Transacción de préstamo

1. Obtener un cliente del pool y ejecutar `BEGIN`.
2. Actualizar el equipo a no disponible **solo si sigue disponible**.
3. Si `rowCount` es cero, distinguir equipo inexistente (404) de ocupado (409).
4. Insertar el préstamo con el mismo cliente. La FK comprueba que el usuario existe.
5. Confirmar con `COMMIT` solo después de ambas escrituras.
6. Ante un fallo, ejecutar `ROLLBACK`. El bloque `finally` libera siempre el cliente.

Si dos peticiones compiten, PostgreSQL coordina sus actualizaciones sobre la misma fila. La segunda ya no puede cumplir `disponible = true` cuando la primera confirma. El índice parcial añade una protección en la base de datos.

El usuario no se busca antes de la transacción: si no existe, la inserción falla y permite demostrar que el rollback deshace la disponibilidad cambiada previamente.

## Transacción de devolución

1. Obtener cliente y ejecutar `BEGIN`.
2. Establecer `fecha_devolucion` solo donde el préstamo indicado la tenga a `NULL`.
3. Si no se modifica ninguna fila, responder 404 si no existe o 409 si ya se devolvió.
4. Usar `equipo_id` del préstamo actualizado para marcar el equipo disponible.
5. Confirmar ambas escrituras juntas; rollback ante fallo y liberación en `finally`.

Una devolución repetida no llega a actualizar el equipo. Esto también evita que una devolución antigua libere por error un nuevo préstamo del mismo equipo.

## Validación y errores

- Las cadenas obligatorias se recortan con `trim` y se rechazan si quedan vacías.
- El código admite como máximo 20 caracteres. Nombre y categoría usan `TEXT`, sin límites arbitrarios adicionales.
- Los identificadores deben ser enteros positivos compatibles con `INTEGER` de PostgreSQL (hasta 2147483647). En el JSON de préstamos se exigen números; las rutas y filtros llegan como texto.
- Los cuerpos deben ser objetos JSON, no arrays. `express.json` detecta JSON mal formado y limita el tamaño a 10 KB.
- Filtros repetidos, estados desconocidos, páginas inválidas y órdenes no permitidos se rechazan con 400.
- SQLSTATE `23505` se transforma en 409. `23503` devuelve 409 en borrados y 400 en referencias inválidas de escritura.
- `NOT NULL`, `CHECK`, tamaño y formato numérico incorrectos se convierten en 400; los fallos inesperados, en 500 genérico.
- EJS escapa los valores mediante `<%=`. No hay interpolación de HTML sin escapar.

## Cómo comprobarlo y limitaciones

El README contiene el arranque completo y ejemplos de `fetch`. `npm test` valida las funciones sin PostgreSQL. `npm run test:integracion` verifica HTTP y el estado real de las tablas en `dwes_test`, incluyendo rollback y simultaneidad. La evidencia exacta está en `pruebas.md`.

El entorno de trabajo no dispone de Docker. La comprobación del contenedor y del volumen requiere un equipo con Docker operativo. La aplicación es local, no incluye autenticación y no pretende cubrir un despliegue público. No se incorpora CSS avanzado ni una interfaz para escrituras.

Los comentarios del código explican decisiones y pasos relevantes, especialmente SQL parametrizado, control de disponibilidad, rollback y escape de HTML. Se evita comentar cada instrucción trivial. Todos los archivos de texto se guardan en UTF-8 sin BOM.
