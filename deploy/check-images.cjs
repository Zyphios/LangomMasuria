const { createHash } = require('node:crypto');
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

async function main() {
  if (!process.argv[2]) throw new Error('Usage: node deploy/check-images.cjs https://website.example');
  const base = new URL(process.argv[2]);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Expected a public HTTP(S) website URL without credentials');
  }
  const directory = path.resolve(__dirname, '..', 'frontend', 'public');
  const files = readdirSync(directory).filter((name) => /\.(jpe?g|png|gif|webp|svg|ico)$/i.test(name));
  if (!files.length) throw new Error('No public images found');
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  let failures = 0;
  for (const name of files) {
    const response = await fetch(new URL(`/${encodeURIComponent(name)}`, base), {
      signal: AbortSignal.timeout(15000)
    });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/')) {
      console.error(`FAIL ${name}: HTTP ${response.status}, ${type}`);
      failures += 1;
      continue;
    }
    if (hash(Buffer.from(await response.arrayBuffer())) !== hash(readFileSync(path.join(directory, name)))) {
      console.error(`FAIL ${name}: published image does not match the source`);
      failures += 1;
    }
  }
  console.log(`Images checked: ${files.length}; passed: ${files.length - failures}; failed: ${failures}`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
