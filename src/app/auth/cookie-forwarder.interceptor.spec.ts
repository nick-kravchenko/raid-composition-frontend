import { HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID, Provider, REQUEST, REQUEST_CONTEXT, RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { API_BASE } from '../app.tokens';
import { cookieForwarderInterceptor } from './cookie-forwarder.interceptor';

const API = 'http://localhost:8000/api/v1';

describe('cookieForwarderInterceptor', () => {
  const baseReq = new HttpRequest('GET', `${API}/auth/session`);

  function setup(platform: 'server' | 'browser', ...providers: Provider[]): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: API_BASE, useValue: API },
        ...providers,
      ],
    });
  }

  function visitorRequest(headers: Record<string, string> = {}): Provider {
    return {
      provide: REQUEST,
      useValue: new Request('http://localhost:4200/guilds', { headers }),
    };
  }

  function intercept(
    req: HttpRequest<unknown> = baseReq,
    response = new HttpResponse({ status: 200 }),
  ): HttpRequest<unknown> {
    let captured!: HttpRequest<unknown>;
    TestBed.runInInjectionContext(() => {
      cookieForwarderInterceptor(req, (forwarded) => {
        captured = forwarded;
        return of(response);
      }).subscribe();
    });
    return captured;
  }

  it('forwards the visitor cookie, user agent and client IP to the API', () => {
    setup(
      'server',
      visitorRequest({ cookie: 'session=abc123; csrf=tok', 'user-agent': 'Firefox' }),
      { provide: REQUEST_CONTEXT, useValue: { clientIp: '192.0.2.1' } },
    );

    const forwarded = intercept();

    expect(forwarded.headers.get('Cookie')).toBe('session=abc123; csrf=tok');
    expect(forwarded.headers.get('User-Agent')).toBe('Firefox');
    expect(forwarded.headers.get('X-Forwarded-For')).toBe('192.0.2.1');
  });

  it('passes cookies set by the API back to the browser', () => {
    const responseInit: ResponseInit = {
      status: 200,
      headers: new Headers({ 'Content-Type': 'text/html' }),
    };
    setup('server', visitorRequest({ cookie: 'session=abc123' }), {
      provide: RESPONSE_INIT,
      useValue: responseInit,
    });

    intercept(
      baseReq,
      new HttpResponse({
        status: 200,
        headers: new HttpHeaders({ 'set-cookie': ['session=new; HttpOnly', 'other=1'] }),
      }),
    );

    const headers = responseInit.headers as Headers;
    expect(headers.getSetCookie()).toEqual(['session=new; HttpOnly', 'other=1']);
    expect(headers.get('Content-Type')).toBe('text/html');
  });

  it('never sends visitor data to other origins', () => {
    setup('server', visitorRequest({ cookie: 'session=abc123', 'user-agent': 'Firefox' }));
    const external = new HttpRequest('GET', 'https://example.test/data');

    expect(intercept(external)).toBe(external);
  });

  it('does nothing in the browser', () => {
    setup('browser', visitorRequest({ cookie: 'session=abc123' }));

    expect(intercept()).toBe(baseReq);
  });

  it('passes the request through without a server request', () => {
    setup('server', { provide: REQUEST, useValue: null });

    expect(intercept()).toBe(baseReq);
  });

  it('passes the request through when the visitor sent nothing to forward', () => {
    setup('server', visitorRequest());

    expect(intercept()).toBe(baseReq);
  });
});
