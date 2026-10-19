// src/data/medicos.json (sacado del WordPress con tools/scrape.mjs) → migrations/0002_seed.sql
// Corrige nombres de especialidades (el WordPress los tenía en MAYÚSCULAS y sin acentos) y el formato de "Dr./Dra.".
import { readFileSync, writeFileSync } from 'node:fs';
import { clave, slugify, tituloMedico } from '../src/lib/db.ts';

const NOMBRES = {
  anestesiologia: 'Anestesiología', bacteriologia: 'Bacteriología', cardiologia: 'Cardiología',
  'cardiologo-clinico-e-intensivista': 'Cardiología intervencionista', 'cirugia-bariatrica': 'Cirugía bariátrica',
  'cirugia-bucal': 'Cirugía bucal', 'cirugia-cardiovascular': 'Cirugía cardiovascular', 'cirugia-de-mano': 'Cirugía de mano',
  'cirugia-de-pie-y-tobillo': 'Cirugía de pie y tobillo', 'cirugia-de-torax': 'Cirugía de tórax', 'cirugia-general': 'Cirugía general',
  'cirugia-pediatrica': 'Cirugía pediátrica', 'cirugia-plastica': 'Cirugía plástica', 'cirujano-oncologo': 'Cirugía oncológica',
  coloproctologo: 'Coloproctología', dermatologia: 'Dermatología', ecografista: 'Ecografía', endocrinologia: 'Endocrinología',
  gastroenterologia: 'Gastroenterología', 'ginecologia-y-obstetricia': 'Ginecología y obstetricia', hematologia: 'Hematología',
  'inmunologia-y-alergias': 'Inmunología y alergias', mastologo: 'Mastología', 'medicina-critica': 'Medicina crítica',
  'medicina-critica-pediatrica': 'Medicina crítica pediátrica', 'medicina-del-dolor': 'Medicina del dolor',
  'medicina-interna': 'Medicina interna', nefrologia: 'Nefrología', 'neonatologo-pediatra': 'Neonatología',
  neumonologia: 'Neumonología', neurocirugia: 'Neurocirugía', neurologia: 'Neurología', nutricionista: 'Nutrición',
  odontologia: 'Odontología', oftalmologo: 'Oftalmología', oncologia: 'Oncología', ortopedia: 'Ortopedia',
  otorrinolaringologia: 'Otorrinolaringología', pediatra: 'Pediatría', psicologia: 'Psicología',
  'psicologo-clinico': 'Psicología clínica', 'psicologo-clinico-de-nino': 'Psicología clínica infantil',
  psicopedagoga: 'Psicopedagogía', psiquiatria: 'Psiquiatría', 'radiologia-e-imagenes': 'Radiología e imágenes',
  'reemplazo-articular': 'Reemplazo articular', reumatologia: 'Reumatología', 'terapia-lenguaje-oral': 'Terapia de lenguaje',
  traumatologia: 'Traumatología', urologia: 'Urología',
};

const { especialidades, medicos } = JSON.parse(readFileSync('src/data/medicos.json', 'utf8'));
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const telefono = (t) => (/^0\d{10}$/.test(t) ? `${t.slice(0, 4)}-${t.slice(4)}` : t);
const consultorio = (c) => c.replace(/Pisó/g, 'Piso').replace(/\s+/g, ' ').trim();

const espId = new Map();
const sql = ['-- Generado por tools/seed.mjs desde el directorio del WordPress (octubre 2026). No editar a mano.'];
especialidades.forEach((e, i) => {
  const nombre = NOMBRES[e.slug];
  if (!nombre) throw new Error(`Falta nombre para la especialidad ${e.slug}`);
  espId.set(e.slug, i + 1);
  sql.push(`INSERT INTO especialidades (id, slug, nombre, clave) VALUES (${i + 1}, ${q(slugify(nombre))}, ${q(nombre)}, ${q(clave(nombre))});`);
});
medicos.forEach((m, i) => {
  const nombre = tituloMedico(m.nombre);
  sql.push(`INSERT INTO medicos (id, nombre, clave, telefono, consultorio, foto) VALUES (${i + 1}, ${q(nombre)}, ${q(clave(nombre))}, ${q(telefono(m.telefono))}, ${q(consultorio(m.consultorio))}, ${q(m.foto)});`);
  for (const e of m.especialidades) sql.push(`INSERT INTO medico_especialidad (medico_id, especialidad_id) VALUES (${i + 1}, ${espId.get(e)});`);
});
writeFileSync('migrations/0002_seed.sql', sql.join('\n') + '\n');
console.log(`migrations/0002_seed.sql: ${especialidades.length} especialidades, ${medicos.length} médicos`);
