-- Identificador opaco de la sala Jitsi. No se almacena ni se muestra una URL de videollamada.
ALTER TABLE consultas ADD COLUMN sala TEXT NOT NULL DEFAULT '';

-- Conserva las llamadas Jitsi que estuvieran en curso al desplegar; Google Meet u otros enlaces se cierran de forma explícita para no dejarlos en un estado inválido.
UPDATE consultas
SET sala = substr(enlace, 21)
WHERE estado = 'atendiendo' AND enlace GLOB 'https://meet.jit.si/*';
UPDATE consultas
SET estado = 'cancelada', finalizada = datetime('now')
WHERE estado = 'atendiendo' AND sala = '';

-- La nueva interfaz monta automáticamente una sola sala por médico: conserva la consulta más reciente y cancela las demás sin diagnóstico.
UPDATE consultas
SET estado = 'cancelada', finalizada = datetime('now')
WHERE estado = 'atendiendo' AND medico_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM consultas otra
    WHERE otra.medico_id = consultas.medico_id
      AND otra.estado = 'atendiendo'
      AND otra.id > consultas.id
  );
CREATE UNIQUE INDEX consultas_un_medico_atendiendo
ON consultas(medico_id) WHERE estado = 'atendiendo' AND medico_id IS NOT NULL;
