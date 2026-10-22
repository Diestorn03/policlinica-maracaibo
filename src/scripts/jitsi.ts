// Cliente de la IFrame API oficial de Jitsi. No se guarda ni se muestra una URL de sala: recibe solo un identificador opaco generado por el servidor.
type RolVideo = 'medico' | 'cliente';
type ApiJitsi = { addEventListener(nombre: string, listener: () => void): void; dispose(): void };
type ConstructorJitsi = new (dominio: string, opciones: Record<string, unknown>) => ApiJitsi;

declare global { interface Window { JitsiMeetExternalAPI?: ConstructorJitsi } }

const SALA = /^(?:pm-[a-z0-9]{24}|[A-Za-z0-9_-]{6,128})$/;
const sesiones = new WeakMap<HTMLElement, ApiJitsi>();
let cargando: Promise<ConstructorJitsi> | null = null;

const estado = (contenedor: HTMLElement, texto: string, oculto = false) => {
  const aviso = contenedor.querySelector<HTMLElement>('[data-video-estado]');
  if (aviso) { aviso.textContent = texto; aviso.hidden = oculto; }
};

function cargarApi(dominio: string): Promise<ConstructorJitsi> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  if (cargando) return cargando;
  cargando = new Promise((resolve, reject) => {
    const previo = document.querySelector<HTMLScriptElement>('script[data-pm-jitsi]');
    const listo = () => window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error('La API de Jitsi no se cargó.'));
    if (previo) { previo.addEventListener('load', listo, { once: true }); previo.addEventListener('error', () => reject(new Error('No se pudo cargar Jitsi.')), { once: true }); return; }
    const script = document.createElement('script');
    script.src = `https://${dominio}/external_api.js`;
    script.async = true;
    script.dataset.pmJitsi = '1';
    script.addEventListener('load', listo, { once: true });
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Jitsi.')), { once: true });
    document.head.append(script);
  });
  return cargando;
}

/** Monta una sala dentro del contenedor. Los nombres mostrados son genéricos para reducir datos personales enviados a Jitsi. */
export async function montarVideollamada(contenedor: HTMLElement, sala: string, rol: RolVideo, dominio = 'meet.jit.si') {
  if (document.documentElement.dataset.demo === '1') { estado(contenedor, 'Demostración: la videollamada se abrirá automáticamente en la versión con servidor.'); return; }
  if (!SALA.test(sala)) { estado(contenedor, 'Esperando la sala de videollamada.'); return; }
  if (sesiones.has(contenedor)) return;
  const marco = contenedor.querySelector<HTMLElement>('[data-video-marco]');
  if (!marco) return;
  estado(contenedor, 'Conectando la videollamada…');
  try {
    const Jitsi = await cargarApi(dominio);
    if (sesiones.has(contenedor)) return;
    const api = new Jitsi(dominio, {
      roomName: sala,
      width: '100%',
      height: '100%',
      parentNode: marco,
      userInfo: { displayName: rol === 'medico' ? 'Médico' : 'Paciente' },
      configOverwrite: {
        prejoinConfig: { enabled: false },
        toolbarButtons: ['microphone', 'camera', 'desktop', 'chat', 'tileview', 'hangup', 'settings'],
      },
    });
    sesiones.set(contenedor, api);
    api.addEventListener('videoConferenceJoined', () => estado(contenedor, '', true));
    api.addEventListener('videoConferenceLeft', () => estado(contenedor, 'Saliste de la videollamada. Puedes volver a entrar desde este panel.'));
  } catch {
    estado(contenedor, 'No se pudo cargar la videollamada. Revisa tu conexión e inténtalo de nuevo.');
  }
}

export function desmontarVideollamada(contenedor: HTMLElement) {
  const api = sesiones.get(contenedor);
  if (api) { api.dispose(); sesiones.delete(contenedor); }
}
