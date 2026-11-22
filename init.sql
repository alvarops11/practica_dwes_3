-- Ejecutar conectado como dwes_app en una base vacía.
-- No se borran datos existentes: una segunda ejecución falla sin cambios parciales.
BEGIN;

CREATE SCHEMA practica_prestamos;

CREATE TABLE practica_prestamos.equipos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    disponible BOOLEAN NOT NULL DEFAULT true,
    CHECK (char_length(btrim(codigo)) BETWEEN 1 AND 20),
    CHECK (char_length(btrim(nombre)) > 0),
    CHECK (char_length(btrim(categoria)) > 0)
);

CREATE TABLE practica_prestamos.usuarios (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (char_length(btrim(nombre)) > 0)
);

CREATE TABLE practica_prestamos.prestamos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    equipo_id INTEGER NOT NULL REFERENCES practica_prestamos.equipos(id),
    usuario_id INTEGER NOT NULL REFERENCES practica_prestamos.usuarios(id),
    fecha_prestamo TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion TIMESTAMPTZ,
    CHECK (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)
);

-- Obligatorio en el enunciado: solo afecta a los préstamos que siguen activos.
-- Los préstamos finalizados del mismo equipo pueden repetirse en el historial.
CREATE UNIQUE INDEX un_prestamo_activo_por_equipo
    ON practica_prestamos.prestamos (equipo_id)
    WHERE fecha_devolucion IS NULL;

INSERT INTO practica_prestamos.equipos (codigo, nombre, categoria) VALUES
    ('PORT-01', 'Portátil Lenovo', 'Portátil'),
    ('PORT-02', 'Portátil HP', 'Portátil'),
    ('PORT-03', 'Portátil Dell', 'Portátil'),
    ('PORT-04', 'Portátil Acer', 'Portátil'),
    ('PORT-05', 'Portátil Asus', 'Portátil'),
    ('PORT-06', 'Portátil Toshiba', 'Portátil'),
    ('TAB-01', 'Tableta Samsung', 'Tableta'),
    ('TAB-02', 'Tableta Lenovo', 'Tableta'),
    ('PROY-01', 'Proyector Epson', 'Proyector'),
    ('PROY-02', 'Proyector BenQ', 'Proyector'),
    ('CAM-01', 'Cámara Logitech', 'Cámara'),
    ('MIC-01', 'Micrófono USB', 'Audio');

INSERT INTO practica_prestamos.usuarios (nombre) VALUES
    ('Ana García'), ('Luis Pérez'), ('Marta López');

COMMIT;
