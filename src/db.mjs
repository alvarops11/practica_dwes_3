import pg from 'pg';
import { config } from './config.mjs';

// Reutilizamos conexiones en lugar de crear una por petición.
export const pool = new pg.Pool({
  ...config.base,
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000
});

pool.on('error', () => {
  console.error('Se ha perdido una conexión inactiva con PostgreSQL.');
});
