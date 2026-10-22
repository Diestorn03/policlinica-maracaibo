// npm test — señalización de la videollamada (src/lib/senal.ts): emparejamiento, relevo de mensajes y reinicio por sesión nueva.
import assert from 'node:assert/strict';
import { enviar, sondear } from '../src/lib/senal.ts';

const sala = 'pm-abcdefghijklmnopqrstuvwx';

// el médico llega primero y espera; el paciente llega y los dos reciben «presente»
const medico = sondear(sala, 'medico', 'm1', 2000);
await new Promise((r) => setTimeout(r, 20));
const [delPaciente, delMedico] = await Promise.all([sondear(sala, 'cliente', 'c1', 2000), medico]);
assert.deepEqual(delPaciente, [{ tipo: 'presente' }]);
assert.deepEqual(delMedico, [{ tipo: 'presente' }]);

// un mensaje del médico despierta al paciente que está esperando
const espera = sondear(sala, 'cliente', 'c1', 2000);
await new Promise((r) => setTimeout(r, 20));
assert.equal(enviar(sala, 'medico', { tipo: 'oferta', datos: { sdp: 'x' } }), true);
assert.deepEqual(await espera, [{ tipo: 'oferta', datos: { sdp: 'x' } }]);

// sin mensajes, el sondeo vence vacío
assert.deepEqual(await sondear(sala, 'cliente', 'c1', 50), []);

// el paciente recarga la página (sesión nueva): los dos vuelven a empezar
const medico2 = sondear(sala, 'medico', 'm1', 2000);
await new Promise((r) => setTimeout(r, 20));
const [recarga, aviso] = await Promise.all([sondear(sala, 'cliente', 'c2', 2000), medico2]);
assert.deepEqual([recarga[0].tipo, aviso[0].tipo], ['presente', 'presente']);

// otra sala no se mezcla, y a un lado desconectado no se le entrega nada
assert.equal(enviar('pm-zzzzzzzzzzzzzzzzzzzzzzzz', 'medico', { tipo: 'ice' }), false);

console.log('ok · señalización de la videollamada');
