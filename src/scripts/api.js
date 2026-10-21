// API de telemedicina para los paneles (cliente y médico).
// Servidor: GET /api/espera y /api/cola; las acciones son formularios POST normales.
// Demo: login, sala de espera y cola se simulan en localStorage; no hay backend ni datos clínicos reales.
// espera() → { consulta: null | { id, estado, posicion, sala, medico, creada, atendida } }
// cola()   → { espera: [{ id, paciente, edad, motivo, creada }], enCurso: [{ …, sala }] }

export const DEMO = document.documentElement.dataset.demo === '1';
const BASE = (document.documentElement.dataset.base || '/').replace(/\/$/, '');
const CLAVE_SESION = 'pm-demo-sesion';
const CLAVE = 'pm-demo-tele';
const RUTAS = { admin: '/admin/', medico: '/medico/', cliente: '/panel/', secretaria: '/secretaria/' };
const CUENTAS = {
  'admin@demo.policlinica': { rol: 'admin', clave: 'Demo2026!' },
  'medico@demo.policlinica': { rol: 'medico', clave: 'Demo2026!' },
  'cliente@demo.policlinica': { rol: 'cliente', clave: 'Demo2026!' },
  'secretaria@demo.policlinica': { rol: 'secretaria', clave: 'Demo2026!' },
};

export const rutaDemo = (rol) => `${BASE}${RUTAS[rol] ?? '/acceso/'}`;
export function sesionDemo() {
  try {
    const rol = localStorage.getItem(CLAVE_SESION);
    return rol && Object.hasOwn(RUTAS, rol) ? rol : null;
  } catch { return null; }
}
export function entrarDemo(usuario, clave) {
  const cuenta = CUENTAS[String(usuario ?? '').trim().toLowerCase()];
  if (!cuenta || clave !== cuenta.clave) return null;
  try { localStorage.setItem(CLAVE_SESION, cuenta.rol); } catch {}
  return cuenta.rol;
}
export function salirDemo() { try { localStorage.removeItem(CLAVE_SESION); } catch {} }

function protegerDemo() {
  if (!DEMO) return;
  const esperado = document.body.dataset.demoRol;
  if (!esperado) return;
  const rol = sesionDemo();
  if (!rol) { location.replace(`${BASE}/acceso/?volver=${encodeURIComponent(location.pathname)}`); return; }
  if (rol !== esperado) location.replace(rutaDemo(rol));
}

async function json(ruta) {
  const r = await fetch(BASE + ruta, { headers: { accept: 'application/json' }, credentials: 'same-origin' });
  if (r.status === 401) { location.href = `${BASE}/acceso/?volver=${encodeURIComponent(location.pathname)}`; return null; }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const espera = () => (DEMO ? demo.espera() : json('/api/espera'));
export const cola = () => (DEMO ? demo.cola() : json('/api/cola'));
export const alCambiar = (fn) => { if (DEMO) addEventListener('storage', (e) => e.key === CLAVE && fn()); };

const sqlite = (d = new Date()) => d.toISOString().slice(0, 19).replace('T', ' ');
const hace = (min) => sqlite(new Date(Date.now() - min * 60e3));
const YO = { id: 3, nombre: 'María González', edad: 68 };
const MEDICO = 'Dr. Andy Atencio';
const sala = () => `pm-${Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`;

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

const demo = {
  async espera() {
    const s = leer();
    const c = s.consultas.find((x) => x.clienteId === YO.id && (x.estado === 'espera' || x.estado === 'atendiendo'));
    if (!c) return { consulta: null };
    const posicion = s.consultas.filter((x) => x.estado === 'espera' && x.id <= c.id).length;
    return { consulta: { id: c.id, estado: c.estado, posicion, sala: c.sala ?? '', medico: c.medico ?? null, creada: c.creada, atendida: c.atendida ?? null } };
  },
  async cola() {
    const s = leer();
    const fila = ({ id, paciente, edad, motivo, creada, sala }) => ({ id, paciente, edad, motivo, creada, sala });
    return { espera: s.consultas.filter((x) => x.estado === 'espera').map(fila), enCurso: s.consultas.filter((x) => x.estado === 'atendiendo').map(fila) };
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
    if (f.get('accion') === 'finalizar') {
      const diagnostico = String(f.get('diagnostico') ?? '').trim();
      if (diagnostico.length < 3) return `${BASE}/medico/?error=${encodeURIComponent('Escribe el diagnóstico antes de finalizar la consulta.')}`;
      if (c) Object.assign(c, { estado: 'finalizada', diagnostico, finalizada: sqlite() });
      guardar(s);
      return `${BASE}/medico/`;
    }
    if (!c || c.estado !== 'espera') return `${BASE}/medico/?error=${encodeURIComponent('Ese paciente ya fue tomado por otro médico o salió de la sala.')}`;
    if (s.consultas.some((otra) => otra.estado === 'atendiendo' && otra.medico === MEDICO)) return `${BASE}/medico/?error=${encodeURIComponent('El médico ya está atendiendo otra consulta.')}`;
    Object.assign(c, { estado: 'atendiendo', sala: sala(), medico: MEDICO, atendida: sqlite() });
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

protegerDemo();
if (DEMO) {
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== 'post') return;
    e.preventDefault();
    const ruta = new URL(form.action, location.href).pathname;
    if (ruta.endsWith('/api/espera') || ruta.endsWith('/api/cola')) { location.href = demo.accion(ruta, new FormData(form, e.submitter)); return; }
    if (new FormData(form, e.submitter).get('accion') === 'salir') { salirDemo(); location.href = `${BASE}/acceso/`; return; }
    aviso('Esto es una demostración en GitHub Pages: los datos son de ejemplo y no se guardan. En la versión con servidor esta acción se guarda de verdad.');
  }, true);
}
