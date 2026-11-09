// Generuje wersje .webp obok oryginałów w public/. Nginx podaje je automatycznie
// przeglądarkom z obsługą WEBP, pod nazwami oryginałów (zob. nginx.vps.conf).
// Uruchomienie: npm run optimize-images (po dodaniu lub podmianie zdjęć w public/)
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const SKIP = new Set(['favicon.png', 'logo-mazurska.jpg']);
const WIDE = new Set(['panorama-hero.jpg']);

const files = (await readdir(publicDir)).filter((f) => /\.(jpe?g|png)$/i.test(f) && !SKIP.has(f));
const converted = [];
let before = 0;
let after = 0;

for (const file of files) {
  const src = path.join(publicDir, file);
  const out = path.join(publicDir, file.replace(/\.(jpe?g|png)$/i, '.webp'));
  const maxWidth = WIDE.has(file) ? 3200 : 2000;
  await sharp(src).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
  const [a, b] = [(await stat(src)).size, (await stat(out)).size];
  before += a;
  after += b;
  converted.push(file);
}

console.log(`${converted.length} plików: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
