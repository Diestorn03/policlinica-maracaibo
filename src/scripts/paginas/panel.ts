// Script de la página «panel», extraído de src/pages/panel/index.astro para compartirlo con el marco de la versión PHP (src/shell/).
  import { espera } from '../api.js';
  import { sondear, errorDeUrl } from '../../components/tele/tele.js';
  import { esperando } from '../../lib/sitio.ts';
  import { aFecha } from '../../lib/tele.ts';

  const raiz = document.querySelector<HTMLElement>('[data-estados]');
  if (raiz) {
    const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = raiz) => r.querySelector<T>(s)!;
    const secc = Object.fromEntries(['inicio', 'espera', 'atiende'].map((e) => [e, $(`[data-estado="${e}"]`)]));
    const base = document.title;
    let actual = raiz.dataset.actual!;
    let posicion = Number($('[data-posicion]').textContent) || 0;
    let candado: WakeLockSentinel | null = null;

    // ?error=… y ?fin=…: el servidor ya los pinta; en la demo (página estática) los pone el navegador
    const textoError = errorDeUrl($('[data-error]'));
    $('[data-renovar]').hidden = !textoError.includes('afiliación');
    const fin = new URLSearchParams(location.search).get('fin');
    raiz.querySelectorAll<HTMLElement>('[data-fin]').forEach((p) => { if (p.dataset.fin === fin) p.hidden = false; });

    // «Entrando…» al pulsar el botón grande (y se restablece si vuelven con «atrás»)
    const btn = $('[data-entrar] .btn'), etiqueta = btn.querySelector('span')!;
    $('[data-entrar]').addEventListener('submit', () => { btn.setAttribute('aria-busy', 'true'); etiqueta.textContent = 'Entrando…'; });
    addEventListener('pageshow', (e) => { if (e.persisted) { btn.removeAttribute('aria-busy'); etiqueta.textContent = 'Entrar a la videollamada'; } });

    // La pantalla del teléfono no se apaga mientras esperas (si se apaga, el móvil congela la pestaña y te sacan de la cola)
    const pedirCandado = async () => { try { if (!candado || candado.released) candado = (await navigator.wakeLock?.request('screen')) ?? null; } catch {} };
    const soltarCandado = () => { candado?.release().catch(() => {}); candado = null; };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && actual === 'espera') pedirCandado(); });

    const ir = (e: string) => {
      const antes = actual;
      actual = e;
      for (const [k, s] of Object.entries(secc)) s.hidden = k !== e;
      document.title = e === 'atiende' ? '¡Te están esperando!' : base;
      if (e === 'espera') pedirCandado(); else soltarCandado();
      if (antes === e) return;
      $(e === 'atiende' ? '[data-video]' : 'h1', secc[e]).focus();
      if (e === 'atiende') navigator.vibrate?.([200, 100, 200]);
    };

    const pintar = (c: any) => {
      if (!c) {
        // la consulta terminó o saliste de la sala: se recarga con el aviso y el historial al día
        if (actual !== 'inicio') location.replace(`${location.pathname}?fin=${actual === 'atiende' ? 'termino' : 'fuera'}`);
        return;
      }
      if (c.estado === 'espera') {
        const antes = Math.max(0, c.posicion - 1);
        $('[data-posicion]').textContent = c.posicion;
        $('[data-linea]').textContent = antes === 0 ? 'Eres el siguiente.' : `Hay ${antes} ${antes === 1 ? 'persona' : 'personas'} antes que tú.`;
        $('[data-reloj]').dataset.creada = c.creada;
        if (posicion && c.posicion !== posicion) $('[data-anuncio]').textContent = `Tu turno cambió: ${antes === 0 ? 'eres el siguiente' : `ahora hay ${antes} ${antes === 1 ? 'persona' : 'personas'} antes que tú`}.`;
        posicion = c.posicion;
        if (actual !== 'espera') ir('espera');
      } else {
        secc.atiende.querySelectorAll('[data-medico]').forEach((n) => (n.textContent = c.medico || 'Un médico'));
        const video = $<HTMLElement>('[data-video]', secc.atiende);
        const sala = String(c.sala ?? '');
        if (video.dataset.sala !== sala) video.dataset.sala = sala;
        if (actual !== 'atiende') ir('atiende');
      }
    };

    // Reloj de la espera (cada segundo) y aviso de «tarda más de lo normal» pasados 10 minutos
    setInterval(() => {
      const t = $('[data-reloj]');
      if (actual !== 'espera' || !t.dataset.creada) return;
      t.textContent = esperando(t.dataset.creada);
      if (Date.now() - aFecha(t.dataset.creada).getTime() > 10 * 6e4) $('[data-largo]').hidden = false;
    }, 1000);

    sondear(
      async () => {
        try { const r = await espera(); if (r) pintar(r.consulta); } finally { raiz.removeAttribute('data-cargando'); }
      },
      (ok) => { $('[data-sin-conexion]').hidden = ok; },
    );
  }
