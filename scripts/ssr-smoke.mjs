// Starts the built SSR server against a stub API and checks what a deployment depends on: rendering,
// host validation, static files, and that SSR calls the configured API with the visitor's cookie.
// Takes a few seconds. Run after `npm run build`.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const ALLOWED_HOST = 'raid.smoke.test';
const SERVER_ENTRY = 'dist/raid-composition-frontend/server/server.mjs';

const apiRequests = [];
const api = createServer((req, res) => {
  apiRequests.push({ url: req.url, cookie: req.headers.cookie });
  res.writeHead(401, { 'content-type': 'application/json' });
  res.end('{"error":"unauthorized"}');
});
await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
const apiPort = api.address().port;

const portServer = createServer();
await new Promise((resolve) => portServer.listen(0, '127.0.0.1', resolve));
const port = portServer.address().port;
await new Promise((resolve) => portServer.close(resolve));

let serverOutput = '';
const server = spawn(process.execPath, [SERVER_ENTRY], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    API_BASE_URL: `http://127.0.0.1:${apiPort}/api/v1`,
    PUBLIC_ORIGIN: `https://${ALLOWED_HOST}`,
    NG_ALLOWED_HOSTS: ALLOWED_HOST,
    NG_TRUST_PROXY_HEADERS: 'x-forwarded-host,x-forwarded-proto,x-forwarded-for',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => (serverOutput += chunk));
server.stderr.on('data', (chunk) => (serverOutput += chunk));

// fetch() forbids overriding Host, so talk HTTP directly.
async function get(path, headers = {}) {
  const { request } = await import('node:http');
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, headers: { host: ALLOWED_HOST, ...headers } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error(`timeout on ${path}`)));
    req.end();
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      return await get('/favicon.ico');
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`server did not start:\n${serverOutput}`);
}

const checks = [
  ['serves static files', async () => (await waitForServer()).status === 200],
  [
    'renders the home page on the server',
    async () => {
      const { status, body } = await get('/', { cookie: 'session=smoke' });
      return status === 200 && body.includes('<rc-root') && body.includes('ng-server-context="ssr"');
    },
  ],
  ['renders a lazy route', async () => (await get('/guilds')).status === 200],
  [
    'accepts the headers the edge proxy sends',
    async () => {
      const { status } = await get('/', {
        'x-forwarded-host': ALLOWED_HOST,
        'x-forwarded-proto': 'https',
        'x-forwarded-for': '192.0.2.1',
      });
      return status === 200;
    },
  ],
  ['rejects unknown hosts', async () => (await get('/', { host: 'evil.example' })).status === 400],
  [
    'calls the configured API and forwards the cookie',
    async () =>
      apiRequests.some((r) => r.url?.startsWith('/api/v1/') && r.cookie === 'session=smoke'),
  ],
];

let failed = false;
try {
  for (const [name, check] of checks) {
    const passed = await check().catch((error) => {
      console.error(error);
      return false;
    });
    console.log(`${passed ? 'ok  ' : 'FAIL'} ${name}`);
    failed ||= !passed;
  }
} finally {
  server.kill();
  api.close();
}

if (failed) {
  console.error(`\nserver output:\n${serverOutput}`);
  process.exit(1);
}
