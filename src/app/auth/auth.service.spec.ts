import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('marks the user unauthenticated when the session endpoint returns 401', async () => {
    const result = service.loadSession();

    const request = http.expectOne('http://localhost:8000/api/v1/auth/session');
    expect(request.request.withCredentials).toBe(true);
    request.flush(
      { code: 'auth.unauthorized', message: 'Authentication is required.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await result;

    expect(service.state()).toEqual({ status: 'unauthenticated' });
  });

  it('loads the current authenticated session', async () => {
    const result = service.loadSession();

    const request = http.expectOne('http://localhost:8000/api/v1/auth/session');
    request.flush({
      user: {
        id: 'user-1',
        created_at: '2026-05-02T10:00:00Z',
        discord: {
          id: 'discord-1',
          username: 'raider',
          global_name: 'Raid Leader',
          avatar_url: 'https://cdn.example/avatar.png',
        },
      },
      session: {
        id: 'session-1',
        created_at: '2026-05-02T10:00:00Z',
        last_seen_at: '2026-05-02T10:01:00Z',
        expires_at: '2026-06-01T10:00:00Z',
        user_agent: 'vitest',
        login_location: { country: null, region: null, city: null },
        current_location: { country: null, region: null, city: null },
        is_current: true,
      },
    });

    await result;

    expect(service.state().status).toBe('authenticated');
    expect(service.currentUser()?.discord.global_name).toBe('Raid Leader');
  });

  it('requests the Discord authorization URL with credentials', async () => {
    const result = service.getDiscordAuthorizationUrl();

    const request = http.expectOne('http://localhost:8000/api/v1/auth/discord/url');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ url: 'https://discord.com/oauth2/authorize?state=abc' });

    await expect(result).resolves.toBe('https://discord.com/oauth2/authorize?state=abc');
  });

  it('posts the Discord callback then refreshes the session', async () => {
    const result = service.completeDiscordCallback('code-1', 'state-1');

    const callback = http.expectOne('http://localhost:8000/api/v1/auth/discord/callback');
    expect(callback.request.method).toBe('POST');
    expect(callback.request.withCredentials).toBe(true);
    expect(callback.request.body).toEqual({ code: 'code-1', state: 'state-1' });
    callback.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();

    const session = http.expectOne('http://localhost:8000/api/v1/auth/session');
    session.flush(
      { code: 'auth.unauthorized', message: 'Authentication is required.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await result;

    expect(service.state()).toEqual({ status: 'unauthenticated' });
  });

  it('posts the logout request with the CSRF header and clears auth state', async () => {
    document.cookie = 'csrf=csrf-token';
    const logout = service.logout();

    const request = http.expectOne('http://localhost:8000/api/v1/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await logout;

    expect(service.state()).toEqual({ status: 'unauthenticated' });
  });

  it('marks unexpected session errors as error state', async () => {
    const result = service.loadSession();

    const request = http.expectOne('http://localhost:8000/api/v1/auth/session');
    request.flush(
      { code: 'internal', message: 'Nope' },
      { status: 500, statusText: 'Server Error' },
    );

    await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.state().status).toBe('error');
  });
});
