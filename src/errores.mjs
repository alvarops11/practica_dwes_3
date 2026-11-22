// Los módulos de datos no necesitan conocer req ni res.
export class ErrorDominio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

export function manejarError(error, req, res, next) {
  if (res.headersSent) return next(error);

  const estados = { DATOS_INVALIDOS: 400, NO_ENCONTRADO: 404, CONFLICTO: 409 };
  let estado = 500;
  let mensaje = 'No se ha podido completar la operación. Inténtalo de nuevo.';

  if (error instanceof ErrorDominio) {
    estado = estados[error.codigo] ?? 500;
    mensaje = error.message;
  } else if (error.type === 'entity.parse.failed') {
    estado = 400;
    mensaje = 'El cuerpo debe contener JSON válido.';
  } else if (error.type === 'entity.too.large') {
    estado = 400;
    mensaje = 'El cuerpo de la petición es demasiado grande.';
  } else if (error.code === '23505') {
    // SQLSTATE: infracción de UNIQUE (código o préstamo activo repetido).
    estado = 409;
    mensaje = 'El código del equipo ya existe o el equipo ya tiene un préstamo activo.';
  } else if (error.code === '23503') {
    // La FK protege tanto el historial como las referencias a usuarios y equipos.
    estado = req.method === 'DELETE' ? 409 : 400;
    mensaje = req.method === 'DELETE'
      ? 'No se puede borrar un equipo con préstamos registrados.'
      : 'El equipo o el usuario indicado no existe.';
  } else if (['23502', '23514', '22001', '22P02', '22003'].includes(error.code)) {
    estado = 400;
    mensaje = 'Los datos no cumplen las restricciones de la base de datos.';
  }

  if (estado === 500) console.error('Error interno al atender una petición.');
  // No devolvemos mensajes de PostgreSQL ni añadimos una tercera vista EJS.
  res.status(estado).json({ error: mensaje });
}
