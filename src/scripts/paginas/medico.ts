// Script de la página «medico», extraído de src/pages/medico/index.astro para compartirlo con el marco de la versión PHP (src/shell/).
  import { cola } from '../api.js';
  import { sondear, errorDeUrl } from '../../components/tele/tele.js';
  import { alarmaDeLlegadas, type Llegada } from '../../components/tele/alarma.ts';
  import { descargasDemo, pintarDocumentos } from '../../components/tele/documentos.ts';
  import { esperando } from '../../lib/sitio.ts';
  import { aFecha } from '../../lib/tele.ts';

  const raiz = document.querySelector<HTMLElement>('[data-cola]');
  if (raiz) {
    const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = raiz) => r.querySelector<T>(s)!;
    const base = document.title;
    const cuerpo = $('[data-filas]'), lista = $('[data-curso]');
    const plFila = $<HTMLTemplateElement>('#pl-fila'), plCurso = $<HTMLTemplateElement>('#pl-curso');
    const filas = new Map<string, HTMLElement>(), cards = new Map<string, HTMLElement>();
    const atendiendo = new URLSearchParams(location.search).get('atendiendo') ?? '';
    let primera = true, enfocado = false;
    cuerpo.querySelectorAll<HTMLElement>('tr[data-id]').forEach((tr) => filas.set(tr.dataset.id!, tr));
    lista.querySelectorAll<HTMLElement>('li[data-id]').forEach((li) => cards.set(li.dataset.id!, li));
    const poner = (el: ParentNode, campo: string, v: string) => { const n = el.querySelector(`[data-campo="${campo}"]`); if (n) n.textContent = v; };

    errorDeUrl($('[data-error]'));

    // Alarma de 2 s, notificación que se queda y pantalla encendida cuando llega alguien (ver alarma.ts)
    const alarma = alarmaDeLlegadas(raiz);
    descargasDemo(lista);

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
      const llegaron: Llegada[] = [];
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
          if (!primera) llegaron.push({ id: String(c.id), nombre: c.paciente });
          filas.set(String(c.id), tr);
        }
        colocar(cuerpo, tr, i);
        poner(tr, 'orden', String(i + 1));
        poner(tr, 'siguiente', i === 0 ? 'Siguiente' : '');
      });
      reloj();
      alarma.quedan(ids);
      const n = datos.espera.length;
      $('[data-tabla]').hidden = n === 0;
      $('[data-vacio]').hidden = n > 0;
      $('[data-contador]').textContent = n === 0 ? 'Nadie en espera' : `${n} ${n === 1 ? 'paciente' : 'pacientes'} en espera`;

      // --- en curso
      const docsNuevos: string[] = [];
      const idsCurso = new Set(datos.enCurso.map((c) => String(c.id)));
      for (const [id, li] of cards) if (!idsCurso.has(id)) { li.remove(); cards.delete(id); }
      datos.enCurso.forEach((c, i) => {
        let li = cards.get(String(c.id));
        const recien = !li;
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
        // documentos que envía el paciente: los nuevos se resaltan y se anuncian (no los que ya traía al abrir la tarjeta)
        const caja = li.querySelector<HTMLElement>('[data-docs]');
        const nuevos = caja ? pintarDocumentos(caja, c.archivos ?? [], 'medico') : [];
        if (!recien && nuevos.length) {
          docsNuevos.push(`${c.paciente} envió ${nuevos.length === 1 ? 'un documento' : `${nuevos.length} documentos`}`);
          for (const n of nuevos) n.animate([{ backgroundColor: 'rgba(255, 255, 255, .28)' }, { backgroundColor: 'transparent' }], { duration: 2500, easing: 'ease-out' });
        }
      });
      $('[data-curso-sec]').hidden = datos.enCurso.length === 0;

      // --- ?atendiendo=<id>: resalta esa consulta, avisa y lleva el foco a «Abrir videollamada» (una sola vez)
      const actual = cards.get(atendiendo);
      cards.forEach((li) => (li === actual ? li.setAttribute('aria-current', 'true') : li.removeAttribute('aria-current')));
      $('[data-tomado]').hidden = !actual;
      if (actual && !enfocado) { enfocado = true; $<HTMLElement>('[data-video]', actual).focus(); }

      // --- llegadas nuevas: aviso para lectores de pantalla, título de la pestaña y alarma
      if (llegaron.length) { $('[data-anuncio]').textContent = `Llegó un paciente: ${llegaron.map((p) => p.nombre).join(', ')}`; alarma.llegaron(llegaron); }
      else if (docsNuevos.length) $('[data-anuncio]').textContent = `${docsNuevos.join('. ')}.`;
      document.title = n ? `(${n}) Sala de espera` : base;
      $('[data-actualizado]').textContent = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date());
      primera = false;
    }

    sondear(
      async () => { const d = await cola(); if (d) reconciliar(d); },
      (ok) => { $('[data-sin-conexion]').hidden = ok; },
    );
  }
