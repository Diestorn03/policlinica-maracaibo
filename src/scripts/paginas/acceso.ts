// Script de la página «acceso», extraído de src/pages/acceso.astro para compartirlo con el marco de la versión PHP (src/shell/).
  // Los mensajes de la URL (?error=…, ?salio=1) también en el navegador; el servidor ya pinta el suyo
  const f = document.querySelector<HTMLFormElement>('[data-acceso]');
  if (f) {
    const q = new URLSearchParams(location.search);
    const cual = q.get('salio') === '1' ? 'salio' : q.get('error');
    const aviso = [...f.querySelectorAll<HTMLElement>('[data-aviso]')].find((n) => n.dataset.aviso === cual);   // sin selector: ?error= puede traer comillas
    if (aviso) aviso.hidden = false;
    f.querySelector<HTMLElement>('[data-aviso]:not([hidden])')?.focus();

    // «Mostrar» la contraseña
    const clave = f.querySelector<HTMLInputElement>('#clave')!, ver = f.querySelector<HTMLElement>('[data-ver]')!;
    ver.closest('button')!.addEventListener('click', () => {
      const visible = clave.type === 'text';
      clave.type = visible ? 'password' : 'text';
      ver.textContent = visible ? 'Mostrar' : 'Ocultar';
    });

    // «Entrando…» al enviar (y se restablece si vuelven con «atrás»)
    const entrar = f.querySelector<HTMLElement>('[data-entrar]')!;
    f.addEventListener('submit', () => { entrar.setAttribute('aria-busy', 'true'); entrar.textContent = 'Entrando…'; });
    addEventListener('pageshow', (e) => { if (e.persisted) { entrar.removeAttribute('aria-busy'); entrar.textContent = 'Entrar'; } });
  }
