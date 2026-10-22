// Modo demo (GitHub Pages): todo se prerenderiza al compilar contra SQLite en memoria con las migraciones reales
// (125 médicos del sitio anterior) + usuarios y consultas de EJEMPLO. Nada de esto existe en producción.
import { d1Local } from './d1-local.ts';
import type { DB } from './db.ts';

let base: DB | null = null;

export async function getDB(): Promise<DB> {
  if (base) return base;
  const { db, raw } = d1Local();
  // id 1-3 coinciden con DEMO_USUARIOS de entorno.ts
  raw.exec(`
    INSERT INTO usuarios (id, rol, nombre, correo, cedula, clave_hash, medico_id, telefono, nacimiento, direccion, afiliacion_vence) VALUES
      (1, 'admin',   'Administración Policlínica', 'admin@policlinica.test',   NULL,         'demo', NULL, '(0261) 700-5100', NULL, '', NULL),
      (2, 'medico',  'Dr. Andy Atencio',           'medico@policlinica.test',  NULL,         'demo', 3,    '0414-0647682', NULL, '', NULL),
      (3, 'cliente', 'María González',             'cliente@policlinica.test', 'V-14523987', 'demo', NULL, '0414-5550101', '1958-06-12', 'Av. 5 de Julio, Maracaibo', '2027-10-19'),
      (4, 'cliente', 'José Pérez',                 'jose@ejemplo.test',        'V-5123456',  'demo', NULL, '0424-5550102', '1949-02-03', 'Sector Bella Vista, Maracaibo', '2027-03-01'),
      (5, 'cliente', 'Ana Rincón',                 'ana@ejemplo.test',         'V-18765432', 'demo', NULL, '0412-5550103', '1987-11-21', 'Urb. La Lago, Maracaibo', '2027-06-15'),
      (6, 'cliente', 'Luis Fernández',             'luis@ejemplo.test',        'V-10987654', 'demo', NULL, '0416-5550104', '1972-08-09', 'Av. Delicias, Maracaibo', '2026-09-30'),
      (7, 'medico',  'Dra. Belinda Ocando',        'oftalmologia@policlinica.test', NULL,   'demo', NULL, '0414-6336385', NULL, '', NULL),
      (8, 'secretaria', 'Sara Secretaria',          'secretaria@policlinica.test', NULL,      'demo', NULL, '0414-5550105', NULL, '', NULL);
    UPDATE usuarios SET medico_id = (SELECT id FROM medicos WHERE nombre LIKE '%Belinda Ocando%') WHERE id = 7;
    INSERT INTO consultas (cliente_id, medico_id, estado, motivo, enlace, creada, visto, atendida, finalizada) VALUES
      (3, 2, 'finalizada', 'Control de tensión',       'https://meet.jit.si/PoliclinicaMaracaibo-demo1', datetime('now', '-21 days'), datetime('now', '-21 days'), datetime('now', '-21 days', '+6 minutes'), datetime('now', '-21 days', '+24 minutes')),
      (3, 7, 'finalizada', 'Revisión de la vista',     'https://meet.jit.si/PoliclinicaMaracaibo-demo2', datetime('now', '-9 days'),  datetime('now', '-9 days'),  datetime('now', '-9 days', '+3 minutes'),  datetime('now', '-9 days', '+17 minutes')),
      (3, NULL, 'cancelada', '',                        NULL,                                            datetime('now', '-4 days'),  datetime('now', '-4 days'),  NULL,                                       datetime('now', '-4 days', '+5 minutes')),
      (4, 2, 'finalizada', 'Resultados de laboratorio', 'https://meet.jit.si/PoliclinicaMaracaibo-demo3', datetime('now', '-2 days'),  datetime('now', '-2 days'),  datetime('now', '-2 days', '+4 minutes'),  datetime('now', '-2 days', '+15 minutes')),
      (5, NULL, 'espera',     'Fiebre desde ayer',       NULL,                                            datetime('now', '-6 minutes'), datetime('now'),            NULL, NULL),
      (4, NULL, 'espera',     'Dolor de rodilla',        NULL,                                            datetime('now', '-2 minutes'), datetime('now'),            NULL, NULL);
  `);
  return (base = db);
}

export const getEnv = async () => ({}) as { SESSION_SECRET?: string; JITSI_DOMAIN?: string; LOGIN_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } };
