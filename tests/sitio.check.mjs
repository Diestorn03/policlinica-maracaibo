// node tests/sitio.check.mjs — funciones puras de src/lib/sitio.ts (teléfonos, WhatsApp, iniciales, horarios, fechas)
import assert from 'node:assert/strict';
import { duracion, esperando, estaAbierto, fechaCaracas, horaCaracas, iniciales, telHref, waHref } from '../src/lib/sitio.ts';

// Teléfonos
assert.equal(telHref('0414-1640799'), 'tel:+584141640799');
assert.equal(telHref('(0261) 700-5100'), 'tel:+582617005100');
assert.equal(telHref('04141640799'), 'tel:+584141640799');
assert.equal(telHref('+58 412-4248304'), 'tel:+584124248304');
assert.equal(telHref('+58 (0261) 700-5141'), 'tel:+582617005141', 'quita el 0 de troncal');
assert.equal(telHref(''), '');
assert.equal(telHref('   '), '');

// WhatsApp: igual que el enlace oficial de la clínica
assert.equal(waHref(), 'https://api.whatsapp.com/send/?phone=584124248304&text=Solicitud+de+cita');
assert.equal(waHref('Cita con Dra. Ana'), 'https://api.whatsapp.com/send/?phone=584124248304&text=Cita+con+Dra.+Ana');
assert.match(waHref('Información & más'), /text=Informaci%C3%B3n\+%26\+m%C3%A1s$/);

// Iniciales
assert.equal(iniciales('Dra. Rossy Vera'), 'RV');
assert.equal(iniciales('Dra Neyla Carolina Soto León'), 'NS');
assert.equal(iniciales('Dr. Roman de Vicente'), 'RV', 'ignora partículas');
assert.equal(iniciales('Dra. Mariela Fox'), 'MF');
assert.equal(iniciales('Dr. Juan José Delgado Dupont'), 'JD');
assert.equal(iniciales('Dr. Ana'), 'A');
assert.equal(iniciales('Dra.'), '');
assert.equal(iniciales('dra. ñoño pérez'), 'ÑP');

// «Abierto ahora»: hora de Maracaibo = UTC−4
const horario = (o) => ({ id: 'x', nombre: 'X', desde: 8, hasta: 16, ...o });
const citas = horario({ dias: [1, 2, 3, 4, 5] });
const lun = (h, m = 0) => new Date(Date.UTC(2026, 9, 19, h + 4, m)); // lunes 19-oct-2026, hora local h:m
assert.equal(estaAbierto(citas, lun(8)), true, 'abre a las 8:00');
assert.equal(estaAbierto(citas, lun(15, 59)), true);
assert.equal(estaAbierto(citas, lun(16)), false, '`hasta` es exclusivo');
assert.equal(estaAbierto(citas, lun(7, 59)), false);
assert.equal(estaAbierto(citas, new Date(Date.UTC(2026, 9, 24, 16))), false, 'sábado');
assert.equal(estaAbierto(citas, new Date(Date.UTC(2026, 9, 20, 2, 0))), false, '02:00 UTC del martes = lunes 22:00 en Maracaibo');
assert.equal(estaAbierto(horario({}), lun(10)), null, 'sin días no se calcula');
const emerg = horario({ desde: 0, hasta: 24, dias: [0, 1, 2, 3, 4, 5, 6], h24: true });
assert.equal(estaAbierto(emerg, lun(3)), true);
assert.equal(estaAbierto(emerg, lun(23, 59)), true);
assert.equal(horaCaracas(lun(14, 30)), 14.5);
assert.equal(horaCaracas(new Date(Date.UTC(2026, 9, 19, 2))), 22, 'cruza la medianoche UTC');

// Fechas de SQLite (UTC sin zona) en hora de Maracaibo; se normalizan los espacios finos de ICU
const sp = (s) => s.replace(/[\s  ]+/g, ' ');
assert.equal(fechaCaracas('2026-10-19 19:20:00'), '19 de octubre de 2026');
assert.equal(sp(fechaCaracas('2026-10-19 19:20:00', 'hora')), '3:20 p. m.');
assert.equal(fechaCaracas('2026-10-20 02:00:00'), '19 de octubre de 2026', 'madrugada UTC = noche anterior en Maracaibo');
assert.equal(fechaCaracas('2026-10-19 19:20:00', { month: 'short' }).toLowerCase().includes('oct'), true);

// Duración y espera
assert.equal(duracion('2026-10-19 19:00:00', '2026-10-19 19:18:20'), 18);
assert.equal(duracion('2026-10-19 19:00:00', null), null);
const t = new Date('2026-10-19T19:07:32Z');
assert.equal(esperando('2026-10-19 19:00:00', t), '07:32');
assert.equal(esperando('2026-10-19 19:07:30', t), '00:02');
assert.equal(esperando('2026-10-19 18:02:00', t), '1 h 05 min');
assert.equal(esperando('2026-10-19 19:10:00', t), '00:00', 'nunca negativo');

console.log('ok · sitio (teléfonos, WhatsApp, iniciales, horarios, fechas)');
