import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE } from './app.tokens';
import { csrfInterceptor } from './csrf.interceptor';

const API = 'http://localhost:8000/api/v1';

describe('csrfInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  function setCsrfCookie(value: string): void {
    document.cookie = `csrf=${value}`;
  }

  function clearCsrfCookie(): void {
    document.cookie = 'csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  function rejectCsrf(request: ReturnType<HttpTestingController['expectOne']>): void {
    request.flush(
      { error: { code: 'auth.csrf_invalid', message: 'CSRF token is invalid.' } },
      { status: 403, statusText: 'Forbidden' },
    );
  }

  beforeEach(() => {
    clearCsrfCookie();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: API },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearCsrfCookie();
  });

  it('sends the current token with API mutations', () => {
    setCsrfCookie('token-1');

    client.post(`${API}/guilds`, {}).subscribe();

    const request = http.expectOne(`${API}/guilds`);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('token-1');
    request.flush({});
  });

  it('leaves reads alone', () => {
    client.get(`${API}/guilds`).subscribe();

    const request = http.expectOne(`${API}/guilds`);
    expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
    request.flush({});
  });

  it('renews an expired cookie before sending the mutation', () => {
    client.post(`${API}/auth/logout`, {}).subscribe();

    const renew = http.expectOne(`${API}/auth/csrf`);
    expect(renew.request.method).toBe('GET');
    expect(renew.request.withCredentials).toBe(true);
    http.expectNone(`${API}/auth/logout`);
    setCsrfCookie('renewed');
    renew.flush('');

    const request = http.expectOne(`${API}/auth/logout`);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('renewed');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('renews and retries once when the backend rejects the token', () => {
    setCsrfCookie('stale');
    let succeeded = false;

    client.post(`${API}/guilds`, {}).subscribe(() => (succeeded = true));

    rejectCsrf(http.expectOne(`${API}/guilds`));
    setCsrfCookie('fresh');
    http.expectOne(`${API}/auth/csrf`).flush('');
    const retry = http.expectOne(`${API}/guilds`);
    expect(retry.request.headers.get('X-CSRF-Token')).toBe('fresh');
    retry.flush({});

    expect(succeeded).toBe(true);
  });

  it('surfaces the error when the renewed token is rejected too', () => {
    setCsrfCookie('stale');
    let status: number | undefined;

    client.post(`${API}/guilds`, {}).subscribe({ error: (error) => (status = error.status) });

    rejectCsrf(http.expectOne(`${API}/guilds`));
    http.expectOne(`${API}/auth/csrf`).flush('');
    rejectCsrf(http.expectOne(`${API}/guilds`));

    expect(status).toBe(403);
  });

  it('does not retry unrelated 403 responses', () => {
    setCsrfCookie('token-1');
    let status: number | undefined;

    client.post(`${API}/guilds`, {}).subscribe({ error: (error) => (status = error.status) });

    http
      .expectOne(`${API}/guilds`)
      .flush({ error: { code: 'guild.admin_required' } }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });

  it('still sends the mutation when renewal fails, so the real error reaches the caller', () => {
    let status: number | undefined;

    client.post(`${API}/guilds`, {}).subscribe({ error: (error) => (status = error.status) });

    http.expectOne(`${API}/auth/csrf`).flush(null, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(`${API}/guilds`)
      .flush({ error: { code: 'auth.unauthorized' } }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });

  it('does not request a token for the Discord callback', () => {
    client.post(`${API}/auth/discord/callback`, {}).subscribe();

    const request = http.expectOne(`${API}/auth/discord/callback`);
    expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('never sends the token to other origins', () => {
    setCsrfCookie('token-1');

    client.post('https://example.test/collect', {}).subscribe();

    const request = http.expectOne('https://example.test/collect');
    expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
    request.flush({});
  });
});
