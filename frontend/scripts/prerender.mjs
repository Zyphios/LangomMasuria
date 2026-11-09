// Po `vite build` i `vite build --ssr`: zapisuje gotowy HTML dla każdej publicznej podstrony
// (dist/home.html, dist/house.html, ...), sitemap.xml oraz zostawia dist/index.html jako pustą powłokę SPA.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { render, seoRoutes, seoFor, headHtml, SITE_URL } = await import(
  pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href
);

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const titleTag = /<title>[^<]*<\/title>/;
const rootDiv = /<div id=['"]root['"]><\/div>/;
if (!titleTag.test(template) || !rootDiv.test(template)) {
  throw new Error('index.html: nie znaleziono <title> lub #root - prerender przerwany');
}

for (const route of seoRoutes) {
  const body = render(route.path);
  if (body.length < 500) throw new Error(`Pusty render dla ${route.path}`);
  const head = headHtml(seoFor(route.path, 'pl'), route.path === '/');
  const html = template
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace(titleTag, () => head)
    .replace(rootDiv, () => `<div id="root">${body}</div>`);
  const file = route.path === '/' ? 'home.html' : `${route.path.slice(1)}.html`;
  await writeFile(path.join(dist, file), html);
  console.log(`prerender ${route.path} -> ${file} (${(html.length / 1024).toFixed(0)} kB)`);
}

const today = new Date().toISOString().slice(0, 10);
const urls = seoRoutes
  .map((r) => `  <url><loc>${SITE_URL}${r.path}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n');
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
console.log('sitemap.xml gotowy');
