-- Usuarios con rol (admin, médico, cliente afiliado) y consultas de telemedicina con sala de espera.
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'medico', 'cliente')),
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
  cedula TEXT UNIQUE,                       -- V-12345678; también sirve para iniciar sesión
  clave_hash TEXT NOT NULL,                 -- pbkdf2$<iteraciones>$<sal>$<hash>
  version INTEGER NOT NULL DEFAULT 1,       -- sube al cambiar la clave o desactivar: cierra sus sesiones
  activo INTEGER NOT NULL DEFAULT 1,
  medico_id INTEGER REFERENCES medicos(id) ON DELETE SET NULL, -- ficha del directorio (rol médico)
  telefono TEXT NOT NULL DEFAULT '',
  nacimiento TEXT,                          -- AAAA-MM-DD
  direccion TEXT NOT NULL DEFAULT '',
  afiliacion_vence TEXT,                    -- AAAA-MM-DD (clientes)
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE consultas (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  medico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'espera' CHECK (estado IN ('espera', 'atendiendo', 'finalizada', 'cancelada')),
  motivo TEXT NOT NULL DEFAULT '',
  enlace TEXT,
  creada TEXT NOT NULL DEFAULT (datetime('now')),
  visto TEXT NOT NULL DEFAULT (datetime('now')), -- último latido del cliente en la sala de espera
  atendida TEXT,
  finalizada TEXT
);
CREATE INDEX consultas_estado ON consultas(estado, creada);
CREATE INDEX consultas_cliente ON consultas(cliente_id, creada);
CREATE INDEX consultas_medico ON consultas(medico_id, creada);
-- Un cliente tiene como máximo una consulta activa
CREATE UNIQUE INDEX consultas_una_activa ON consultas(cliente_id) WHERE estado IN ('espera', 'atendiendo');
