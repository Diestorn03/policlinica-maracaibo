// Script común de las pantallas del admin (filtro de tablas, pestaña activa centrada, aviso desde la URL). Lo comparten AdminShell y el marco de PHP.
  import '../../components/admin/filtrar.ts';
  // En el teléfono las pestañas se desplazan: la activa se centra para que se vea cuál es y que hay más a los lados
  document.querySelector('.adm-tabs [aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  // En la demo la página es estática: el aviso sale de la URL (en servidor el HTML ya lo trae)
  const caja = document.getElementById('aviso');
  if (caja && !caja.firstElementChild) {
    const p = new URLSearchParams(location.search);
    const [clase, texto] = p.get('error') ? ['alert--error', p.get('error')!] : p.get('ok') ? ['alert--ok', p.get('ok')!] : ['', ''];
    if (clase) {
      const el = document.createElement('p');
      el.className = `alert ${clase}`;
      el.textContent = texto.slice(0, 240);
      caja.append(el);
    }
  }
