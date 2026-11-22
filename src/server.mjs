import { app } from './app.mjs';
import { config } from './config.mjs';
import { pool } from './db.mjs';

try {
  // No anunciamos un arranque correcto si falta la base o su inicialización.
  await pool.query('SELECT id FROM practica_prestamos.equipos LIMIT 1');
  const servidor = app.listen(config.puerto, '127.0.0.1', () => {
    console.log(`Aplicación disponible en http://127.0.0.1:${config.puerto}/equipos`);
  });
  servidor.on('error', async () => {
    console.error('No se pudo abrir el puerto del servidor. Revisa PORT.');
    await pool.end();
    process.exitCode = 1;
  });
} catch {
  console.error('No se pudo iniciar la aplicación. Revisa PostgreSQL, .env y la ejecución de init.sql.');
  await pool.end();
  process.exitCode = 1;
}
