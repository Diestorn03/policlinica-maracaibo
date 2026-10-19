# Estado · 19-oct-2026

## Publicado
- Demo para revisión: https://diestorn03.github.io/policlinica-maracaibo/ (GitHub Pages, `npm run build:demo`, se publica sola con cada push a `main`).
- Repo: https://github.com/Diestorn03/policlinica-maracaibo

## Hecho
- Portada (aprobada por Diego): Manrope, azules y blancos, héroe técnico, cruz de médicos, el edificio en corte por pisos.
- Páginas: servicios (índice + 9), especialidades, directorio (filtros por nombre, especialidad y piso), nosotros, afiliación, 404.
- Admin: resumen, médicos (con foto), clientes, usuarios con roles, especialidades, consultas.
- Telemedicina: acceso único, panel del paciente con sala de espera, panel del médico con la cola en vivo.
- Dos modos con el mismo código: servidor (Cloudflare Workers + D1, todo real) y demo estática (datos de ejemplo; la sala de espera se
  simula entre pestañas: abrir /panel/ y /medico/ a la vez).
- `npm test` (base de datos, sesión, telemedicina, helpers) y los dos builds pasan.

## Preguntas para el profesor
1. Precio y periodicidad de la afiliación; qué incluye exactamente; cómo se paga.
2. Videollamada: ¿Jitsi automático o cada médico pega su enlace de Google Meet?
3. Sala de espera: ¿cola general o por especialidad/médico?
4. Datos del cliente: ¿falta alguno (sexo, contacto de emergencia…)?
5. ¿Hace falta otro rol (recepción)?
6. Especialidades: el directorio tiene 50 (42 con médicos). ¿Hay una lista oficial?
7. ¿En qué piso están emergencias, laboratorio, tomografía, rayos X, UCI y pabellón? (el edificio podría mostrarlos)
8. En el 2do piso aparecen consultorios 16, 17 y 20, que chocan con el 1er piso: ¿errores del sitio viejo?
9. ¿Cuándo pasamos a Cloudflare (y apuntamos el dominio)?
