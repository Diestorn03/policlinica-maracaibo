// Avisos de llegada del panel del médico (pedido de la clínica): cuando entra un paciente a la sala de espera, el equipo suena 2 s,
// vibra (Android) y deja una notificación que no se va sola: el aviso fijo de la página y otra del sistema (requireInteraction).
// Con los avisos activados la pantalla no se apaga mientras el panel esté abierto (Wake Lock): una tablet en reposo no sonaría.
// Los navegadores solo dejan sonar y notificar después de un toque del usuario; por eso existe el botón «Activar avisos».
// La usa el script del panel del médico (src/pages/medico/index.astro y, en la versión PHP, su marco).
const BASE = (document.documentElement.dataset.base || '/').replace(/\/$/, '');
const ETIQUETA = 'pm-sala-espera';   // una sola notificación del sistema: cada llegada la reemplaza y vuelve a sonar (renotify)
const VIBRACION = [250, 80, 250, 80, 250, 80, 250, 80, 250, 80, 250];   // ≈ 2 s, como la alarma
const leerActivo = () => { try { return localStorage.getItem('pm-aviso') === '1'; } catch { return false; } };
const guardarActivo = (v: boolean) => { try { localStorage.setItem('pm-aviso', v ? '1' : '0'); } catch {} };

export interface Llegada { id: string; nombre: string }

export function alarmaDeLlegadas(raiz: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => raiz.querySelector<T>(s)!;
  const boton = $<HTMLButtonElement>('[data-avisos]'), estado = $('[data-avisos-estado]');
  const aviso = $('[data-llegada]'), avisoTxt = $('[data-llegada-txt]');
  const pendientes = new Map<string, string>();   // id → nombre de los que llegaron y nadie ha visto todavía
  let activo = leerActivo(), audio: AudioContext | null = null, pantalla: WakeLockSentinel | null = null, pidiendo = false;
  let registro: Promise<ServiceWorkerRegistration | null> | undefined;

  const pintar = () => {
    boton.textContent = activo ? 'Desactivar avisos' : 'Activar avisos';
    boton.classList.toggle('btn--primary', !activo);
    boton.classList.toggle('btn--outline', activo);
    const bloqueadas = 'Notification' in window && Notification.permission === 'denied';
    estado.textContent = !activo ? 'Actívalos para que este equipo suene y deje una notificación cuando llegue un paciente.'
      : audio?.state !== 'running' ? 'Avisos activados. Toca la pantalla una vez para habilitar el sonido.'
      : ['Avisos activados: suena 2 segundos y deja una notificación cuando llega un paciente.',
         pantalla ? 'La pantalla no se apagará mientras este panel esté abierto.' : '',
         bloqueadas ? 'Las notificaciones del sistema están bloqueadas en este navegador; el aviso queda en esta página.' : ''].filter(Boolean).join(' ');
  };

  // Sonido: el AudioContext nace suspendido hasta el primer toque en la página
  const abrirAudio = async () => {
    if (!activo) return;
    audio ??= new AudioContext();
    if (audio.state !== 'running') { try { await audio.resume(); } catch {} }
    pintar();
  };
  const sonar = () => {
    if (!audio || audio.state !== 'running') return;
    const t0 = audio.currentTime + .05;
    for (let i = 0; i < 6; i++) {   // seis pitidos de dos tonos, uno cada 0,33 s: ≈ 2 s
      const t = t0 + i * .33, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = i % 2 ? 784 : 988;
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.35, t + .02);
      g.gain.setValueAtTime(.35, t + .18);
      g.gain.exponentialRampToValueAtTime(.0001, t + .26);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + .27);
    }
  };

  // Pantalla encendida: el navegador suelta el candado al ocultarse la página; se vuelve a pedir al verla
  const pedirPantalla = async () => {
    if (!activo || document.hidden || pantalla || pidiendo || !('wakeLock' in navigator)) return;
    pidiendo = true;
    try {
      pantalla = await navigator.wakeLock.request('screen');
      pantalla.addEventListener('release', () => { pantalla = null; pintar(); });
    } catch { /* ahorro de batería o navegador que no lo permite: sigue sin el candado */ }
    pidiendo = false;
    pintar();
  };
  const soltarPantalla = () => { pantalla?.release().catch(() => {}); pantalla = null; };

  // Notificación del sistema: en Android solo se puede mostrar desde un service worker (public/avisos-sw.js)
  const registrar = () => (registro ??= 'serviceWorker' in navigator
    ? navigator.serviceWorker.register(`${BASE}/avisos-sw.js`, { scope: `${BASE}/medico/` }).then(() => navigator.serviceWorker.ready, () => null)
    : Promise.resolve(null));
  const notificar = async (texto: string, alertar = true) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opciones = { body: texto, tag: ETIQUETA, renotify: alertar, requireInteraction: true, lang: 'es-VE', icon: `${BASE}/favicon.png`, vibrate: VIBRACION, data: { url: location.href } } as NotificationOptions;
    const reg = await registrar();
    try { if (reg) await reg.showNotification('Paciente en espera', opciones); else new Notification('Paciente en espera', opciones); } catch {}
  };
  const notificaciones = async () => (await (await registro)?.getNotifications({ tag: ETIQUETA })) ?? [];
  const cerrarNotificaciones = async () => { for (const n of await notificaciones()) n.close(); };

  // Aviso fijo de la página: queda hasta que el médico lo toca o hasta que ya no queda nadie de los que llegaron
  const texto = () => {
    const n = [...pendientes.values()];
    const lista = n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
    return n.length === 1 ? `Llegó un paciente a la sala de espera: ${lista}.` : `Llegaron ${n.length} pacientes a la sala de espera: ${lista}.`;
  };
  const pintarAviso = () => { aviso.hidden = pendientes.size === 0; if (pendientes.size) avisoTxt.textContent = texto(); };
  const despejar = () => { pendientes.clear(); pintarAviso(); cerrarNotificaciones(); };

  $('[data-llegada-ver]').addEventListener('click', () => {
    const fila = raiz.querySelector<HTMLElement>(`tr[data-id="${CSS.escape(pendientes.keys().next().value ?? '')}"]`);
    despejar();
    if (!fila) return;
    fila.scrollIntoView({ block: 'center' });
    fila.querySelector('button')?.focus({ focusVisible: true } as FocusOptions);
    fila.animate([{ backgroundColor: '#dfe9fb' }, { backgroundColor: 'transparent' }], { duration: 2500, easing: 'ease-out' });   // que se vea cuál es
  });
  $('[data-llegada-ok]').addEventListener('click', () => {
    despejar();
    const titulo = $('#t-cola');
    titulo.tabIndex = -1;
    titulo.focus();
  });
  boton.addEventListener('click', async () => {
    activo = !activo;
    guardarActivo(activo);
    if (activo) {
      await abrirAudio();
      sonar();   // así suena: de paso confirma que el equipo tiene volumen
      if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
      registrar();
      await pedirPantalla();
    } else {
      soltarPantalla();
    }
    pintar();
  });
  addEventListener('pointerdown', abrirAudio, { capture: true });
  addEventListener('keydown', abrirAudio, { capture: true });
  document.addEventListener('visibilitychange', pedirPantalla);
  if (activo) { registrar(); pedirPantalla(); }
  pintar();

  return {
    /** Pacientes que acaban de entrar a la sala (no se llama con los que ya estaban al abrir la página). */
    llegaron(nuevas: Llegada[]) {
      for (const p of nuevas) pendientes.set(p.id, p.nombre);
      pintarAviso();
      if (!activo) return;
      sonar();
      navigator.vibrate?.(VIBRACION);
      notificar(texto());
    },
    /** Los que siguen en espera: el aviso olvida a los que ya atendieron o se fueron, y sin ninguno se cierra. */
    quedan(ids: Set<string>) {
      const antes = pendientes.size;
      for (const id of [...pendientes.keys()]) if (!ids.has(id)) pendientes.delete(id);
      if (pendientes.size === antes) return;
      pintarAviso();
      if (!pendientes.size) cerrarNotificaciones();
      else notificaciones().then((ns) => ns.length && notificar(texto(), false));   // la que sigue a la vista, con la lista al día y sin volver a sonar
    },
  };
}
