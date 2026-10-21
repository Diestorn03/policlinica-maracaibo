-- Diagnóstico registrado por el médico al finalizar una consulta.
-- El valor por defecto conserva intactos los historiales anteriores y las consultas cerradas automáticamente por tiempo.
ALTER TABLE consultas ADD COLUMN diagnostico TEXT NOT NULL DEFAULT '';
