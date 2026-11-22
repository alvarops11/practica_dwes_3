// La configuración se valida antes de abrir el servidor o conectarse a la base.
function leerPuerto(nombre, valorPredeterminado) {
  const valor = Number(process.env[nombre] ?? valorPredeterminado);
  if (!Number.isInteger(valor) || valor < 1 || valor > 65535) {
    throw new Error(`La variable ${nombre} debe ser un puerto entre 1 y 65535.`);
  }
  return valor;
}

for (const nombre of ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
  if (!process.env[nombre]?.trim()) {
    throw new Error(`Falta completar ${nombre} en el archivo de entorno.`);
  }
}

export const config = Object.freeze({
  puerto: leerPuerto('PORT', '3000'),
  base: {
    host: process.env.PGHOST,
    port: leerPuerto('PGPORT', '15432'),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD
  }
});
