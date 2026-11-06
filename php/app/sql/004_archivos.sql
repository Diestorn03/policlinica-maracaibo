-- Documentos que el paciente envía durante su consulta (informes o estudios en PDF, Word o fotos) para que el médico los descargue.
-- Se guardan en la base, como las fotos de los médicos: no quedan archivos sueltos en el servidor ni nada que Apache pueda ejecutar.
-- Si la consulta se cancela (el paciente se fue sin que lo atendieran), lib/archivos.php los borra.
CREATE TABLE archivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consulta_id INT NOT NULL,
  nombre VARCHAR(130) NOT NULL,                  -- el que se muestra y con el que se descarga (nombreArchivo())
  tipo VARCHAR(100) NOT NULL,                    -- MIME decidido por la firma del archivo, no por el navegador
  tamano INT NOT NULL,
  datos LONGBLOB NOT NULL,
  subido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY archivos_consulta (consulta_id),
  CONSTRAINT archivos_consulta_fk FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
