// Pruebas reales con fetch y pg, sin frameworks ni simulaciones de PostgreSQL.
// Solo se ejecutan sobre dwes_test: BORRAN su esquema practica_prestamos.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { app } from '../src/app.mjs';
import { pool } from '../src/db.mjs';
import { config } from '../src/config.mjs';

if (config.base.database !== 'dwes_test' || config.base.user !== 'dwes_app') {
  throw new Error('Usa exclusivamente la base dwes_test con el rol dwes_app. No se ha borrado nada.');
}

let servidor;
let base;
let comprobaciones = 0;
function correcto(mensaje) {
  comprobaciones += 1;
  console.log(`OK ${comprobaciones}: ${mensaje}`);
}

async function peticion(metodo, ruta, datos, estado) {
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers: datos === undefined ? {} : { 'Content-Type': 'application/json' },
    body: datos === undefined ? undefined : JSON.stringify(datos)
  });
  const texto = await respuesta.text();
  assert.equal(respuesta.status, estado, `${metodo} ${ruta}: ${texto}`);
  const contenido = respuesta.headers.get('content-type')?.includes('application/json') && texto
    ? JSON.parse(texto) : texto;
  return { respuesta, contenido };
}

async function estadoEquipo(id) {
  const equipo = await pool.query('SELECT disponible FROM practica_prestamos.equipos WHERE id = $1', [id]);
  const prestamos = await pool.query(`
    SELECT id, usuario_id, fecha_devolucion FROM practica_prestamos.prestamos
    WHERE equipo_id = $1 ORDER BY id`, [id]);
  return { disponible: equipo.rows[0].disponible, prestamos: prestamos.rows };
}

try {
  // Esta destrucción está limitada a la base dedicada y se anuncia antes de ejecutarse.
  console.log('Restaurando SOLO practica_prestamos en dwes_test.');
  await pool.query('DROP SCHEMA IF EXISTS practica_prestamos CASCADE');
  await pool.query(await readFile(new URL('../init.sql', import.meta.url), 'utf8'));
  servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    servidor.once('listening', resolve);
    servidor.once('error', reject);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
  correcto('Inicialización real: tablas, restricciones, 12 equipos y 3 usuarios');

  const datos = { codigo: 'PRUEBA-01', nombre: 'Equipo de prueba', categoria: 'Pruebas' };
  const alta = await peticion('POST', '/api/equipos', datos, 201);
  const id = alta.contenido.id;
  assert.equal(alta.respuesta.headers.get('location'), `/equipos/${id}`);
  assert.equal(alta.contenido.disponible, true);
  correcto('Alta 201 con id, Location y disponibilidad inicial');
  await peticion('POST', '/api/equipos', datos, 409);
  correcto('Código duplicado: 409');
  const cambio = await peticion('PUT', `/api/equipos/${id}`, { ...datos, nombre: 'Equipo modificado', disponible: false }, 200);
  assert.equal(cambio.contenido.nombre, 'Equipo modificado');
  assert.equal(cambio.contenido.disponible, true);
  await peticion('PUT', `/api/equipos/${id}`, { ...datos, codigo: 'PORT-01' }, 409);
  await peticion('PUT', '/api/equipos/2147483647', datos, 404);
  correcto('Modificación 200; disponible protegido; duplicado 409 e inexistente 404');

  for (const cuerpo of [{}, [], { ...datos, nombre: '  ' }, { ...datos, codigo: 'X'.repeat(21) }]) {
    await peticion('POST', '/api/equipos', cuerpo, 400);
  }
  const jsonRoto = await fetch(base + '/api/equipos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(jsonRoto.status, 400);
  const jsonError = await jsonRoto.json();
  assert.equal(jsonError.error, 'El cuerpo debe contener JSON válido.');
  correcto('Validación de tipos, campos, longitudes y JSON mal formado: 400');

  const lista = await peticion('GET', '/equipos', undefined, 200);
  assert.equal((lista.contenido.match(/<td><a href=/g) ?? []).length, 5);
  const filtro = '/equipos?nombre=pOrT%C3%81tIl&categoria=Port%C3%A1til&disponible=true&orden=nombre';
  const primera = await peticion('GET', filtro, undefined, 200);
  const segunda = await peticion('GET', filtro + '&pagina=2', undefined, 200);
  assert.equal((primera.contenido.match(/<td><a href=/g) ?? []).length, 5);
  assert.equal((segunda.contenido.match(/<td><a href=/g) ?? []).length, 1);
  assert.ok(primera.contenido.includes('Portátil Acer'));
  assert.ok(segunda.contenido.includes('Portátil Toshiba'));
  assert.ok(primera.contenido.includes('nombre=pOrT%C3%81tIl&amp;categoria=Port%C3%A1til&amp;disponible=true&amp;orden=nombre&amp;pagina=2'));
  const vacia = await peticion('GET', '/equipos?nombre=INEXISTENTE', undefined, 200);
  assert.ok(vacia.contenido.includes('No hay equipos que mostrar'));
  correcto('ILIKE, filtros combinados, orden, 5 filas, segunda página y enlaces con filtros');

  const sinPrestamo = await peticion('GET', '/equipos/1', undefined, 200);
  assert.ok(sinPrestamo.contenido.includes('Sin préstamo activo'));
  assert.ok(sinPrestamo.contenido.includes('todavía no tiene préstamos'));
  for (const ruta of ['/equipos/abc', '/equipos/0', '/equipos/1.2', '/equipos/2147483648', '/equipos?pagina=0', '/equipos?orden=libre', '/equipos?nombre=a&nombre=b']) {
    await peticion('GET', ruta, undefined, 400);
  }
  await peticion('GET', '/equipos/2147483647', undefined, 404);
  correcto('LEFT JOIN conserva equipos sin préstamos; parámetros inválidos 400 y ausentes 404');

  const borrado = await peticion('DELETE', `/api/equipos/${id}`, undefined, 204);
  assert.equal(borrado.contenido, '');
  await peticion('DELETE', `/api/equipos/${id}`, undefined, 404);
  correcto('Borrado sin historial: 204 sin cuerpo; repetición: 404');

  const prestamo = await peticion('POST', '/api/prestamos', { equipoId: 1, usuarioId: 1 }, 201);
  const prestamoId = prestamo.contenido.id;
  let estado = await estadoEquipo(1);
  assert.equal(estado.disponible, false);
  assert.equal(estado.prestamos.length, 1);
  assert.equal(estado.prestamos[0].fecha_devolucion, null);
  const detalle = await peticion('GET', '/equipos/1', undefined, 200);
  assert.ok(detalle.contenido.includes('Ana García'));
  assert.ok(detalle.contenido.includes('Pendiente'));
  const ocupados = await peticion('GET', '/equipos?disponible=false', undefined, 200);
  assert.equal((ocupados.contenido.match(/<td><a href=/g) ?? []).length, 1);
  correcto('Préstamo 201, estado persistido, usuario actual, historial y filtro de prestados');
  await peticion('POST', '/api/prestamos', { equipoId: 1, usuarioId: 2 }, 409);
  assert.deepEqual(await estadoEquipo(1), estado);
  await peticion('DELETE', '/api/equipos/1', undefined, 409);
  correcto('Préstamo repetido y borrado con préstamo activo: 409, sin alterar filas');

  const antes = await estadoEquipo(2);
  await peticion('POST', '/api/prestamos', { equipoId: 2, usuarioId: 2147483647 }, 400);
  assert.deepEqual(await estadoEquipo(2), antes);
  await peticion('POST', '/api/prestamos', { equipoId: 2147483647, usuarioId: 1 }, 404);
  await peticion('POST', '/api/prestamos', { equipoId: '2', usuarioId: 1 }, 400);
  correcto('Usuario inexistente: rollback real de disponibilidad y préstamo; equipo ausente 404');

  const devolucion = await peticion('POST', `/api/prestamos/${prestamoId}/devolucion`, undefined, 200);
  assert.ok(devolucion.contenido.fecha_devolucion);
  estado = await estadoEquipo(1);
  assert.equal(estado.disponible, true);
  assert.ok(estado.prestamos[0].fecha_devolucion);
  await peticion('POST', `/api/prestamos/${prestamoId}/devolucion`, undefined, 409);
  assert.deepEqual(await estadoEquipo(1), estado);
  await peticion('POST', '/api/prestamos/2147483647/devolucion', undefined, 404);
  await peticion('DELETE', '/api/equipos/1', undefined, 409);
  correcto('Devolución 200 con fecha; repetida 409 sin cambios; ausente 404; historial impide borrar');

  // Ambas peticiones compiten por la misma fila en PostgreSQL real.
  const respuestas = await Promise.all([1, 2].map(usuarioId => fetch(base + '/api/prestamos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipoId: 3, usuarioId })
  })));
  assert.deepEqual(respuestas.map(r => r.status).sort(), [201, 409]);
  await Promise.all(respuestas.map(r => r.json()));
  const simultaneo = await estadoEquipo(3);
  assert.equal(simultaneo.disponible, false);
  assert.equal(simultaneo.prestamos.length, 1);
  assert.equal(simultaneo.prestamos[0].fecha_devolucion, null);
  correcto('Dos préstamos simultáneos: 201 y 409; exactamente una fila activa');

  // Un préstamo nuevo tras devolver es válido; repetir la devolución antigua no lo libera.
  await peticion('POST', '/api/prestamos', { equipoId: 1, usuarioId: 2 }, 201);
  estado = await estadoEquipo(1);
  await peticion('POST', `/api/prestamos/${prestamoId}/devolucion`, undefined, 409);
  assert.deepEqual(await estadoEquipo(1), estado);
  correcto('El historial permite volver a prestar; una devolución antigua no libera el préstamo nuevo');

  await assert.rejects(pool.query(`INSERT INTO practica_prestamos.prestamos (equipo_id, usuario_id) VALUES (3, 2)`), { code: '23505' });
  await assert.rejects(pool.query(`INSERT INTO practica_prestamos.equipos (codigo, nombre, categoria) VALUES ('VACIO', ' ', 'Prueba')`), { code: '23514' });
  await assert.rejects(pool.query(`INSERT INTO practica_prestamos.equipos (codigo, nombre, categoria) VALUES ('123456789012345678901', 'Prueba', 'Prueba')`), { code: '22001' });
  correcto('La propia base rechaza dos préstamos activos, nombres vacíos y códigos largos');

  const ataque = await peticion('POST', '/api/equipos', { codigo: 'SEGURO', nombre: '<script>alert(1)</script>', categoria: "X'; DROP TABLE equipos; --" }, 201);
  const html = await peticion('GET', `/equipos/${ataque.contenido.id}`, undefined, 200);
  assert.ok(html.contenido.includes('&lt;script&gt;'));
  assert.ok(!html.contenido.includes('<script>'));
  await peticion('GET', '/equipos?nombre=%27%3B%20DROP%20TABLE%20equipos%3B--', undefined, 200);
  await peticion('GET', '/equipos', undefined, 200);
  correcto('SQL parametrizado y escape EJS: los datos no se ejecutan como SQL ni HTML');

  console.log(`Resultado: ${comprobaciones} grupos de comprobaciones correctos.`);
} finally {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  await pool.end();
}
