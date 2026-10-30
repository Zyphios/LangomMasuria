const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync, mkdirSync, copyFileSync, readFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const directory = mkdtempSync(path.join(tmpdir(), 'lagom-compose-test-'));
const envFile = path.join(directory, 'empty.env');
writeFileSync(envFile, '');
after(() => rmSync(directory, { recursive: true }));

const secrets = {
  POSTGRES_PASSWORD: 'test_database_password',
  JWT_SECRET: 'test_jwt_secret',
  PUBLIC_SITE_URL: 'https://example.test',
  BOOKING_ABUSE_SECRET: 'synthetic-booking-abuse-secret-at-least-32-characters',
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD: 'test_admin_password'
};

function compose(overrides = {}) {
  const env = { ...process.env, ...secrets, ...overrides };
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete env[name];
  }
  return spawnSync('docker', [
    'compose', '--env-file', envFile, '-f', 'docker-compose.vps.yml',
    'config', '--format', 'json'
  ], {
    cwd: path.resolve(__dirname, '..'),
    env,
    encoding: 'utf8'
  });
}

test('VPS only publishes the website on server loopback', () => {
  const result = compose();
  assert.equal(result.status, 0, result.stderr);
  const { services } = JSON.parse(result.stdout);
  assert.deepEqual(services.frontend.ports.map(({ host_ip, published, target }) =>
    ({ host_ip, published, target })
  ), [{ host_ip: '127.0.0.1', published: '8080', target: 80 }]);
  assert.equal(services.db.ports, undefined);
  assert.equal(services.backend.ports, undefined);
  assert.equal(services.frontend.build.args.VITE_API_URL, '');
  assert.equal(services.backend.depends_on.db.condition, 'service_healthy');
  assert.equal(services.backend.environment.PUBLIC_SITE_URL, 'https://example.test');
  assert.equal(services.backend.environment.BOOKING_ABUSE_SECRET, secrets.BOOKING_ABUSE_SECRET);
  assert.equal(String(services.backend.environment.BOOKING_IP_HOURLY_LIMIT), '10');
  for (const service of Object.values(services)) {
    assert.equal(service.restart, 'unless-stopped');
    assert.ok(service.healthcheck);
  }

});

for (const name of Object.keys(secrets)) {
  test(`VPS refuses to start without ${name}`, () => {
    const result = compose({ [name]: '' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(name));
    assert.doesNotMatch(result.stderr, /no such file|cannot find/i);
  });
}

const shell = (process.platform === 'win32' ? [
  path.join(process.env.ProgramFiles, 'Git', 'bin', 'bash.exe'),
  path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe')
] : ['/bin/sh']).find(existsSync);
test('new installation generates a separate abuse secret without overwriting existing credentials', { skip: !shell }, () => {
  const install = path.join(directory, 'new-install');
  const scripts = path.join(install, 'deploy');
  mkdirSync(scripts, { recursive: true });
  copyFileSync(path.join(__dirname, 'init-env.sh'), path.join(scripts, 'init-env.sh'));
  const args = process.platform === 'win32' ? ['-l', 'init-env.sh'] : ['init-env.sh'];
  const result = spawnSync(shell, args, { cwd: scripts, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const contents = readFileSync(path.join(install, '.env.vps'), 'utf8');
  assert.match(contents, /^PUBLIC_SITE_URL=https:\/\/domeknamazurskiej\.pl$/m);
  const secret = contents.match(/^BOOKING_ABUSE_SECRET=([a-f0-9]{64})$/m)?.[1];
  assert.ok(secret, 'must generate a random private abuse secret');
  assert.notEqual(secret, contents.match(/^JWT_SECRET=(.+)$/m)?.[1]);
  const repeated = spawnSync(shell, args, { cwd: scripts, encoding: 'utf8' });
  assert.notEqual(repeated.status, 0);
  assert.equal(readFileSync(path.join(install, '.env.vps'), 'utf8'), contents);
});
