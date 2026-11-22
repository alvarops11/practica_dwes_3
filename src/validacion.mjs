import { ErrorDominio } from './errores.mjs';

function invalido(mensaje) {
  throw new ErrorDominio('DATOS_INVALIDOS', mensaje);
}

export function validarId(valor, nombre = 'id') {
  // Rechazamos booleanos, arrays, decimales y cadenas con sufijos.
  if ((typeof valor !== 'string' && typeof valor !== 'number') || String(valor).trim() === '') {
    invalido(`${nombre} debe ser un entero positivo.`);
  }
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 2147483647) {
    invalido(`${nombre} debe ser un entero positivo dentro del rango INTEGER.`);
  }
  return numero;
}

export function validarObjeto(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    invalido('El cuerpo debe ser un objeto JSON.');
  }
}

export function validarEquipo(datos) {
  validarObjeto(datos);
  const equipo = {};
  for (const campo of ['codigo', 'nombre', 'categoria']) {
    if (typeof datos[campo] !== 'string' || datos[campo].trim() === '') {
      invalido(`${campo} es obligatorio y debe ser texto no vacío.`);
    }
    equipo[campo] = datos[campo].trim();
  }
  if ([...equipo.codigo].length > 20) invalido('El código admite como máximo 20 caracteres.');
  // Solo copiamos estos tres campos; disponible nunca viene del cliente.
  return equipo;
}

export function validarPrestamo(datos) {
  validarObjeto(datos);
  // En JSON exigimos números; los parámetros de URL sí llegan como texto.
  if (typeof datos.equipoId !== 'number' || typeof datos.usuarioId !== 'number') {
    invalido('equipoId y usuarioId deben ser números enteros positivos.');
  }
  return {
    equipoId: validarId(datos.equipoId, 'equipoId'),
    usuarioId: validarId(datos.usuarioId, 'usuarioId')
  };
}

export function validarFiltros(query) {
  const filtros = { nombre: '', categoria: '', disponible: '', orden: 'codigo', pagina: '1' };
  for (const campo of ['nombre', 'categoria', 'disponible', 'orden', 'pagina']) {
    if (query[campo] !== undefined) {
      if (typeof query[campo] !== 'string') invalido(`El filtro ${campo} debe tener un único valor.`);
      filtros[campo] = query[campo].trim();
    }
  }
  if (!['', 'true', 'false'].includes(filtros.disponible)) invalido('Disponibilidad no válida.');
  if (!['codigo', 'nombre'].includes(filtros.orden)) invalido('La ordenación debe ser codigo o nombre.');
  filtros.pagina = validarId(filtros.pagina, 'pagina');
  return filtros;
}
