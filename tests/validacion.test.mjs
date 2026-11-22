import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarId, validarEquipo, validarPrestamo, validarFiltros } from '../src/validacion.mjs';

test('Los identificadores deben ser enteros positivos del rango INTEGER', () => {
  assert.equal(validarId('12'), 12);
  for (const valor of ['', ' ', '12abc', '1.2', 0, -1, true, null, [], {}, 2147483648]) {
    assert.throws(() => validarId(valor), { codigo: 'DATOS_INVALIDOS' });
  }
});

test('El equipo se limpia y no acepta disponible desde el cliente', () => {
  assert.deepEqual(validarEquipo({ codigo: ' PC-1 ', nombre: ' PC ', categoria: ' Aula ', disponible: false }),
    { codigo: 'PC-1', nombre: 'PC', categoria: 'Aula' });
});

test('Se rechazan cuerpos, textos y códigos incorrectos', () => {
  for (const datos of [undefined, null, [], 'texto', {},
    { codigo: 'X'.repeat(21), nombre: 'PC', categoria: 'Aula' },
    { codigo: 'X', nombre: '  ', categoria: 'Aula' },
    { codigo: 123, nombre: 'PC', categoria: 'Aula' },
    { codigo: 'X', nombre: 'PC', categoria: false }]) {
    assert.throws(() => validarEquipo(datos), { codigo: 'DATOS_INVALIDOS' });
  }
  assert.equal(validarEquipo({ codigo: 'X'.repeat(20), nombre: 'PC', categoria: 'Aula' }).codigo.length, 20);
});

test('El préstamo exige dos identificadores numéricos válidos', () => {
  assert.deepEqual(validarPrestamo({ equipoId: 1, usuarioId: 2 }), { equipoId: 1, usuarioId: 2 });
  for (const datos of [{ equipoId: '1', usuarioId: 2 }, { equipoId: 1, usuarioId: false },
    { equipoId: 0, usuarioId: 2 }, { equipoId: 1, usuarioId: 2.5 }, {}]) {
    assert.throws(() => validarPrestamo(datos), { codigo: 'DATOS_INVALIDOS' });
  }
});

test('Los filtros tienen valores iniciales y conservan la selección', () => {
  assert.deepEqual(validarFiltros({}), { nombre: '', categoria: '', disponible: '', orden: 'codigo', pagina: 1 });
  assert.deepEqual(validarFiltros({ nombre: ' portátil ', categoria: 'Portátil', disponible: 'true', orden: 'nombre', pagina: '2' }),
    { nombre: 'portátil', categoria: 'Portátil', disponible: 'true', orden: 'nombre', pagina: 2 });
});

test('Se rechazan filtros repetidos, ordenación libre y páginas inválidas', () => {
  for (const datos of [{ nombre: ['a', 'b'] }, { orden: 'nombre; DROP TABLE equipos' },
    { disponible: 'quizá' }, { pagina: '0' }, { pagina: '2abc' }, { pagina: '' }]) {
    assert.throws(() => validarFiltros(datos), { codigo: 'DATOS_INVALIDOS' });
  }
});
