import { pool } from './db.mjs';
import { ErrorDominio } from './errores.mjs';

export async function listarEquipos(filtros) {
  // Solo se concatena una de estas constantes, nunca una columna enviada por el usuario.
  const orden = filtros.orden === 'nombre' ? 'nombre ASC, id ASC' : 'codigo ASC, id ASC';
  const resultado = await pool.query(`
    SELECT id, codigo, nombre, categoria, disponible
    FROM practica_prestamos.equipos
    WHERE nombre ILIKE $1
      AND ($2::text = '' OR categoria = $2)
      AND ($3::boolean IS NULL OR disponible = $3)
    ORDER BY ${orden}
    LIMIT $4 OFFSET $5`,
  [`%${filtros.nombre}%`, filtros.categoria,
    filtros.disponible === '' ? null : filtros.disponible === 'true',
    6, (filtros.pagina - 1) * 5]);

  // La sexta fila solo sirve para saber si existe una página siguiente.
  return { equipos: resultado.rows.slice(0, 5), haySiguiente: resultado.rows.length > 5 };
}

export async function listarCategorias() {
  const resultado = await pool.query(`
    SELECT DISTINCT categoria FROM practica_prestamos.equipos ORDER BY categoria`);
  return resultado.rows;
}

export async function buscarEquipo(id) {
  const resultado = await pool.query(`
    SELECT e.id, e.codigo, e.nombre, e.categoria, e.disponible,
           u.nombre AS usuario_actual
    FROM practica_prestamos.equipos e
    LEFT JOIN practica_prestamos.prestamos p
      ON p.equipo_id = e.id AND p.fecha_devolucion IS NULL
    LEFT JOIN practica_prestamos.usuarios u ON u.id = p.usuario_id
    WHERE e.id = $1`, [id]);
  if (resultado.rowCount === 0) throw new ErrorDominio('NO_ENCONTRADO', 'El equipo no existe.');
  return resultado.rows[0];
}

export async function historialEquipo(id) {
  const resultado = await pool.query(`
    SELECT p.id, u.nombre AS usuario, p.fecha_prestamo, p.fecha_devolucion
    FROM practica_prestamos.prestamos p
    INNER JOIN practica_prestamos.usuarios u ON u.id = p.usuario_id
    WHERE p.equipo_id = $1
    ORDER BY p.fecha_prestamo DESC, p.id DESC`, [id]);
  return resultado.rows;
}

export async function crearEquipo(equipo) {
  const resultado = await pool.query(`
    INSERT INTO practica_prestamos.equipos (codigo, nombre, categoria)
    VALUES ($1, $2, $3)
    RETURNING id, codigo, nombre, categoria, disponible`,
  [equipo.codigo, equipo.nombre, equipo.categoria]);
  return resultado.rows[0];
}

export async function actualizarEquipo(id, equipo) {
  const resultado = await pool.query(`
    UPDATE practica_prestamos.equipos
    SET codigo = $1, nombre = $2, categoria = $3
    WHERE id = $4
    RETURNING id, codigo, nombre, categoria, disponible`,
  [equipo.codigo, equipo.nombre, equipo.categoria, id]);
  if (resultado.rowCount === 0) throw new ErrorDominio('NO_ENCONTRADO', 'El equipo no existe.');
  return resultado.rows[0];
}

export async function borrarEquipo(id) {
  const resultado = await pool.query('DELETE FROM practica_prestamos.equipos WHERE id = $1', [id]);
  if (resultado.rowCount === 0) throw new ErrorDominio('NO_ENCONTRADO', 'El equipo no existe.');
}
