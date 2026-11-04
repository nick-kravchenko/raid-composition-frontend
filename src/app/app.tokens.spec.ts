import { browserApiBase } from './app.tokens';

describe('browserApiBase', () => {
  it('uses the backend port during local development', () => {
    const local = { hostname: 'localhost', origin: 'http://localhost:4200' };
    const loopback = { hostname: '127.0.0.1', origin: 'http://127.0.0.1:4000' };

    expect(browserApiBase(local)).toBe('http://localhost:8000/api/v1');
    expect(browserApiBase(loopback)).toBe('http://localhost:8000/api/v1');
  });

  it('uses the page origin everywhere else', () => {
    const deployed = { hostname: 'raid.mini.local', origin: 'https://raid.mini.local' };

    expect(browserApiBase(deployed)).toBe('https://raid.mini.local/api/v1');
  });
});
