// App instalable (pedido de la clínica: la opción «Instalar» de Chrome). El manifiesto está en public/manifest.webmanifest y los
// layouts lo enlazan; aquí solo se registra public/sw.js, que algunas versiones de Chrome todavía piden para ofrecer «Instalar».
const BASE = (document.documentElement.dataset.base || '/').replace(/\/$/, '');
if ('serviceWorker' in navigator) addEventListener('load', () => { navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {}); });
