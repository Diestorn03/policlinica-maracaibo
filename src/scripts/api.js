// API de telemedicina para los paneles (cliente y médico).
// Servidor: GET /api/espera y /api/cola; las acciones son formularios POST normales. Los documentos van por fetch a /api/archivos
// (solo la versión PHP la tiene, ver php/app/api/archivos.php): así se envían sin recargar y la videollamada no se corta.
// Demo: sala de espera/cola simuladas con localStorage, incluidas salas opacas sin enlaces visibles; los documentos, en IndexedDB.
// espera() → { consulta: null | { id, estado, posicion, sala, medico, creada, atendida, archivos } }
// cola()   → { espera: [{ id, paciente, edad, motivo, creada }], enCurso: [{ …, sala, archivos }] }
// subirArchivo(file) / quitarArchivo(id) → { archivos: [{ id, nombre, tamano, subido }], error? }

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

export const urlArchivo = (id) => `${BASE}/api/archivos/${id}`;
export const subirArchivo = (archivo) => (DEMO ? demo.subirArchivo(archivo) : enviarArchivos({ archivo }));
export const quitarArchivo = (id) => (DEMO ? demo.quitarArchivo(id) : enviarArchivos({ accion: 'quitar', id: String(id) }));
/** Demo: descarga el documento guardado en este navegador (en el servidor basta el enlace de urlArchivo). */
export const abrirArchivoDemo = (id) => demo.abrirArchivo(id);

async function enviarArchivos(campos) {
  const datos = new FormData();
  for (const [k, v] of Object.entries(campos)) datos.set(k, v);
  let r;
  try { r = await fetch(`${BASE}/api/archivos`, { method: 'POST', body: datos, headers: { accept: 'application/json' }, credentials: 'same-origin' }); }
  catch { return { error: 'No hay conexión. Inténtalo de nuevo.' }; }
  if (r.status === 401) { location.href = `${BASE}/acceso/?volver=${encodeURIComponent(location.pathname)}`; return { error: '' }; }
  if (r.status === 413) return { error: 'El archivo es demasiado grande para el servidor.' };
  try { return await r.json(); } catch { return { error: 'No se pudo enviar. Inténtalo de nuevo.' }; }
}

const CLAVE = 'pm-demo-tele';
const sqlite = (d = new Date()) => d.toISOString().slice(0, 19).replace('T', ' ');
const hace = (min) => sqlite(new Date(Date.now() - min * 60e3));
const YO = { id: 3, nombre: 'María González', edad: 68 };
const MEDICO = 'Dr. Andy Atencio';
const sala = () => `pm-${Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('')}`;
const DOCS = { tope: 10 * 1048576, max: 10, tipos: /\.(pdf|docx?|jpe?g|png)$/i };   // las mismas reglas de php/app/lib/archivos.php

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
const activa = (s) => s.consultas.find((x) => x.clienteId === YO.id && (x.estado === 'espera' || x.estado === 'atendiendo'));

// el contenido de los documentos de la demo: localStorage no da para archivos, IndexedDB sí (y lo comparten las pestañas)
const almacen = (modo, fn) => new Promise((ok, mal) => {
  const r = indexedDB.open('pm-demo-archivos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('archivos');
  r.onerror = () => mal(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction('archivos', modo), q = fn(tx.objectStore('archivos'));
    tx.oncomplete = () => { r.result.close(); ok(q.result); };
    tx.onerror = () => { r.result.close(); mal(tx.error); };
  };
});

const demo = {
  async espera() {
    const s = leer();
    const c = activa(s);
    if (!c) return { consulta: null };
    const posicion = s.consultas.filter((x) => x.estado === 'espera' && x.id <= c.id).length;
    return { consulta: { id: c.id, estado: c.estado, posicion, sala: c.sala ?? '', medico: c.medico ?? null, creada: c.creada, atendida: c.atendida ?? null, archivos: c.archivos ?? [] } };
  },
  async cola() {
    const s = leer();
    const fila = ({ id, paciente, edad, motivo, creada, sala }) => ({ id, paciente, edad, motivo, creada, sala });
    return { espera: s.consultas.filter((x) => x.estado === 'espera').map(fila), enCurso: s.consultas.filter((x) => x.estado === 'atendiendo').map((x) => ({ ...fila(x), archivos: x.archivos ?? [] })) };
  },
  async subirArchivo(f) {
    const s = leer(), c = activa(s);
    if (!c) return { error: 'Entra a la sala de espera para enviar documentos.', archivos: [] };
    const error = !DOCS.tipos.test(f.name) ? 'Solo se pueden enviar PDF, Word (.doc o .docx) o fotos JPG o PNG.'
      : !f.size ? 'El archivo está vacío.'
      : f.size > DOCS.tope ? 'El archivo pesa más de 10 MB.'
      : (c.archivos?.length ?? 0) >= DOCS.max ? `Ya enviaste ${DOCS.max} documentos en esta consulta.` : '';
    if (error) return { error, archivos: c.archivos ?? [] };
    const id = (s.seqArchivo = (s.seqArchivo ?? 500) + 1);
    try { await almacen('readwrite', (st) => st.put(f, id)); } catch { return { error: 'Este navegador no deja guardar archivos en la demo.', archivos: c.archivos ?? [] }; }
    (c.archivos ??= []).push({ id, nombre: f.name, tamano: f.size, subido: sqlite() });
    guardar(s);
    return { archivos: c.archivos };
  },
  async quitarArchivo(id) {
    const s = leer(), c = activa(s);
    const i = c?.archivos?.findIndex((a) => a.id === Number(id)) ?? -1;
    if (i < 0) return { error: 'Ese documento ya no está.', archivos: c?.archivos ?? [] };
    c.archivos.splice(i, 1);
    guardar(s);
    await almacen('readwrite', (st) => st.delete(Number(id))).catch(() => {});
    return { archivos: c.archivos };
  },
  async abrirArchivo(id) {
    const doc = leer().consultas.flatMap((c) => c.archivos ?? []).find((a) => a.id === Number(id));
    const blob = doc ? await almacen('readonly', (st) => st.get(Number(id))).catch(() => null) : null;
    if (!blob) { aviso('Ese documento ya no está guardado en este navegador.'); return; }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: doc.nombre });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60e3);
  },
  accion(ruta, f) {
    const s = leer();
    const id = Number(f.get('consulta'));
    const c = s.consultas.find((x) => x.id === id);
    if (ruta.endsWith('/api/espera')) {
      const yo = activa(s);
      if (f.get('accion') === 'cancelar') {
        if (yo?.estado === 'espera') {
          yo.estado = 'cancelada';   // como en el servidor: si se va sin que lo atiendan, sus documentos se borran
          for (const a of yo.archivos ?? []) almacen('readwrite', (st) => st.delete(a.id)).catch(() => {});
          yo.archivos = [];
        }
      }
      else if (!yo) s.consultas.push({ id: ++s.seq, clienteId: YO.id, paciente: YO.nombre, edad: YO.edad, motivo: String(f.get('motivo') || ''), estado: 'espera', creada: sqlite() });
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

if (DEMO) {
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== 'post') return;
    const ruta = new URL(form.action, location.href).pathname;
    if (ruta.endsWith('/api/archivos')) return;   // los documentos los envía documentos.ts con subirArchivo()
    e.preventDefault();
    if (ruta.endsWith('/api/espera') || ruta.endsWith('/api/cola')) { location.href = demo.accion(ruta, new FormData(form, e.submitter)); return; }
    if (new FormData(form, e.submitter).get('accion') === 'salir') { location.href = `${BASE}/acceso/`; return; }
    aviso('Esto es una demostración en GitHub Pages: los datos son de ejemplo y no se guardan. En la versión con servidor esta acción se guarda de verdad.');
  }, true);
}
