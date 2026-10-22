// Monta la videollamada en cada [data-video] de la página (también en las tarjetas que llegan por sondeo). Lo comparten el componente de Astro y el marco de PHP.
  import { desmontarVideollamada, montarVideollamada } from './llamada.ts';

  const iniciar = (video: HTMLElement) => montarVideollamada(video, video.dataset.sala ?? '', video.dataset.rol === 'medico' ? 'medico' : 'cliente');
  const recorrer = (raiz: Node) => {
    if (!(raiz instanceof Element)) return; // los nodos de texto que añade el propio script de la llamada no tienen hijos que buscar
    if (raiz.matches('[data-video]')) iniciar(raiz as HTMLElement);
    raiz.querySelectorAll<HTMLElement>('[data-video]').forEach(iniciar);
  };
  recorrer(document.documentElement);
  const observador = new MutationObserver((cambios) => {
    for (const cambio of cambios) {
      if (cambio.type === 'attributes' && cambio.target instanceof HTMLElement && cambio.oldValue !== cambio.target.dataset.sala) {
        desmontarVideollamada(cambio.target);
        iniciar(cambio.target);
      }
      cambio.addedNodes.forEach(recorrer);
      cambio.removedNodes.forEach((n) => { if (n instanceof HTMLElement) n.querySelectorAll<HTMLElement>('[data-video]').forEach(desmontarVideollamada); });
    }
  });
  observador.observe(document.body, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['data-sala'] });
  addEventListener('pagehide', () => observador.disconnect(), { once: true });
