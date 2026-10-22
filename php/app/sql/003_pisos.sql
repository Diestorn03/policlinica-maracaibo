-- Piso de cada médico a partir del texto del consultorio original (de 0004_consultorios.sql)
UPDATE medicos
SET piso = CASE
  WHEN lower(consultorio) LIKE '%sótano%' THEN 's'
  WHEN lower(replace(consultorio, '.', '')) LIKE '%pb%' OR lower(consultorio) LIKE '%planta baja%' THEN 'pb'
  WHEN lower(replace(consultorio, '.', '')) LIKE '%1er piso%' OR lower(replace(consultorio, '.', '')) LIKE '%1erpiso%' OR lower(replace(consultorio, '.', '')) LIKE '%1 piso%' OR lower(replace(consultorio, '.', '')) LIKE '%primer piso%' THEN '1'
  WHEN lower(replace(consultorio, '.', '')) LIKE '%2do piso%' OR lower(replace(consultorio, '.', '')) LIKE '%2dopiso%' OR lower(replace(consultorio, '.', '')) LIKE '%2 piso%' OR lower(replace(consultorio, '.', '')) LIKE '%segundo piso%' THEN '2'
  WHEN lower(replace(consultorio, '.', '')) LIKE '%3er piso%' OR lower(replace(consultorio, '.', '')) LIKE '%3erpiso%' OR lower(replace(consultorio, '.', '')) LIKE '%3 piso%' OR lower(consultorio) LIKE '%3%pisó%' OR lower(replace(consultorio, '.', '')) LIKE '%tercer piso%' THEN '3'
  ELSE ''
END
WHERE piso = '';
