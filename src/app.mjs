import express from 'express';
import * as equipos from './equipos.repo.mjs';
import { prestarEquipo, devolverEquipo } from './prestamos.service.mjs';
import { validarId, validarEquipo, validarPrestamo, validarFiltros } from './validacion.mjs';
import { manejarError } from './errores.mjs';

export const app = express();
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.json({ limit: '10kb' }));

app.get('/equipos', async (req, res) => {
  const filtros = validarFiltros(req.query);
  const listado = await equipos.listarEquipos(filtros);
  const categorias = await equipos.listarCategorias();
  // Codificamos los filtros para que espacios, tildes o & no rompan los enlaces.
  const enlacePagina = (pagina) => '/equipos?' + new URLSearchParams({ ...filtros, pagina }).toString();
  res.render('equipos', { ...listado, filtros, categorias, enlacePagina });
});

app.get('/equipos/:id', async (req, res) => {
  const id = validarId(req.params.id);
  const equipo = await equipos.buscarEquipo(id);
  const prestamos = await equipos.historialEquipo(id);
  res.render('equipo', { equipo, prestamos });
});

app.post('/api/equipos', async (req, res) => {
  const equipo = await equipos.crearEquipo(validarEquipo(req.body));
  res.status(201).location(`/equipos/${equipo.id}`).json(equipo);
});

app.put('/api/equipos/:id', async (req, res) => {
  const id = validarId(req.params.id);
  const equipo = await equipos.actualizarEquipo(id, validarEquipo(req.body));
  res.json(equipo);
});

app.delete('/api/equipos/:id', async (req, res) => {
  await equipos.borrarEquipo(validarId(req.params.id));
  res.status(204).end();
});

app.post('/api/prestamos', async (req, res) => {
  const datos = validarPrestamo(req.body);
  const prestamo = await prestarEquipo(datos.equipoId, datos.usuarioId);
  res.status(201).json(prestamo);
});

app.post('/api/prestamos/:id/devolucion', async (req, res) => {
  const prestamo = await devolverEquipo(validarId(req.params.id));
  res.json(prestamo);
});

// Express 5 pasa los rechazos de las funciones async a este middleware de error.
app.use((req, res) => res.status(404).json({ error: 'La ruta solicitada no existe.' }));
app.use(manejarError);
