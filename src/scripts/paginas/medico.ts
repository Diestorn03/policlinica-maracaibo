// Script de la página «medico», extraído de src/pages/medico/index.astro para compartirlo con el marco de la versión PHP (src/shell/).
  import { cola } from '../api.js';
  import { sondear, errorDeUrl } from '../../components/tele/tele.js';
  import { esperando } from '../../lib/sitio.ts';
  import { aFecha } from '../../lib/tele.ts';

  const raiz = document.querySelector<HTMLElement>('[data-cola]');
  if (raiz) {
    const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = raiz) => r.querySelector<T>(s)!;
    const guardado = (k: string, v?: string) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
    const base = document.title;
    const cuerpo = $('[data-filas]'), lista = $('[data-curso]');
    const plFila = $<HTMLTemplateElement>('#pl-fila'), plCurso = $<HTMLTemplateElement>('#pl-curso');
    const filas = new Map<string, HTMLElement>(), cards = new Map<string, HTMLElement>();
    const atendiendo = new URLSearchParams(location.search).get('atendiendo') ?? '';
    let primera = true, enfocado = false, audio: AudioContext | null = null, sonido = guardado('pm-aviso') === '1';
    cuerpo.querySelectorAll<HTMLElement>('tr[data-id]').forEach((tr) => filas.set(tr.dataset.id!, tr));
    lista.querySelectorAll<HTMLElement>('li[data-id]').forEach((li) => cards.set(li.dataset.id!, li));
    const poner = (el: ParentNode, campo: string, v: string) => { const n = el.querySelector(`[data-campo="${campo}"]`); if (n) n.textContent = v; };

    errorDeUrl($('[data-error]'));

    // Sonido de aviso (apagado por defecto): un tono corto cuando llega alguien, una vez que el usuario tocó la página
    const btnSonido = $('[data-sonido]');
    const pintarSonido = () => { btnSonido.setAttribute('aria-pressed', String(sonido)); $('[data-sonido-txt]').textContent = `Sonido de aviso: ${sonido ? 'encendido' : 'apagado'}`; };
    const abrirAudio = () => { if (sonido && !audio) audio = new AudioContext(); };
    const tono = () => {
      if (!sonido || !audio) return;
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.frequency.value = 880; g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .25);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + .25);
    };
    pintarSonido();
    addEventListener('pointerdown', abrirAudio, { once: true });
    addEventListener('keydown', abrirAudio, { once: true });
    btnSonido.addEventListener('click', () => { sonido = !sonido; guardado('pm-aviso', sonido ? '1' : '0'); pintarSonido(); abrirAudio(); audio?.resume(); tono(); });

    // El reloj de cada fila (cada segundo) y su aviso de espera larga
    const reloj = () => {
      const ahora = new Date();
      for (const tr of Array.from(cuerpo.children) as HTMLElement[]) {
        const seg = (ahora.getTime() - aFecha(tr.dataset.creada!).getTime()) / 1000;
        poner(tr, 'reloj', esperando(tr.dataset.creada!, ahora));
        poner(tr, 'largo', seg >= 1200 ? 'Más de 20 min' : seg >= 600 ? 'Más de 10 min' : '');
      }
    };
    setInterval(reloj, 1000);

    const crear = (pl: HTMLTemplateElement, c: any) => {
      const el = pl.content.firstElementChild!.cloneNode(true) as HTMLElement;
      el.dataset.id = c.id;
      poner(el, 'paciente', c.paciente);
      return el;
    };
    // Pone `el` en la posición `i` de `padre` sin mover los demás (conserva foco y selección)
    const colocar = (padre: HTMLElement, el: HTMLElement, i: number) => { if (padre.children[i] !== el) padre.insertBefore(el, padre.children[i] ?? null); };

    function reconciliar(datos: { espera: any[]; enCurso: any[] }) {
      // --- cola
      const llegaron: string[] = [];
      const ids = new Set(datos.espera.map((c) => String(c.id)));
      for (const [id, tr] of filas) if (!ids.has(id)) { tr.remove(); filas.delete(id); }
      datos.espera.forEach((c, i) => {
        let tr = filas.get(String(c.id));
        if (!tr) {
          tr = crear(plFila, c);
          tr.dataset.creada = c.creada;   // solo al verla por primera vez: así el reloj no se reinicia en cada sondeo
          poner(tr, 'edad', c.edad == null ? 'Sin registrar' : `${c.edad} años`);
          poner(tr, 'motivo', c.motivo || 'Sin motivo indicado');
          const b = $<HTMLButtonElement>('button', tr);
          b.value = c.id; b.setAttribute('aria-label', `Atender a ${c.paciente}`);
          if (!primera) llegaron.push(c.paciente);
          filas.set(String(c.id), tr);
        }
        colocar(cuerpo, tr, i);
        poner(tr, 'orden', String(i + 1));
        poner(tr, 'siguiente', i === 0 ? 'Siguiente' : '');
      });
      reloj();
      const n = datos.espera.length;
      $('[data-tabla]').hidden = n === 0;
      $('[data-vacio]').hidden = n > 0;
      $('[data-contador]').textContent = n === 0 ? 'Nadie en espera' : `${n} ${n === 1 ? 'paciente' : 'pacientes'} en espera`;

      // --- en curso
      const idsCurso = new Set(datos.enCurso.map((c) => String(c.id)));
      for (const [id, li] of cards) if (!idsCurso.has(id)) { li.remove(); cards.delete(id); }
      datos.enCurso.forEach((c, i) => {
        let li = cards.get(String(c.id));
        if (!li) {
          li = crear(plCurso, c);
          poner(li, 'edad', c.edad == null ? 'Edad sin registrar' : `${c.edad} años`);
          poner(li, 'motivo', c.motivo || 'sin motivo indicado');
          $('[name="consulta"]', li).setAttribute('value', c.id);
          $('[data-enviar-diagnostico]', li).setAttribute('aria-label', `Guardar diagnóstico y finalizar consulta con ${c.paciente}`);
          const video = li.querySelector<HTMLElement>('[data-video]');
          const sala = String(c.sala ?? '');
          if (video && video.dataset.sala !== sala) video.dataset.sala = sala;
          cards.set(String(c.id), li);
        }
        colocar(lista, li, i);
      });
      $('[data-curso-sec]').hidden = datos.enCurso.length === 0;

      // --- ?atendiendo=<id>: resalta esa consulta, avisa y lleva el foco a «Abrir videollamada» (una sola vez)
      const actual = cards.get(atendiendo);
      cards.forEach((li) => (li === actual ? li.setAttribute('aria-current', 'true') : li.removeAttribute('aria-current')));
      $('[data-tomado]').hidden = !actual;
      if (actual && !enfocado) { enfocado = true; $<HTMLElement>('[data-video]', actual).focus(); }

      // --- llegadas nuevas: aviso para lectores de pantalla, título de la pestaña y tono
      if (llegaron.length) { $('[data-anuncio]').textContent = `Llegó un paciente: ${llegaron.join(', ')}`; tono(); }
      document.title = n ? `(${n}) Sala de espera` : base;
      $('[data-actualizado]').textContent = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date());
      primera = false;
    }

    sondear(
      async () => { const d = await cola(); if (d) reconciliar(d); },
      (ok) => { $('[data-sin-conexion]').hidden = ok; },
    );
  }
