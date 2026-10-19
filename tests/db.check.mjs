// npm test — corre las migraciones reales sobre node:sqlite (mismo SQLite que D1) y prueba src/lib/{db,usuarios,tele,auth}.ts
// y la base de ejemplo del modo demo (GitHub Pages).
import assert from 'node:assert/strict';
import * as db from '../src/lib/db.ts';
import * as u from '../src/lib/usuarios.ts';
import * as tele from '../src/lib/tele.ts';
import { crearSesion, hashClave, inicioDe, leerSesion, verificarClave } from '../src/lib/auth.ts';
import { d1Local } from '../src/lib/d1-local.ts';
import { getDB as demoDB } from '../src/lib/fuente-demo.ts';

const { db: D1, raw } = d1Local();

// La base de la demo arma sus usuarios y consultas de ejemplo sobre las migraciones reales
const demo = await demoDB();
assert.equal((await db.medicos(demo)).length, 125);
assert.equal((await tele.cola(demo, 2)).espera.length, 2, 'cola de ejemplo para el panel del médico');
assert.equal((await tele.historial(demo, { clienteId: 3 })).length, 3, 'historial de ejemplo del cliente');
assert.ok((await u.usuario(demo, 7)).medico_id > 0, 'la médica de ejemplo está enlazada a su ficha');

// Datos importados
const esps = await db.especialidades(D1);
const todos = await db.medicos(D1);
assert.equal(esps.length, 50);
assert.equal(todos.length, 125);
assert.ok(todos.every((m) => m.especialidades.length > 0), 'todo médico tiene especialidad');
assert.ok(todos.every((m) => /^(Dra?\. |[A-Z])/.test(m.nombre)), 'nombres normalizados');

// Búsqueda sin acentos, por especialidad y por slug
assert.ok((await db.medicos(D1, { q: 'pena' })).some((m) => m.nombre.includes('Peña')));
assert.ok((await db.medicos(D1, { q: 'CARDIO' })).length >= 9);
const cardio = await db.medicos(D1, { esp: 'cardiologia' });
assert.ok(cardio.length >= 7 && cardio.every((m) => m.especialidades.some((e) => e.slug === 'cardiologia')));
assert.equal((await db.medicos(D1, { q: '%' })).length, 125, '% no es comodín');
assert.equal((await db.medicos(D1, { esp: 'no-existe' })).length, 0);

// Validación del formulario
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); return f; };
assert.equal(typeof db.validarMedico(form({ nombre: 'Dr', especialidades: '1' })), 'string');
assert.equal(typeof db.validarMedico(form({ nombre: 'Ana Pérez' })), 'string');
assert.equal(typeof db.validarMedico(form({ nombre: 'Ana Pérez', especialidades: '1', telefono: '<script>' })), 'string');
const ok = db.validarMedico(form({ nombre: 'dra,  ana pérez', telefono: '0414-1234567', consultorio: ' PB  C 1 ', especialidades: ['3', '3', '5', 'x'] }));
assert.deepEqual(ok, { nombre: 'Dra. ana pérez', telefono: '0414-1234567', consultorio: 'PB C 1', especialidades: [3, 5] });

// Crear, editar, foto, borrar
const id = await db.guardarMedico(D1, ok);
assert.deepEqual((await db.medico(D1, id)).especialidades.map((e) => e.id).sort(), [3, 5]);
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
assert.match(await db.borrarEspecialidad(D1, cardio[0].especialidades.find((e) => e.slug === 'cardiologia').id), /quita/);
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
assert.equal(tele.enlaceVideo('https://evil.test/meet'), null, 'no cualquier URL');
assert.equal(tele.enlaceVideo('https://meet.google.com/abc-defg-hij'), 'https://meet.google.com/abc-defg-hij');
const jitsi = tele.enlaceVideo('');
assert.match(jitsi, /^https:\/\/meet\.jit\.si\/PoliclinicaMaracaibo-[a-z0-9]{12}$/);
assert.equal(await tele.atender(D1, enEspera.id, doc, jitsi), true);
assert.equal(await tele.atender(D1, enEspera.id, admin, jitsi), false, 'dos médicos no toman al mismo paciente');
const atendido = await tele.estado(D1, cli);
assert.deepEqual([atendido.estado, atendido.enlace, atendido.medico], ['atendiendo', jitsi, 'Dra. Ana Médica']);
assert.equal((await tele.cola(D1, doc)).enCurso.length, 1);
await tele.finalizar(D1, enEspera.id, admin);
assert.equal((await tele.estado(D1, cli)).estado, 'atendiendo', 'solo su médico la finaliza');
await tele.finalizar(D1, enEspera.id, doc);
assert.equal(await tele.estado(D1, cli), null);
const [pasada] = await tele.historial(D1, { clienteId: cli });
assert.deepEqual([pasada.estado, pasada.medico, pasada.paciente], ['finalizada', 'Dra. Ana Médica', 'Pedro Paciente']);
assert.equal((await tele.historial(D1, { medicoId: doc })).length, 1);
// quien cierra la página sale de la cola a los 5 minutos
await tele.entrar(D1, cli, '');
raw.exec("UPDATE consultas SET visto = datetime('now', '-6 minutes') WHERE estado = 'espera'");
assert.equal((await tele.cola(D1, doc)).espera.length, 0);
assert.equal((await tele.historial(D1, { clienteId: cli }))[0].estado, 'cancelada');
assert.equal(tele.aFecha('2026-10-19 19:20:00').toISOString(), '2026-10-19T19:20:00.000Z');

console.log('ok · directorio, usuarios, sesión y telemedicina');
