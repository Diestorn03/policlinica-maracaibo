-- Añade el rol de secretaria sin perder usuarios ni consultas existentes.
-- SQLite no permite modificar un CHECK: se reconstruyen usuarios y consultas para conservar sus claves foráneas.
CREATE TABLE usuarios_nueva (
  id INTEGER PRIMARY KEY,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'medico', 'cliente', 'secretaria')),
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
  cedula TEXT UNIQUE,
  clave_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  activo INTEGER NOT NULL DEFAULT 1,
  medico_id INTEGER REFERENCES medicos(id) ON DELETE SET NULL,
  telefono TEXT NOT NULL DEFAULT '',
  nacimiento TEXT,
  direccion TEXT NOT NULL DEFAULT '',
  afiliacion_vence TEXT,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO usuarios_nueva (id, rol, nombre, correo, cedula, clave_hash, version, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence, creado)
SELECT id, rol, nombre, correo, cedula, clave_hash, version, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence, creado
FROM usuarios;

-- El respaldo no tiene claves foráneas: permite borrar la tabla padre incluso si el ejecutor envuelve la migración en una transacción.
CREATE TABLE consultas_respaldo AS
SELECT id, cliente_id, medico_id, estado, motivo, enlace, creada, visto, atendida, finalizada
FROM consultas;
DROP TABLE consultas;
DROP TABLE usuarios;
ALTER TABLE usuarios_nueva RENAME TO usuarios;

CREATE TABLE consultas (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  medico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'espera' CHECK (estado IN ('espera', 'atendiendo', 'finalizada', 'cancelada')),
  motivo TEXT NOT NULL DEFAULT '',
  enlace TEXT,
  creada TEXT NOT NULL DEFAULT (datetime('now')),
  visto TEXT NOT NULL DEFAULT (datetime('now')),
  atendida TEXT,
  finalizada TEXT
);
INSERT INTO consultas (id, cliente_id, medico_id, estado, motivo, enlace, creada, visto, atendida, finalizada)
SELECT id, cliente_id, medico_id, estado, motivo, enlace, creada, visto, atendida, finalizada
FROM consultas_respaldo;
DROP TABLE consultas_respaldo;
CREATE INDEX consultas_estado ON consultas(estado, creada);
CREATE INDEX consultas_cliente ON consultas(cliente_id, creada);
CREATE INDEX consultas_medico ON consultas(medico_id, creada);
CREATE UNIQUE INDEX consultas_una_activa ON consultas(cliente_id) WHERE estado IN ('espera', 'atendiendo');
