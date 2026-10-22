-- Esquema de la versión PHP + MariaDB (estado final de las migraciones SQLite de migrations/). Todas las fechas en UTC (la conexión fija time_zone = '+00:00').
-- "clave" = nombre sin "Dr./Dra.", sin acentos y en minúsculas: sirve para ordenar y buscar.
CREATE TABLE especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  clave VARCHAR(120) NOT NULL,
  UNIQUE KEY especialidades_slug (slug),
  UNIQUE KEY especialidades_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  clave VARCHAR(120) NOT NULL,
  telefono VARCHAR(40) NOT NULL DEFAULT '',
  consultorio VARCHAR(160) NOT NULL DEFAULT '',
  piso VARCHAR(2) NOT NULL DEFAULT '',
  consultorios VARCHAR(80) NOT NULL DEFAULT '',
  foto VARCHAR(200) NOT NULL DEFAULT '',   -- URL: /medicos/<slug>.jpg (importada) o /fotos/<id>?v=<n> (subida desde el admin)
  KEY medicos_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medico_especialidad (
  medico_id INT NOT NULL,
  especialidad_id INT NOT NULL,
  PRIMARY KEY (medico_id, especialidad_id),
  KEY me_especialidad (especialidad_id),
  CONSTRAINT me_medico FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
  CONSTRAINT me_especialidad_fk FOREIGN KEY (especialidad_id) REFERENCES especialidades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fotos subidas desde el admin (WebP reducida en el navegador, < 1 MB)
CREATE TABLE fotos (
  medico_id INT NOT NULL PRIMARY KEY,
  tipo VARCHAR(40) NOT NULL,
  datos LONGBLOB NOT NULL,
  CONSTRAINT fotos_medico FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rol ENUM('admin', 'medico', 'cliente', 'secretaria') NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  cedula VARCHAR(20) NULL,                       -- V-12345678; también sirve para iniciar sesión
  clave_hash VARCHAR(255) NOT NULL,              -- password_hash() de PHP
  version INT NOT NULL DEFAULT 1,                -- sube al cambiar la clave o desactivar: cierra sus sesiones
  activo TINYINT NOT NULL DEFAULT 1,
  medico_id INT NULL,                            -- ficha del directorio (rol médico)
  telefono VARCHAR(40) NOT NULL DEFAULT '',
  nacimiento DATE NULL,
  direccion VARCHAR(200) NOT NULL DEFAULT '',
  afiliacion_vence DATE NULL,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY usuarios_correo (correo),
  UNIQUE KEY usuarios_cedula (cedula),
  CONSTRAINT usuarios_medico FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  medico_id INT NULL,
  estado ENUM('espera', 'atendiendo', 'finalizada', 'cancelada') NOT NULL DEFAULT 'espera',
  motivo VARCHAR(200) NOT NULL DEFAULT '',
  enlace VARCHAR(300) NULL,
  sala VARCHAR(40) NOT NULL DEFAULT '',          -- identificador opaco de la videollamada (pm-…)
  diagnostico TEXT NOT NULL DEFAULT '',
  creada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visto DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- último latido del cliente en la sala de espera
  atendida DATETIME NULL,
  finalizada DATETIME NULL,
  -- Un cliente tiene como máximo una consulta activa y un médico como máximo una en curso (MariaDB no tiene índices parciales)
  activa_cliente INT GENERATED ALWAYS AS (IF(estado IN ('espera', 'atendiendo'), cliente_id, NULL)) STORED,
  activo_medico INT GENERATED ALWAYS AS (IF(estado = 'atendiendo', medico_id, NULL)) STORED,
  UNIQUE KEY consultas_una_activa (activa_cliente),
  UNIQUE KEY consultas_un_medico_atendiendo (activo_medico),
  KEY consultas_estado (estado, creada),
  KEY consultas_cliente (cliente_id, creada),
  KEY consultas_medico (medico_id, creada),
  KEY consultas_sala (sala),
  CONSTRAINT consultas_cliente_fk FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT consultas_medico_fk FOREIGN KEY (medico_id) REFERENCES usuarios(id)  -- sin ON DELETE SET NULL: MariaDB no lo permite con la columna generada; borrarUsuario() pone medico_id en NULL antes
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Señalización de la videollamada (WebRTC): mensajes de conexión entre el médico y el paciente de una sala, y quién está conectado.
CREATE TABLE senales (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sala VARCHAR(40) NOT NULL,
  para ENUM('medico', 'cliente') NOT NULL,
  tipo VARCHAR(12) NOT NULL,
  datos MEDIUMTEXT NULL,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY senales_lectura (sala, para, id),
  KEY senales_creado (creado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE senales_lado (
  sala VARCHAR(40) NOT NULL,
  rol ENUM('medico', 'cliente') NOT NULL,
  sesion VARCHAR(40) NOT NULL,
  visto DATETIME NOT NULL,
  PRIMARY KEY (sala, rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Límite de intentos de inicio de sesión por IP
CREATE TABLE intentos (
  ip VARCHAR(45) NOT NULL,
  creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY intentos_ip (ip, creado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
