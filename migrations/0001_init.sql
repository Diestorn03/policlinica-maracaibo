-- Directorio médico. "clave" = nombre sin "Dr./Dra.", sin acentos y en minúsculas: sirve para ordenar y buscar.
CREATE TABLE especialidades (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL UNIQUE,
  clave TEXT NOT NULL
);

CREATE TABLE medicos (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  clave TEXT NOT NULL,
  telefono TEXT NOT NULL DEFAULT '',
  consultorio TEXT NOT NULL DEFAULT '',
  foto TEXT NOT NULL DEFAULT '' -- URL: /medicos/<slug>.jpg (importada) o /fotos/<id>?v=<n> (subida desde el admin)
);
CREATE INDEX medicos_clave ON medicos(clave);

CREATE TABLE medico_especialidad (
  medico_id INTEGER NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  especialidad_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
  PRIMARY KEY (medico_id, especialidad_id)
);
CREATE INDEX me_especialidad ON medico_especialidad(especialidad_id);

-- Fotos subidas desde el admin (WebP reducida en el navegador, < 1 MB)
CREATE TABLE fotos (
  medico_id INTEGER PRIMARY KEY REFERENCES medicos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  datos BLOB NOT NULL
);
