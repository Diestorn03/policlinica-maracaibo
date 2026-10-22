// Videollamada 1 a 1 con WebRTC, sin cuentas ni servicios externos: el médico y el paciente se conectan directo entre navegadores.
// El servidor solo pasa los mensajes de conexión (src/lib/senal.ts en Node con sondeo largo; php/app/lib/senal.php con sondeo corto sobre MariaDB).
// El médico siempre ofrece; el paciente siempre responde.
type RolVideo = 'medico' | 'cliente';
type Mensaje = { id?: number; tipo: 'presente' | 'oferta' | 'respuesta' | 'ice' | 'salir'; datos?: any; reintentos?: number };

const SALA = /^pm-[a-z0-9]{24}$/;
const BASE = (document.documentElement.dataset.base || '/').replace(/\/$/, '');
const STUN: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
const llamadas = new WeakMap<HTMLElement, (limpiar?: boolean) => void>();

const estado = (c: HTMLElement, texto: string, oculto = false) => {
  const aviso = c.querySelector<HTMLElement>('[data-video-estado]');
  if (aviso) { aviso.textContent = texto; aviso.hidden = oculto; }
};

function servidoresIce(c: HTMLElement): RTCIceServer[] {
  try { const v = JSON.parse(c.dataset.ice || ''); if (Array.isArray(v) && v.length) return v; } catch {}
  return STUN;
}

/** Monta la videollamada de una consulta dentro del contenedor [data-video]. */
export async function montarVideollamada(contenedor: HTMLElement, sala: string, rol: RolVideo) {
  if (document.documentElement.dataset.demo === '1') { estado(contenedor, 'Demostración: la videollamada se abrirá automáticamente en la versión con servidor.'); return; }
  if (!SALA.test(sala)) { estado(contenedor, 'Esperando la sala de videollamada.'); return; }
  if (llamadas.has(contenedor)) return;
  const marco = contenedor.querySelector<HTMLElement>('[data-video-marco]');
  if (!marco) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    estado(contenedor, 'Este navegador no permite videollamadas. Abre el sitio con https:// en Chrome, Edge, Firefox o Safari actualizados.');
    return;
  }

  const otroNombre = rol === 'medico' ? 'el paciente' : 'el médico';
  const sesion = Math.random().toString(36).slice(2, 12);
  const parar = new AbortController();
  let local: MediaStream | null = null;
  let pc: RTCPeerConnection | null = null;
  let activa = true;
  let conectada = false;

  marco.replaceChildren();
  const remoto = Object.assign(document.createElement('video'), { autoplay: true, playsInline: true, className: 't-video__remoto' });
  const propio = Object.assign(document.createElement('video'), { autoplay: true, playsInline: true, muted: true, className: 't-video__propio' });
  propio.setAttribute('aria-label', 'Tu cámara');
  remoto.setAttribute('aria-label', `Cámara de ${otroNombre}`);
  const barra = document.createElement('div');
  barra.className = 't-video__barra';
  const boton = (texto: string, accion: (b: HTMLButtonElement) => void, extra = '') => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: `btn btn--sm t-borde ${extra}`.trim(), textContent: texto });
    b.addEventListener('click', () => accion(b));
    barra.append(b);
    return b;
  };
  const alternar = (tipo: 'audio' | 'video', encendido: string, apagado: string) => (b: HTMLButtonElement) => {
    const pistas = tipo === 'audio' ? local?.getAudioTracks() : local?.getVideoTracks();
    if (!pistas?.length) return;
    const on = !pistas[0].enabled;
    pistas.forEach((p) => (p.enabled = on));
    b.textContent = on ? encendido : apagado;
    b.setAttribute('aria-pressed', String(!on));
  };
  boton('Silenciar micrófono', alternar('audio', 'Silenciar micrófono', 'Activar micrófono'));
  boton('Apagar cámara', alternar('video', 'Apagar cámara', 'Encender cámara'));
  boton('Salir de la llamada', () => {
    cerrar(false);
    estado(contenedor, 'Saliste de la llamada. Pulsa «Volver a entrar» para reconectar.');
    [...barra.children].forEach((b) => ((b as HTMLElement).hidden = b !== volver));
  }, 't-video__salir');
  const volver = boton('Volver a entrar', () => { marco.replaceChildren(); montarVideollamada(contenedor, sala, rol); });
  volver.hidden = true;
  barra.hidden = true;
  marco.append(remoto, propio, barra);

  const enviar = (m: Mensaje, aviso = false) => {
    const cuerpo = JSON.stringify({ sala, ...m });
    if (aviso && navigator.sendBeacon) { navigator.sendBeacon(`${BASE}/api/senal`, new Blob([cuerpo], { type: 'application/json' })); return; }
    fetch(`${BASE}/api/senal`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: cuerpo, credentials: 'same-origin' }).catch(() => {});
  };

  /** Corta la llamada. `limpiar` (al cambiar de sala o de página) vacía también el marco; al pulsar «Salir» se deja para el botón de volver. */
  function cerrar(limpiar = true) {
    if (!activa) return;
    activa = false;
    parar.abort();
    enviar({ tipo: 'salir' }, true);
    pc?.close();
    local?.getTracks().forEach((t) => t.stop());
    remoto.srcObject = propio.srcObject = null;
    llamadas.delete(contenedor);
    if (limpiar) marco.replaceChildren();
  }
  llamadas.set(contenedor, cerrar);

  function nuevaConexion() {
    pc?.close();
    const c = (pc = new RTCPeerConnection({ iceServers: servidoresIce(contenedor) }));
    local?.getTracks().forEach((t) => c.addTrack(t, local!));
    c.onicecandidate = (e) => e.candidate && enviar({ tipo: 'ice', datos: e.candidate.toJSON() });
    c.ontrack = (e) => { remoto.srcObject = e.streams[0] ?? new MediaStream([e.track]); remoto.play().catch(() => { remoto.controls = true; }); };
    c.onconnectionstatechange = () => {
      if (c !== pc) return;
      conectada = c.connectionState === 'connected';
      if (c.connectionState === 'connected') estado(contenedor, '', true);
      else if (c.connectionState === 'connecting') estado(contenedor, 'Conectando la videollamada…');
      else if (c.connectionState === 'disconnected') estado(contenedor, 'Se perdió la conexión. Reconectando…');
      else if (c.connectionState === 'failed') {
        estado(contenedor, 'No se pudo conectar. Reintentando…');
        if (rol === 'medico') ofrecer(); // el médico siempre empieza de nuevo
      }
    };
    return c;
  }

  async function ofrecer() {
    const c = nuevaConexion();
    await c.setLocalDescription(await c.createOffer());
    enviar({ tipo: 'oferta', datos: c.localDescription!.toJSON() });
  }

  let cadena: Promise<unknown> = Promise.resolve();
  const atender = (m: Mensaje) => (cadena = cadena.then(() => procesar(m)).catch(() => {}));
  async function procesar(m: Mensaje) {
    if (!activa) return;
    if (m.tipo === 'presente') {
      estado(contenedor, 'Conectando la videollamada…');
      if (rol === 'medico') await ofrecer();
      else { pc?.close(); pc = null; }
    } else if (m.tipo === 'oferta' && rol === 'cliente') {
      const c = nuevaConexion();
      await c.setRemoteDescription(m.datos);
      await c.setLocalDescription(await c.createAnswer());
      enviar({ tipo: 'respuesta', datos: c.localDescription!.toJSON() });
    } else if (m.tipo === 'respuesta' && rol === 'medico') {
      if (pc?.signalingState === 'have-local-offer') await pc.setRemoteDescription(m.datos);
    } else if (m.tipo === 'ice') {
      if (pc?.remoteDescription) await pc.addIceCandidate(m.datos);
      else if ((m.reintentos ?? 0) < 20) setTimeout(() => atender({ ...m, reintentos: (m.reintentos ?? 0) + 1 }), 300); // el candidato llegó antes que la descripción remota: se reintenta
    } else if (m.tipo === 'salir') {
      pc?.close(); pc = null; remoto.srcObject = null;
      estado(contenedor, `${rol === 'medico' ? 'El paciente' : 'El médico'} salió de la llamada. Esperando que vuelva…`);
    }
  }

  // 1) cámara y micrófono (si no hay cámara, solo audio)
  estado(contenedor, 'Permite el uso de la cámara y el micrófono para entrar a la videollamada.');
  try {
    local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
  } catch (e) {
    try { local = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {
      activa = false; llamadas.delete(contenedor);
      estado(contenedor, 'No se pudo usar la cámara y el micrófono. Permítelos en la barra de direcciones del navegador y recarga esta página.');
      return;
    }
  }
  if (!activa) { local.getTracks().forEach((t) => t.stop()); return; }
  propio.srcObject = local;
  barra.hidden = false;
  estado(contenedor, `Esperando a ${otroNombre}…`);
  addEventListener('pagehide', cerrar, { once: true });

  // 2) sondeo largo de mensajes del otro lado
  (async () => {
    let fallos = 0;
    let desde = 0;
    while (activa) {
      try {
        const t0 = performance.now();
        const r = await fetch(`${BASE}/api/senal?sala=${sala}&sesion=${sesion}&desde=${desde}`, { signal: parar.signal, credentials: 'same-origin', headers: { accept: 'application/json' } });
        if (r.status === 401) { location.reload(); return; }
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        fallos = 0;
        if (d.fin) { cerrar(); estado(contenedor, 'La consulta terminó.'); return; }
        const nuevos = d.mensajes as Mensaje[];
        for (const m of nuevos) if (typeof m.id === 'number') desde = Math.max(desde, m.id);
        nuevos.forEach(atender);
        // Sondeo corto (PHP): la respuesta llega enseguida, así que se espera antes de volver a preguntar (1 s mientras se conecta, 4 s ya conectados);
        // con mensajes recién llegados se vuelve a preguntar de inmediato porque suelen venir en ráfaga. Con sondeo largo (Node) la respuesta ya tardó.
        if (!nuevos.length && performance.now() - t0 < 1500) await new Promise((ok) => setTimeout(ok, conectada ? 4000 : 1000));
      } catch {
        if (!activa) return;
        estado(contenedor, 'Sin conexión con el servidor. Reintentando…');
        await new Promise((ok) => setTimeout(ok, Math.min(8000, 1000 * ++fallos)));
      }
    }
  })();
}

export function desmontarVideollamada(contenedor: HTMLElement) {
  llamadas.get(contenedor)?.(true);
}
