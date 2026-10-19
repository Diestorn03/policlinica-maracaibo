// Extrae el directorio médico del WordPress actual (plugin Business Directory) → src/data/medicos.json
// y baja las fotos (versión 480×480) a public/medicos/. Se corre una vez: node tools/scrape.mjs
// Une las fichas duplicadas (mismo nombre y teléfono en dos categorías) en un solo médico con varias especialidades.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const BASE = 'https://www.policlinicamaracaibo.com';
const html = async (url) => (await fetch(url)).text();
const clean = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/\s+/g, ' ').trim();
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(dra?)\b\.?/g, '').replace(/[^a-z]/g, '');

const dir = await html(`${BASE}/business-directory/`);
const cats = [...dir.matchAll(/href="([^"]*wpbdp_category\/([^/"]+)\/)"[^>]*>([^<]+)</g)].map(([, url, slug, name]) => ({ url, slug, name: clean(name) }));
const uniqueCats = [...new Map(cats.map((c) => [c.slug, c])).values()];

const medicos = new Map();
for (const cat of uniqueCats) {
  let url = cat.url;
  for (let page = 0; url && page < 10; page++) {
    const h = await html(url);
    for (const block of h.split('<div id="wpbdp-listing-').slice(1)) {
      const title = block.match(/class="listing-title">\s*<h3><a href="([^"]+)"[^>]*>([^<]+)</);
      if (!title) continue;
      const nombre = clean(title[2]);
      const telefono = clean(block.match(/wpbdp-field-telefono[\s\S]*?<div class="value">([\s\S]*?)<\/div>/)?.[1]);
      const consultorio = clean(block.match(/address-label">Consultorio<\/span>\s*<div>([\s\S]*?)<\/div>/)?.[1]);
      const foto = block.match(/class="listing-thumbnail">[\s\S]*?<img[^>]+src="([^"]+)"/)?.[1] ?? '';
      const key = norm(nombre) + '|' + telefono.replace(/\D/g, '');
      const m = medicos.get(key) ?? { slug: title[1].split('/').filter(Boolean).pop().replace(/-\d+$/, ''), nombre, telefono, consultorio, foto, especialidades: [] };
      if (!m.especialidades.includes(cat.slug)) m.especialidades.push(cat.slug);
      medicos.set(key, m);
    }
    url = h.match(/class="next[^"]*"[^>]*>\s*<a href="([^"]+)"/)?.[1] ?? h.match(/<a[^>]+class="next[^"]*"[^>]+href="([^"]+)"/)?.[1];
  }
}

mkdirSync('public/medicos', { recursive: true });
for (const m of medicos.values()) {
  if (!m.foto) continue;
  const file = `public/medicos/${m.slug}.jpg`;
  if (!existsSync(file)) {
    const small = m.foto.replace(/(\.\w+)$/, '-480x480$1');
    let res = await fetch(small);
    if (!res.ok) res = await fetch(m.foto);
    if (res.ok) writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  m.foto = existsSync(file) ? `/medicos/${m.slug}.jpg` : '';
}

const out = { especialidades: uniqueCats.map(({ slug, name }) => ({ slug, nombre: name })), medicos: [...medicos.values()] };
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/medicos.json', JSON.stringify(out, null, 2) + '\n');
console.log(`${out.especialidades.length} especialidades, ${out.medicos.length} médicos, ${out.medicos.filter((m) => m.foto).length} con foto`);
