// npm test — corre las migraciones reales sobre node:sqlite (mismo SQLite que D1) y prueba src/lib/{db,usuarios,tele,auth}.ts
// y la base de ejemplo del modo demo (GitHub Pages).
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as db from '../src/lib/db.ts';
import * as u from '../src/lib/usuarios.ts';
import * as tele from '../src/lib/tele.ts';
import { crearSesion, hashClave, inicioDe, leerSesion, verificarClave } from '../src/lib/auth.ts';
import { d1Local } from '../src/lib/d1-local.ts';
import { getDB as demoDB } from '../src/lib/fuente-demo.ts';

const { db: D1, raw } = d1Local();

// Actualización de una base ya usada: la migración de secretaria debe conservar consultas y sus claves foráneas.
const upgrade = new DatabaseSync(':memory:');
upgrade.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE medicos (id INTEGER PRIMARY KEY);
  CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY, rol TEXT NOT NULL CHECK (rol IN ('admin', 'medico', 'cliente')), nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE COLLATE NOCASE, cedula TEXT UNIQUE, clave_hash TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    activo INTEGER NOT NULL DEFAULT 1, medico_id INTEGER REFERENCES medicos(id) ON DELETE SET NULL, telefono TEXT NOT NULL DEFAULT '',
    nacimiento TEXT, direccion TEXT NOT NULL DEFAULT '', afiliacion_vence TEXT, creado TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE consultas (
    id INTEGER PRIMARY KEY, cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    medico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, estado TEXT NOT NULL DEFAULT 'espera', motivo TEXT NOT NULL DEFAULT '', enlace TEXT,
    creada TEXT NOT NULL DEFAULT (datetime('now')), visto TEXT NOT NULL DEFAULT (datetime('now')), atendida TEXT, finalizada TEXT
  );
  INSERT INTO usuarios (id, rol, nombre, correo, clave_hash) VALUES (1, 'cliente', 'Cliente legado', 'legado@clinica.test', 'hash');
  INSERT INTO consultas (id, cliente_id, estado, motivo) VALUES (9, 1, 'espera', 'Control');
`);
upgrade.exec(readFileSync('migrations/0005_secretaria.sql', 'utf8'));
assert.deepEqual({ ...upgrade.prepare('SELECT rol, nombre FROM usuarios WHERE id = 1').get() }, { rol: 'cliente', nombre: 'Cliente legado' });
assert.deepEqual({ ...upgrade.prepare('SELECT cliente_id, motivo FROM consultas WHERE id = 9').get() }, { cliente_id: 1, motivo: 'Control' });
assert.equal(upgrade.prepare('PRAGMA foreign_key_check').all().length, 0, 'la migración conserva las claves foráneas');
upgrade.close();

// Actualización de una llamada activa: Jitsi conserva su sala y un Meet heredado queda cancelado, no colgado en estado atendiendo.
const videoUpgrade = new DatabaseSync(':memory:');
videoUpgrade.exec(`
  CREATE TABLE consultas (id INTEGER PRIMARY KEY, medico_id INTEGER, estado TEXT NOT NULL, enlace TEXT, diagnostico TEXT NOT NULL DEFAULT '', finalizada TEXT);
  INSERT INTO consultas (id, medico_id, estado, enlace) VALUES
    (1, 7, 'atendiendo', 'https://meet.jit.si/PoliclinicaMaracaibo-ab12cd34ef56'),
    (2, 8, 'atendiendo', 'https://meet.google.com/abc-defg-hij'),
    (3, 7, 'atendiendo', 'https://meet.jit.si/PoliclinicaMaracaibo-ff11ee22dd33');
`);
videoUpgrade.exec(readFileSync('migrations/0007_sala_jitsi.sql', 'utf8'));
assert.deepEqual({ ...videoUpgrade.prepare('SELECT estado, sala FROM consultas WHERE id = 1').get() }, { estado: 'cancelada', sala: 'PoliclinicaMaracaibo-ab12cd34ef56' });
assert.deepEqual({ ...videoUpgrade.prepare('SELECT estado, sala FROM consultas WHERE id = 2').get() }, { estado: 'cancelada', sala: '' });
assert.deepEqual({ ...videoUpgrade.prepare('SELECT estado, sala FROM consultas WHERE id = 3').get() }, { estado: 'atendiendo', sala: 'PoliclinicaMaracaibo-ff11ee22dd33' });
videoUpgrade.close();

// La base de la demo arma sus usuarios y consultas de ejemplo sobre las migraciones reales
const demo = await demoDB();
assert.equal((await db.medicos(demo)).length, 125);
assert.equal((await tele.cola(demo, 2)).espera.length, 2, 'cola de ejemplo para el panel del médico');
assert.equal((await tele.historial(demo, { clienteId: 3 })).length, 3, 'historial de ejemplo del cliente');
assert.ok((await u.usuario(demo, 7)).medico_id > 0, 'la médica de ejemplo está enlazada a su ficha');
assert.equal((await u.usuario(demo, 8)).rol, 'secretaria', 'la demo incluye una secretaria');

// Datos importados
const esps = await db.especialidades(D1);
const todos = await db.medicos(D1);
assert.equal(esps.length, 50);
assert.equal(todos.length, 125);
assert.ok(todos.every((m) => m.especialidades.length > 0), 'todo médico tiene especialidad');
assert.ok(todos.every((m) => /^(Dra?\. |[A-Z])/.test(m.nombre)), 'nombres normalizados');
assert.equal(todos.filter((m) => m.piso).length, 124, 'la migración identifica todos los pisos confirmados');
assert.equal(todos.find((m) => m.id === 14).piso, '', 'el único consultorio histórico sin piso queda pendiente');

// Cifras de la portada y vitrina de retratos
const res = await db.resumen(D1);
assert.deepEqual([res.medicos, res.especialidades], [125, 50]);
assert.equal(res.top.length, 8);
assert.deepEqual(res.top.map((t) => t.total), [...res.top.map((t) => t.total)].sort((a, b) => b - a), 'top ordenado de mayor a menor');
assert.deepEqual(res.top[0], { slug: 'ginecologia-y-obstetricia', nombre: 'Ginecología y obstetricia', total: 17 });
assert.ok(res.conMedicos < res.especialidades, 'hay especialidades sin médicos');
const conFoto = todos.filter((m) => m.foto);
assert.equal(conFoto.length, 122, '3 médicos sin foto');
const r1 = await db.retratosDelDia(D1, 12, new Date('2026-10-19T16:00:00Z'));
const r2 = await db.retratosDelDia(D1, 12, new Date('2026-10-20T16:00:00Z'));
assert.equal(r1.length, 12);
assert.ok(r1.every((m) => m.foto), 'solo médicos con foto');
assert.equal(r1[0].id, conFoto[(292 * 5) % 122].id, 'empieza en (día del año × 5) mod N'); // 19-oct = día 292
assert.notEqual(r1[0].id, r2[0].id, 'rota cada día');
assert.equal(r2[0].id, conFoto[(293 * 5) % 122].id);
assert.deepEqual(await db.retratosDelDia(D1, 12, new Date('2026-10-20T02:00:00Z')), r1, 'a las 22:00 de Maracaibo sigue siendo el día 19');
assert.equal((await db.retratosDelDia(D1, 500)).length, 122, 'n mayor que N: sin repetir');
assert.equal((await db.retratosDelDia(D1, 12, new Date('2026-12-31T16:00:00Z')))[0].id, conFoto[(365 * 5) % 122].id);

// Búsqueda sin acentos, por especialidad y por slug
assert.ok((await db.medicos(D1, { q: 'pena' })).some((m) => m.nombre.includes('Peña')));
assert.ok((await db.medicos(D1, { q: 'CARDIO' })).length >= 9);
const cardio = await db.medicos(D1, { esp: 'cardiologia' });
assert.ok(cardio.length >= 7 && cardio.every((m) => m.especialidades.some((e) => e.slug === 'cardiologia')));
assert.equal((await db.medicos(D1, { q: '%' })).length, 125, '% no es comodín');
assert.equal((await db.medicos(D1, { esp: 'no-existe' })).length, 0);

// El filtro del navegador (directorio y tablas del admin) da lo mismo que la base
const { coincide, ficha, termino } = await import('../src/components/directorio/buscar.ts');
for (const [q, esp] of [['pena', ''], ['CARDIO', ''], ['dra. ana', ''], ['dr', ''], ['x%_', ''], ['', 'cardiologia'], ['cardio', 'pediatria'], ['', 'no-existe'], ['  médico  ', '']]) {
  const sql = (await db.medicos(D1, { q, esp })).map((m) => m.id);
  const js = todos.filter((m) => coincide(ficha(m.nombre, ...m.especialidades.map((e) => e.nombre)), m.especialidades.map((e) => e.slug).join(' '), termino(q), esp)).map((m) => m.id);
  assert.deepEqual(js, sql, 'filtro del navegador = base: q=' + q + ' esp=' + esp);
}

// Validación del formulario
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); return f; };
assert.equal(typeof db.validarMedico(form({ nombre: 'Dr', especialidades: '1' })), 'string');
assert.equal(typeof db.validarMedico(form({ nombre: 'Ana Pérez' })), 'string');
assert.equal(typeof db.validarMedico(form({ nombre: 'Ana Pérez', especialidades: '1', telefono: '<script>' })), 'string');
assert.match(db.validarMedico(form({ nombre: 'Ana Pérez', piso: '4', consultorios: '28', especialidades: '1' })), /piso/);
assert.match(db.validarMedico(form({ nombre: 'Ana Pérez', piso: 'constructor', consultorios: '28', especialidades: '1' })), /piso/, 'un piso manipulado no se acepta');
assert.match(db.validarMedico(form({ nombre: 'Ana Pérez', piso: '2', consultorios: '28Z', especialidades: '1' })), /consultorios/);
const ok = db.validarMedico(form({ nombre: 'dra,  ana pérez', telefono: '0414-1234567', piso: '2', consultorios: '28 a, 29, 28A', especialidades: ['3', '3', '5', 'x'] }));
assert.deepEqual(ok, { nombre: 'Dra. ana pérez', telefono: '0414-1234567', consultorio: '2do piso, consultorio 28A, 29', piso: '2', consultorios: '28A, 29', especialidades: [3, 5] });
const conReferencia = db.validarMedico(form({ nombre: 'Dra. Ana Pérez', piso: '1', consultorios: '', consultorio_original: '1er Piso Frente a Pabellón', especialidades: '1' }));
assert.equal(conReferencia.consultorio, '1er Piso Frente a Pabellón', 'preserva referencias históricas sin número');

// Crear, editar, foto, borrar
const id = await db.guardarMedico(D1, ok);
const creado = await db.medico(D1, id);
assert.deepEqual([creado.piso, creado.consultorios, creado.consultorio], ['2', '28A, 29', '2do piso, consultorio 28A, 29']);
assert.deepEqual(creado.especialidades.map((e) => e.id).sort(), [3, 5]);
await db.guardarMedico(D1, { ...ok, nombre: 'Dra. Ana Pérez', especialidades: [7] }, id);
const editado = await db.medico(D1, id);
assert.equal(editado.nombre, 'Dra. Ana Pérez');
assert.deepEqual(editado.especialidades.map((e) => e.id), [7]);
assert.match(await db.guardarFoto(D1, id, new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })), /WebP/);
assert.equal(await db.guardarFoto(D1, id, new File([new Uint8Array([1, 2, 3])], 'x.webp', { type: 'image/webp' })), null);
assert.deepEqual([...(await db.foto(D1, id)).datos], [1, 2, 3]);
assert.match((await db.medico(D1, id)).foto, new RegExp(`^/fotos/${id}\\?v=`));
await db.borrarMedico(D1, id);
assert.equal(await db.medico(D1, id), null);
assert.equal(await db.foto(D1, id), null, 'la foto se borra en cascada');

// Especialidades
assert.equal(await db.crearEspecialidad(D1, 'Geriatría'), null);
assert.match(await db.crearEspecialidad(D1, 'geriatría'), /existe/);
const geri = (await db.especialidades(D1)).find((e) => e.slug === 'geriatria');
assert.equal(geri.total, 0);
assert.match(await db.editarEspecialidad(D1, 0, 'Medicina geriátrica'), /no existe/);
assert.match(await db.editarEspecialidad(D1, geri.id, '  '), /Escribe/);
assert.equal(await db.editarEspecialidad(D1, geri.id, 'Medicina geriátrica'), null);
const geriEditada = (await db.especialidades(D1)).find((e) => e.id === geri.id);
assert.deepEqual([geriEditada.slug, geriEditada.nombre], ['geriatria', 'Medicina geriátrica'], 'editar conserva el slug público');
const cardiologia = cardio[0].especialidades.find((e) => e.slug === 'cardiologia');
const totalCardiologia = (await db.especialidades(D1)).find((e) => e.id === cardiologia.id).total;
assert.equal(await db.editarEspecialidad(D1, cardiologia.id, 'Cardiología clínica'), null);
const cardioEditada = (await db.especialidades(D1)).find((e) => e.id === cardiologia.id);
assert.deepEqual([cardioEditada.slug, cardioEditada.nombre, cardioEditada.total], ['cardiologia', 'Cardiología clínica', totalCardiologia]);
assert.ok((await db.medicos(D1, { esp: 'cardiologia' })).every((m) => m.especialidades.some((e) => e.id === cardiologia.id && e.nombre === 'Cardiología clínica')), 'renombrar conserva las asignaciones');
assert.match(await db.editarEspecialidad(D1, geri.id, 'Cardiología clínica'), /existe/);
assert.match(await db.editarEspecialidad(D1, geri.id, 'Cardiología clínica!'), /existe/, 'el renombre no permite duplicar un slug por puntuación');
assert.match(await db.borrarEspecialidad(D1, cardiologia.id), /quita/);
assert.equal(await db.borrarEspecialidad(D1, geri.id), null);

// Contraseñas y sesión
const h = await hashClave('clave-segura-1');
assert.equal(await verificarClave('clave-segura-1', h), true);
assert.equal(await verificarClave('otra', h), false);
assert.equal(await verificarClave('x', undefined), false, 'usuario inexistente');
const S = 'secreto-de-sesion-largo';
const t = await crearSesion(S, { id: 7, version: 2 }, 1000);
assert.deepEqual(await leerSesion(S, t, 2000), { id: 7, version: 2 });
assert.equal(await leerSesion(S, t, 1000 + 13 * 3600e3), null, 'vence a las 12 h');
assert.equal(await leerSesion('otro-secreto-de-sesion', t, 2000), null);
assert.equal(await leerSesion(S, t.replace(/^7\./, '1.'), 2000), null, 'no se puede cambiar el id');
assert.equal(await leerSesion('corto', await crearSesion('corto', { id: 1, version: 1 }), 2000), null, 'secreto débil = nadie entra');
assert.equal(inicioDe('medico'), '/medico/');

// Usuarios
const nuevoUsuario = (o) => u.validarUsuario(form({ clave: 'clave-segura-1', ...o }), true);
assert.match(nuevoUsuario({ rol: 'root', nombre: 'Ana', correo: 'a@b.co' }), /rol/);
assert.match(nuevoUsuario({ rol: 'cliente', nombre: 'Ana Pérez', correo: 'a@b.co' }), /cédula/);
assert.match(nuevoUsuario({ rol: 'cliente', nombre: 'Ana Pérez', correo: 'a@b.co', cedula: 'V-1' }), /cédula/);
assert.match(nuevoUsuario({ rol: 'admin', nombre: 'Ana Pérez', correo: 'a@b.co', clave: 'corta' }), /8 caracteres/);
const admin = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'admin', nombre: 'Admin Clínica', correo: 'Admin@Clinica.test' }));
const datosSecretaria = nuevoUsuario({ rol: 'secretaria', nombre: 'Sara Secretaria', correo: 'secretaria@clinica.test' });
assert.equal(datosSecretaria.rol, 'secretaria');
const secretaria = await u.guardarUsuario(D1, datosSecretaria);
assert.equal(inicioDe('secretaria'), '/secretaria/');
assert.equal((await u.porLogin(D1, 'secretaria@clinica.test')).rol, 'secretaria', 'la secretaria puede iniciar sesión');
const altaPorSecretaria = u.validarCliente(form({ rol: 'admin', medico_id: '1', activo: '0', nombre: 'Carla Cliente', correo: 'carla@correo.test', cedula: 'V-24681357', afiliacion_vence: '2020-01-01', clave: 'clave-segura-1' }), true);
assert.deepEqual([altaPorSecretaria.rol, altaPorSecretaria.medico_id, altaPorSecretaria.activo], ['cliente', null, 1], 'la alta de secretaria descarta campos de privilegio');
const clienteInscrito = await u.guardarUsuario(D1, altaPorSecretaria);
assert.ok(Number.isInteger(clienteInscrito));
assert.equal((await u.usuario(D1, clienteInscrito)).rol, 'cliente');
const doc = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'medico', nombre: 'Dra. Ana Médica', correo: 'medica@clinica.test', medico_id: '1' }));
const cli = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Pedro Paciente', correo: 'pedro@correo.test', cedula: 'v 12.345.678', nacimiento: '1950-03-01', afiliacion_vence: '2099-12-31' }));
const cli2 = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Rosa Paciente', correo: 'rosa@correo.test', cedula: '87654321', afiliacion_vence: '2020-01-01' }));
assert.ok([admin, doc, cli, cli2].every(Number.isInteger));
assert.match(await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Otro', correo: 'pedro@correo.test', cedula: '999999' })), /correo/);
assert.match(await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Otro', correo: 'x@correo.test', cedula: 'V12345678' })), /cédula/);
assert.equal((await u.porLogin(D1, 'v-12345678')).id, cli, 'entra con cédula en cualquier formato');
assert.equal((await u.porLogin(D1, 'admin@clinica.test')).id, admin, 'correo sin distinguir mayúsculas');
assert.equal((await u.usuario(D1, cli)).cedula, 'V-12345678');
assert.equal((await u.usuario(D1, doc)).medico_id, 1);
assert.match(await u.borrarUsuario(D1, admin, admin), /propio/);
assert.match(await u.guardarUsuario(D1, u.validarUsuario(form({ rol: 'cliente', nombre: 'Admin Clínica', correo: 'admin@clinica.test', cedula: '5555555' }), false), admin), /administrador/);
const v1 = (await u.sesionUsuario(D1, cli)).version;
await u.guardarUsuario(D1, u.validarUsuario(form({ rol: 'cliente', nombre: 'Pedro Paciente', correo: 'pedro@correo.test', cedula: 'V-12345678', activo: '1', nacimiento: '1950-03-01', afiliacion_vence: '2099-12-31', clave: 'nueva-clave-99' }), false), cli);
assert.equal((await u.sesionUsuario(D1, cli)).version, v1 + 1, 'cambiar la clave cierra sus sesiones');
assert.equal(await verificarClave('nueva-clave-99', (await u.porLogin(D1, 'pedro@correo.test')).clave_hash), true);
assert.equal(u.edad('1950-03-01', new Date(2026, 1, 28)), 75);
assert.equal(u.edad('1950-03-01', new Date(2026, 2, 1)), 76);

// Resumen del admin: derivado de la base, con ventanas «ahora» como las de tele.ts
const ra = await u.resumenAdmin(D1);
assert.deepEqual([ra.medicos, ra.especialidades], [(await db.medicos(D1)).length, (await db.especialidades(D1)).length]);
assert.ok(ra.sinMedicos >= 8, 'hay especialidades sin médicos');
assert.equal(ra.vigentes, 1, 'solo Pedro tiene la afiliación vigente (Rosa venció en 2020)');
assert.equal(ra.porVencer.length, 0);
const hoyC = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
const en = (d) => new Date(Date.parse(hoyC) + d * 864e5).toISOString().slice(0, 10);
const pronto = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Lucía Pronto', correo: 'lucia@correo.test', cedula: '11223344', afiliacion_vence: en(10) }));
const lejos = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Mario Lejos', correo: 'mario@correo.test', cedula: '44332211', afiliacion_vence: en(31) }));
const hoyMismo = await u.guardarUsuario(D1, nuevoUsuario({ rol: 'cliente', nombre: 'Hugo Hoy', correo: 'hugo@correo.test', cedula: '55667788', afiliacion_vence: hoyC }));
const ra2 = await u.resumenAdmin(D1);
assert.deepEqual(ra2.porVencer.map((c) => c.id), [hoyMismo, pronto], 'vence hoy o en ≤ 30 días, por fecha');
assert.equal(ra2.vigentes, ra.vigentes + 3, 'vigente = vence hoy o después');
assert.deepEqual((await u.resumenAdmin(D1, new Date(Date.now() + 21 * 864e5))).porVencer.map((c) => c.id), [lejos], 'la ventana se mueve con la fecha');
assert.equal(ra.enEspera + ra.atendiendo + ra.consultasHoy, 0);
await u.borrarUsuario(D1, lejos, admin); await u.borrarUsuario(D1, hoyMismo, admin); await u.borrarUsuario(D1, pronto, admin);

// Telemedicina: sala de espera → atender → finalizar
assert.match(await tele.entrar(D1, cli2, ''), /venció/);
assert.match(await tele.entrar(D1, doc, ''), /habilitado/);
assert.equal(await tele.entrar(D1, cli, 'Dolor de cabeza'), null);
assert.equal(await tele.entrar(D1, cli, 'otra vez'), null, 'reentrar no duplica');
const enEspera = await tele.estado(D1, cli);
assert.equal(enEspera.estado, 'espera');
assert.equal(enEspera.posicion, 1);
const { espera } = await tele.cola(D1, doc);
assert.equal(espera.length, 1);
assert.deepEqual([espera[0].paciente, espera[0].edad, espera[0].motivo], ['Pedro Paciente', u.edad('1950-03-01'), 'Dolor de cabeza']);
const sala = tele.salaVideo();
assert.match(sala, /^pm-[a-z0-9]{24}$/, 'la sala automática no contiene datos personales ni una URL');
assert.equal(await tele.atender(D1, enEspera.id, doc, sala), true);
assert.equal(await tele.atender(D1, enEspera.id, admin, sala), false, 'dos médicos no toman al mismo paciente');
const atendido = await tele.estado(D1, cli);
assert.deepEqual([atendido.estado, atendido.sala, atendido.medico], ['atendiendo', sala, 'Dra. Ana Médica']);
assert.equal(atendido.enlace, undefined, 'la API no expone enlaces de videollamada');
assert.equal((await tele.cola(D1, doc)).enCurso[0].sala, sala);
raw.exec(`INSERT INTO consultas (cliente_id, motivo) VALUES (${cli2}, 'Consulta simultánea de prueba')`);
const simultanea = (await tele.cola(D1, doc)).espera.find((c) => c.paciente === 'Rosa Paciente');
assert.equal(await tele.atender(D1, simultanea.id, doc, tele.salaVideo()), false, 'un médico no puede abrir dos videollamadas a la vez');
raw.exec(`UPDATE consultas SET estado = 'cancelada', finalizada = datetime('now') WHERE cliente_id = ${cli2} AND estado = 'espera'`);
assert.match(await tele.finalizar(D1, enEspera.id, doc, '  '), /diagnóstico/, 'no se finaliza sin diagnóstico');
assert.equal((await tele.estado(D1, cli)).estado, 'atendiendo', 'un diagnóstico vacío no cierra la consulta');
assert.match(await tele.finalizar(D1, enEspera.id, admin, 'Diagnóstico ajeno'), /No está atendiendo esta consulta/, 'solo el médico asignado puede finalizar');
assert.equal(await tele.finalizar(D1, enEspera.id, doc, 'Migraña sin aura.'), null);
assert.equal(await tele.estado(D1, cli), null);
const [pasada] = await tele.historial(D1, { clienteId: cli });
assert.deepEqual([pasada.estado, pasada.medico, pasada.paciente, pasada.diagnostico], ['finalizada', 'Dra. Ana Médica', 'Pedro Paciente', 'Migraña sin aura.']);
assert.equal((await tele.historial(D1, { medicoId: doc }))[0].diagnostico, 'Migraña sin aura.');
assert.equal((await tele.historial(D1)).find((c) => c.id === enEspera.id).diagnostico, 'Migraña sin aura.', 'el administrador ve el diagnóstico');
// Una llamada abandonada no puede terminar como consulta finalizada sin diagnóstico.
assert.equal(await tele.entrar(D1, cli, 'Seguimiento'), null);
const abandonada = await tele.estado(D1, cli);
assert.equal(await tele.atender(D1, abandonada.id, doc, tele.salaVideo()), true);
raw.exec(`UPDATE consultas SET atendida = datetime('now', '-5 hours') WHERE id = ${abandonada.id}`);
assert.equal(await tele.estado(D1, cli), null, 'el sondeo del cliente cierra una llamada abandonada');
const [cierreAutomatico] = await tele.historial(D1, { clienteId: cli });
assert.deepEqual([cierreAutomatico.estado, cierreAutomatico.diagnostico], ['cancelada', ''], 'el cierre automático no inventa un diagnóstico');
// quien cierra la página sale de la cola a los 5 minutos
await tele.entrar(D1, cli, '');
raw.exec("UPDATE consultas SET visto = datetime('now', '-6 minutes') WHERE estado = 'espera'");
assert.equal((await tele.cola(D1, doc)).espera.length, 0);
assert.equal((await tele.historial(D1, { clienteId: cli }))[0].estado, 'cancelada');
assert.equal(tele.aFecha('2026-10-19 19:20:00').toISOString(), '2026-10-19T19:20:00.000Z');

// modo Node: la base vive en un archivo y reabrirla no repite las migraciones ni borra datos
const dirTmp = mkdtempSync(join(tmpdir(), 'pm-'));
const archivo = join(dirTmp, 'policlinica.db');
const a = d1Local('migrations', archivo);
a.raw.exec("INSERT INTO especialidades (nombre, slug, clave) VALUES ('Prueba de archivo', 'prueba-archivo', 'prueba archivo')");
a.raw.close();
const b = d1Local('migrations', archivo);
assert.equal((await b.db.prepare("SELECT count(*) n FROM especialidades WHERE slug = 'prueba-archivo'").first()).n, 1, 'reabrir el archivo conserva los datos');
b.raw.close();
rmSync(dirTmp, { recursive: true, force: true });

console.log('ok · directorio, usuarios, sesión y telemedicina');
