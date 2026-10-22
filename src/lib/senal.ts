// Señalización de la videollamada (WebRTC): el servidor solo pasa los mensajes de conexión entre el médico y el paciente de una sala.
// El video y el audio van directo entre los dos navegadores; aquí no pasa nada de eso. Sin cuentas ni servicios externos.
// Sondeo largo (sin WebSocket ni SSE: atraviesa cualquier proxy). Estado en memoria: sirve para un solo proceso de Node.
export type RolVideo = 'medico' | 'cliente';
export interface Mensaje { tipo: 'presente' | 'oferta' | 'respuesta' | 'ice' | 'salir'; datos?: unknown }

interface Lado { sesion: string; cola: Mensaje[]; despertar: (() => void) | null; visto: number }
const salas = new Map<string, Partial<Record<RolVideo, Lado>>>();

const VIVO = 30_000;
const otro = (r: RolVideo): RolVideo => (r === 'medico' ? 'cliente' : 'medico');
const vivo = (l?: Lado): l is Lado => !!l && Date.now() - l.visto < VIVO;
const meter = (l: Lado, m: Mensaje) => { l.cola.push(m); l.despertar?.(); };

/** El médico o el paciente pregunta por mensajes nuevos; responde de inmediato si hay, o espera hasta `ms`.
 *  `sesion` cambia con cada carga de página: una sesión nueva reinicia la conexión de los dos lados con un aviso `presente`. */
export async function sondear(sala: string, rol: RolVideo, sesion: string, ms = 20_000): Promise<Mensaje[]> {
  const s = salas.get(sala) ?? salas.set(sala, {}).get(sala)!;
  let yo = s[rol];
  if (!yo || yo.sesion !== sesion || !vivo(yo)) {
    yo?.despertar?.();
    yo = s[rol] = { sesion, cola: [], despertar: null, visto: Date.now() };
    const par = s[otro(rol)];
    if (vivo(par)) { meter(par, { tipo: 'presente' }); meter(yo, { tipo: 'presente' }); }
  }
  yo.despertar?.(); // un sondeo anterior de la misma sesión que siga abierto termina vacío
  yo.visto = Date.now();
  if (!yo.cola.length) {
    let mio!: () => void;
    await new Promise<void>((fin) => {
      const t = setTimeout(fin, ms);
      yo.despertar = mio = () => { clearTimeout(t); fin(); };
    });
    if (yo.despertar === mio) yo.despertar = null;
  }
  yo.visto = Date.now();
  podar();
  return yo.cola.splice(0);
}

/** Entrega un mensaje al otro lado. false si el otro no está conectado. */
export function enviar(sala: string, rol: RolVideo, m: Mensaje): boolean {
  const par = salas.get(sala)?.[otro(rol)];
  if (!vivo(par)) return false;
  meter(par, m);
  return true;
}

function podar() {
  for (const [k, s] of salas) if (!vivo(s.medico) && !vivo(s.cliente) && Date.now() - Math.max(s.medico?.visto ?? 0, s.cliente?.visto ?? 0) > 5 * 60_000) salas.delete(k);
}
