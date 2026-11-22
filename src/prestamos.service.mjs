import { pool } from './db.mjs';
import { ErrorDominio } from './errores.mjs';

export async function prestarEquipo(equipoId, usuarioId) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    // El UPDATE condicional impide que dos peticiones reserven el mismo equipo.
    const cambio = await cliente.query(`
      UPDATE practica_prestamos.equipos SET disponible = false
      WHERE id = $1 AND disponible = true RETURNING id`, [equipoId]);
    if (cambio.rowCount === 0) {
      const existe = await cliente.query('SELECT id FROM practica_prestamos.equipos WHERE id = $1', [equipoId]);
      if (existe.rowCount === 0) throw new ErrorDominio('NO_ENCONTRADO', 'El equipo no existe.');
      throw new ErrorDominio('CONFLICTO', 'El equipo ya está prestado.');
    }

    // Si el usuario no existe, la FK falla y ROLLBACK restaura la disponibilidad.
    const resultado = await cliente.query(`
      INSERT INTO practica_prestamos.prestamos (equipo_id, usuario_id)
      VALUES ($1, $2)
      RETURNING id, equipo_id, usuario_id, fecha_prestamo, fecha_devolucion`, [equipoId, usuarioId]);
    await cliente.query('COMMIT');
    return resultado.rows[0];
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function devolverEquipo(id) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    // Solo la primera devolución puede modificar la fila del préstamo activo.
    const resultado = await cliente.query(`
      UPDATE practica_prestamos.prestamos SET fecha_devolucion = CURRENT_TIMESTAMP
      WHERE id = $1 AND fecha_devolucion IS NULL
      RETURNING id, equipo_id, usuario_id, fecha_prestamo, fecha_devolucion`, [id]);
    if (resultado.rowCount === 0) {
      const existe = await cliente.query('SELECT id FROM practica_prestamos.prestamos WHERE id = $1', [id]);
      if (existe.rowCount === 0) throw new ErrorDominio('NO_ENCONTRADO', 'El préstamo no existe.');
      throw new ErrorDominio('CONFLICTO', 'El préstamo ya fue devuelto.');
    }

    await cliente.query('UPDATE practica_prestamos.equipos SET disponible = true WHERE id = $1',
      [resultado.rows[0].equipo_id]);
    await cliente.query('COMMIT');
    return resultado.rows[0];
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
