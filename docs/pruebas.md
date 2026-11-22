# Comprobaciones de la práctica

Fecha: **22/11/2026**.

## Entorno y alcance

- Windows y Node.js 24.14.0.
- Dependencias instaladas con npm; versiones exactas recogidas en `package-lock.json`.
- Docker no está instalado; WSL tampoco está disponible.
- Para validar la aplicación se ha ejecutado PostgreSQL **18.7** con los [binarios de EDB](https://www.enterprisedb.com/download-postgresql-binaries), en una carpeta temporal, sin instalación como servicio ni cambios en PATH.
- Base aislada `dwes_test`, rol `dwes_app` sin superusuario, puerto local 55432 y codificación UTF-8. En la instancia temporal de Windows se usó la configuración regional incorporada `C.UTF-8` para comprobar ILIKE con tildes.
- No se han usado mocks para dar por probadas las transacciones.

## Comprobaciones realizadas

`npm test`: **6 pruebas correctas**, sin errores ni pruebas omitidas.

Cobertura: identificadores y rangos, textos obligatorios, código de hasta 20 caracteres, exclusión de `disponible` en la entrada del inventario, tipos de préstamo, filtros, ordenación y páginas inválidas.

`node --check` sobre los módulos de `src`, `scripts` y `tests`: **sin errores de sintaxis**. Es JavaScript, por lo que no hay un paso de compilación separado.

## Integración con PostgreSQL

**Ejecutada correctamente: 16 grupos de comprobaciones**, todos sobre PostgreSQL real. Se ejecutó `node scripts/comprobar.mjs` con las variables de la instancia temporal en el proceso (el mismo script que invoca `npm run test:integracion` con `.env.test`). Se comprobaron:

1. Inicialización del esquema.
2. Altas, Location, modificaciones y código duplicado.
3. JSON incorrecto, validaciones y respuestas 400.
4. Búsqueda ILIKE, filtros combinados, orden y paginación conservando filtros.
5. Detalle sin préstamos, usuario actual e historial.
6. Borrados 204, 404 y 409 por historial activo o terminado.
7. Préstamo correcto y repetido, verificando las filas persistidas.
8. Rollback con usuario inexistente, comparando estado anterior y posterior.
9. Devolución con fecha y disponibilidad; repetición sin cambios.
10. Dos solicitudes simultáneas: un 201, un 409 y exactamente una fila activa.
11. Nuevo préstamo tras devolución y protección frente a devolver otra vez el antiguo.
12. Restricciones directamente en SQL, inyección SQL y escape de HTML.

El script solo admite la base `dwes_test` y el rol `dwes_app`. Borra y recrea su esquema de práctica. No debe ejecutarse sobre información que se quiera conservar.

Salida resumida de la ejecución:

```text
OK 1: Inicialización real: tablas, restricciones, 12 equipos y 3 usuarios
OK 2: Alta 201 con id, Location y disponibilidad inicial
OK 3: Código duplicado: 409
OK 4: Modificación 200; disponible protegido; duplicado 409 e inexistente 404
OK 5: Validación de tipos, campos, longitudes y JSON mal formado: 400
OK 6: ILIKE, filtros combinados, orden, 5 filas, segunda página y enlaces con filtros
OK 7: LEFT JOIN conserva equipos sin préstamos; parámetros inválidos 400 y ausentes 404
OK 8: Borrado sin historial: 204 sin cuerpo; repetición: 404
OK 9: Préstamo 201, estado persistido, usuario actual, historial y filtro de prestados
OK 10: Préstamo repetido y borrado con préstamo activo: 409, sin alterar filas
OK 11: Usuario inexistente: rollback real de disponibilidad y préstamo; equipo ausente 404
OK 12: Devolución 200 con fecha; repetida 409 sin cambios; ausente 404; historial impide borrar
OK 13: Dos préstamos simultáneos: 201 y 409; exactamente una fila activa
OK 14: El historial permite volver a prestar; una devolución antigua no libera el préstamo nuevo
OK 15: La propia base rechaza dos préstamos activos, nombres vacíos y códigos largos
OK 16: SQL parametrizado y escape EJS: los datos no se ejecutan como SQL ni HTML
Resultado: 16 grupos de comprobaciones correctos.
```

## Revisión en navegador

Se arrancó `src/server.mjs` en el puerto local 3301 con la base aislada y se revisaron visualmente las dos páginas:

- Listado: encabezados, tabla, etiquetas de formulario y estados legibles.
- Búsqueda `portátil`, categoría `Portátil`, orden por nombre: cinco equipos en la primera página y uno en la segunda.
- Enlaces Siguiente y Anterior: conservan nombre, categoría y orden.
- Detalle `PORT-01`: muestra a Luis Pérez como usuario actual y el historial con el préstamo anterior de Ana García ya finalizado.

La presentación es HTML básico, tal como pide el enunciado. La instancia y el servidor usados en la revisión son temporales y no forman parte de la entrega.

## Comprobaciones pendientes del entorno Docker

- Ejecutar la instalación del README desde una base vacía con `postgres:18`.
- Comprobar `docker compose ps` y el estado saludable del contenedor.
- Crear un equipo, parar con `docker compose down`, arrancar con `docker compose up -d --wait` y comprobar que sigue existiendo.

No se atribuyen resultados correctos a comprobaciones que todavía no se han ejecutado.
