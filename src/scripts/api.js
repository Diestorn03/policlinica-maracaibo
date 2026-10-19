// API de telemedicina para los paneles (cliente y médico).
//  · Servidor: GET /api/espera y /api/cola; las acciones son formularios POST normales (funcionan sin JS).
//  · Demo (GitHub Pages, <html data-demo>): no hay servidor. La sala de espera y la cola se simulan en localStorage,
//    compartidas entre pestañas: abre /panel/ en una y /medico/ en otra y se ven en vivo. Los demás formularios
//    privados (admin, salir) muestran un aviso en vez de enviarse.
// Uso:  import { espera, cola, alCambiar } from '../scripts/api.js'
//       espera() → { consulta: null | { id, estado, posicion, enlace, medico, creada, atendida } }
//       cola()   → { espera: [{ id, paciente, edad, motivo, creada }], enCurso: [{ …, enlace }] }
//       alCambiar(fn) → avisa al instante cuando otra pestaña cambia la simulación (en servidor no hace nada)

export const DEMO = document.documentElement.dataset.demo === '1';
const BASE = (document.documentElement.dataset.base || '/').replace(/\/$/, '');

async function json(ruta) {
  const r = await fetch(BASE + ruta, { headers: { accept: 'application/json' }, credentials: 'same-origin' });
  if (r.status === 401) { location.href = `${BASE}/acceso/?volver=${encodeURIComponent(location.pathname)}`; return null; }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const espera = () => (DEMO ? demo.espera() : json('/api/espera'));
export const cola = () => (DEMO ? demo.cola() : json('/api/cola'));
export const alCambiar = (fn) => { if (DEMO) addEventListener('storage', (e) => e.key === CLAVE && fn()); };

// ---------------------------------------------------------------- simulación (solo demo)
const CLAVE = 'pm-demo-tele';
// "2026-10-19 19:20:00" (UTC, como SQLite) para que los paneles traten igual las fechas de la demo y las del servidor
const sqlite = (d = new Date()) => d.toISOString().slice(0, 19).replace('T', ' ');
const hace = (min) => sqlite(new Date(Date.now() - min * 60e3));
const YO = { id: 3, nombre: 'María González', edad: 68 }; // cliente de ejemplo (DEMO_USUARIOS)
const MEDICO = 'Dr. Andy Atencio';

function leer() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (s?.consultas) return s;
  } catch {}
  return { seq: 100, consultas: [
    { id: 98, clienteId: 5, paciente: 'Ana Rincón', edad: 38, motivo: 'Fiebre desde ayer', estado: 'espera', creada: hace(6) },
    { id: 99, clienteId: 4, paciente: 'José Pérez', edad: 77, motivo: 'Dolor de rodilla', estado: 'espera', creada: hace(2) },
  ] };
}
function guardar(s) { try { localStorage.setItem(CLAVE, JSON.stringify(s)); } catch {} }
const jitsi = () => 'https://meet.jit.si/PoliclinicaMaracaibo-demo-' + Math.random().toString(36).slice(2, 10);

const demo = {
  async espera() {
    const s = leer();
    const c = s.consultas.find((x) => x.clienteId === YO.id && (x.estado === 'espera' || x.estado === 'atendiendo'));
    if (!c) return { consulta: null };
    const posicion = s.consultas.filter((x) => x.estado === 'espera' && x.id <= c.id).length;
    return { consulta: { id: c.id, estado: c.estado, posicion, enlace: c.enlace ?? null, medico: c.medico ?? null, creada: c.creada, atendida: c.atendida ?? null } };
  },
  async cola() {
    const s = leer();
    const fila = ({ id, paciente, edad, motivo, creada, enlace }) => ({ id, paciente, edad, motivo, creada, enlace });
    return {
      espera: s.consultas.filter((x) => x.estado === 'espera').map(fila),
      enCurso: s.consultas.filter((x) => x.estado === 'atendiendo').map(fila),
    };
  },
  accion(ruta, f) {
    const s = leer();
    const id = Number(f.get('consulta'));
    const c = s.consultas.find((x) => x.id === id);
    if (ruta.endsWith('/api/espera')) {
      const activa = s.consultas.find((x) => x.clienteId === YO.id && (x.estado === 'espera' || x.estado === 'atendiendo'));
      if (f.get('accion') === 'cancelar') { if (activa?.estado === 'espera') activa.estado = 'cancelada'; }
      else if (!activa) s.consultas.push({ id: ++s.seq, clienteId: YO.id, paciente: YO.nombre, edad: YO.edad, motivo: String(f.get('motivo') || ''), estado: 'espera', creada: sqlite() });
      guardar(s);
      return `${BASE}/panel/`;
    }
    if (f.get('accion') === 'finalizar') { if (c) Object.assign(c, { estado: 'finalizada', finalizada: sqlite() }); guardar(s); return `${BASE}/medico/`; }
    if (!c || c.estado !== 'espera') return `${BASE}/medico/?error=${encodeURIComponent('Ese paciente ya fue tomado por otro médico o salió de la sala.')}`;
    const pegado = String(f.get('enlace') || '').trim();
    if (pegado && !/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(pegado)) return `${BASE}/medico/?error=${encodeURIComponent('El enlace debe ser de Google Meet (https://meet.google.com/abc-defg-hij) o de Jitsi.')}`;
    Object.assign(c, { estado: 'atendiendo', enlace: pegado || jitsi(), medico: MEDICO, atendida: sqlite() });
    guardar(s);
    return `${BASE}/medico/?atendiendo=${id}`;
  },
};

function aviso(texto) {
  const d = document.createElement('dialog');
  d.className = 'demo-aviso';
  d.innerHTML = '<p></p><form method="dialog"><button class="btn">Entendido</button></form>';
  d.querySelector('p').textContent = texto;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

if (DEMO) {
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== 'post') return;
    e.preventDefault();
    const ruta = new URL(form.action, location.href).pathname;
    if (ruta.endsWith('/api/espera') || ruta.endsWith('/api/cola')) { location.href = demo.accion(ruta, new FormData(form, e.submitter)); return; }
    if (new FormData(form, e.submitter).get('accion') === 'salir') { location.href = `${BASE}/acceso/`; return; }
    aviso('Esto es una demostración en GitHub Pages: los datos son de ejemplo y no se guardan. En la versión con servidor esta acción se guarda de verdad.');
  }, true);
}
