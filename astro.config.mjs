import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { loadEnv } from 'vite';

const { CF_STATE } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// Cloudflare Workers: páginas estáticas prerenderizadas + directorio y admin bajo demanda (prerender = false) contra D1.
// Imágenes optimizadas al compilar (sharp); en tiempo de ejecución pasan tal cual (sin Cloudflare Images de pago).
export default defineConfig({
  site: process.env.SITE_URL || 'https://www.policlinicamaracaibo.com',
  trailingSlash: 'ignore',
  // CF_STATE (en .env): carpeta del D1 local si la ruta del proyecto es muy larga para Windows (usar la misma en wrangler --persist-to)
  adapter: cloudflare({ imageService: 'compile', persistState: CF_STATE ? { path: CF_STATE } : undefined }),
  devToolbar: { enabled: false },
});
