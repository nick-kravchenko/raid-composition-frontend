// Starts the built SSR server against a stub API and checks what a deployment depends on: rendering,
// host validation, static files, and that SSR calls the configured API with the visitor's cookie.
// Takes a few seconds. Run after `npm run build`.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const ALLOWED_HOST = 'raid.smoke.test';
const SERVER_ENTRY = 'dist/raid-composition-frontend/server/server.mjs';

const REFRESHED_COOKIES = ['session=refreshed; Path=/; HttpOnly', 'extra=1; Path=/'];
const VALID_SESSION = JSON.stringify({
  user: {
    id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    discord: { id: '1', username: 'smoke', global_name: 'Smoke', avatar_url: '/favicon.ico' },
  },
  session: { id: 'session-1' },
});

const apiRequests = [];
const api = createServer((req, res) => {
  apiRequests.push({
    method: req.method,
    url: req.url,
    cookie: req.headers.cookie,
    userAgent: req.headers['user-agent'],
    forwardedFor: req.headers['x-forwarded-for'],
  });
  req.resume();
  if (req.url === '/api/v1/auth/session' && req.headers.cookie === 'session=refresh-me') {
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': REFRESHED_COOKIES });
    res.end(VALID_SESSION);
    return;
  }
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
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
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
  [
    'forwards the visitor user agent and first proxy hop to the API',
    async () => {
      await get('/', { 'user-agent': 'smoke-browser', 'x-forwarded-for': '192.0.2.1, 10.0.0.1' });
      const last = apiRequests.at(-1);
      return last.userAgent === 'smoke-browser' && last.forwardedFor === '192.0.2.1';
    },
  ],
  [
    'falls back to the peer address without a proxy',
    async () => {
      await get('/');
      return apiRequests.at(-1).forwardedFor === '127.0.0.1';
    },
  ],
  [
    'passes cookies refreshed during SSR back to the browser',
    async () => {
      const { status, headers } = await get('/', { cookie: 'session=refresh-me' });
      return (
        status === 200 &&
        JSON.stringify(headers['set-cookie']) === JSON.stringify(REFRESHED_COOKIES)
      );
    },
  ],
  [
    'leaves the Discord callback to the browser',
    async () => {
      const { status, body } = await get('/auth/discord/callback?code=smoke&state=smoke');
      const postedByServer = apiRequests.some((r) => r.method === 'POST');
      return status === 200 && body.includes('Signing in with Discord') && !postedByServer;
    },
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
